const express = require("express");
const async = require("async");
const geodist = require("geodist");
const cron = require("node-cron");
const Jobs = require("../utilities/Jobs");
const Configuration = require("../Configuration");
const LoginFilter = require("../filters/LoginFilter");
const glass = require("glass-validator");
const rules = glass.rules();

module.exports = (state) => {
    const middleware = require("../middleware")(state);
    const router = express.Router();
    const Login = LoginFilter(state);
    const jobs = Jobs(state);

    router.param("orderId", middleware.prepareOrder);

    router.post("/", Login.User, (request, response) => {
        const credential = response.locals.credential;
        const input = request.body;
        state.validator.validate.orderCreationInput(input, (inputError) => {
            if ( inputError ) return response.status(400).end(inputError.message);

            const order = state.factory.createOrder(input);
            state.database.collection("Orders").insert(order, (orderError) => {
                if ( orderError ) return response.status(500).end("Error storing order: " + orderError.message);

                state.database.collection("Users").update({ _id: credential.userId }, { $push: { orders: order._id } }, (userError) => {
                    if ( userError ) return response.status(500).end("Error updating user: " + userError.message);

                    state.database.collection("Users").find().toArray((userError, users) => {
                        if ( userError ) return response.status(500).end("Error notifying users: " + userError.message);
                        
                        const usersToNotify = users
                            .filter((user) => { return user._id != credential.userId })
                            .filter((user) => { return user.activeDeliverer });
                        state.Notification.newOrder(order, usersToNotify);

                        return response.status(201).end("Created the order");
                    });
                });
            });
        });
    });



    router.get("/", Login.User, (request, response) => {
        const credential = response.locals.credential;

        state.database.collection("Users").findOne({ _id: credential.userId }, (userError, user) => {
            if ( userError ) return response.status(500).end("Error checking user: " + userError.message);
            if ( !user ) return response.status(500).end("User could not be found");

            state.database.collection("Orders").find().toArray((orderError, orders) => {
                if ( orderError ) return response.status(500).end("Error loading orders: " + orderError.message);

                async.map(orders, (order, next) => {
                    const hasWonBid = user.bids.indexOf(order.acceptedBid) != -1;
                    if ( !hasWonBid ) return next(undefined, order);

                    state.database.collection("Users").findOne({ orders: { $in: [order._id] } }, (receiverError, receiverUser) => {
                        if ( receiverError ) return response.status(500).end("Error loading receiver: " + userError.message);
                        if ( !receiverUser ) return response.status(500).end("Receiver could not be found");
                        order.receiver = state.factory.createReceiver(receiverUser);
                        next(undefined, order);
                    });
                }, (error, result) => {
                    return response.status(200).json(result);
                });
            });
        });
    });

    // Load a specific order
    router.get("/:orderId", Login.User, (request, response) => {
        const credential = response.locals.credential;
        state.database.collection("Users").findOne({ _id: credential.userId }, (userError, user) => {
            if ( userError ) return response.status(500).end("Error loading user: " + userError.message);
            if ( !user ) return response.status(500).end("User could not be found");

            const hasWonBid = user.bids.indexOf(request.order.acceptedBid) != -1;
            if ( !hasWonBid ) return response.status(200).json(request.order);

            state.database.collection("Users").findOne({ orders: { $in: [request.order._id] } }, (userError, receiver) => {
                if ( userError ) return response.status(500).end("Error loading receiver: " + userError.message);
                if ( !receiver ) return response.status(500).end("Receiver could not be found");

                request.order.receiver = state.factory.createReceiver(receiver);
                return response.status(200).json(request.order);
            });
        });
    });

    router.put("/:orderId", Login.User, (request, response) => {
        const credential = response.locals.credential;
        const orderId = request.params.orderId;
        const input = request.body;

        state.validator.validate.orderChangeInput(orderId, credential.userId, input, (inputError) => {
            if ( inputError ) return response.status(400).end(inputError.message);

            const acceptOrder = (callback) => {
                if ( input.action != "Accept" ) return callback();

                state.database.collection("Bids").findOne({ _id: input.bidId }, (bidError, bid) => {
                    if ( bidError ) return response.status(500).end("Error checking bid: " + bidError.message);
                    if ( !bid ) return response.status(500).end("Bid could not be found");

                    state.database.collection("Orders").update({ _id: orderId }, { $set: { state: "Accepted", acceptedBid: input.bidId, scheduledDeliveryTime: bid.deliveryTime } }, (error) => {
                        if ( error ) return response.status(500).end("Error updating order: " + error.message);

                        state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
                            if ( orderError ) return response.status(500).end("Error loading order: " + orderError.message);
                            if ( !order ) return response.status(500).end("Order could not be found");

                            state.database.collection("Users").findOne({ bids: { $in: [input.bidId] } }, (userError, deliverer) => {
                                if ( userError ) return response.status(500).end("Error loading user: " + userError.message);
                                if ( !deliverer ) return response.status(500).end("Deliverer could not be found");

                                state.Notification.orderWon(order, bid, deliverer);

                                const date = state.calendar.minutesFromNow(15);
                                const task = cron.schedule(`* ${date.getMinutes()} * * * *`, () => {
                                    task.destroy();
                                    jobs.automaticCancellation(order._id, bid._id, deliverer._id, (error) => {
                                        if ( error ) return console.log("Error cancelling order automatically: " + error.message);
                                    });
                                });

                                return response.status(200).json(order);
                            });
                        });
                    });
                });
            };

            const cancelOrder = (callback) => {
                if ( input.action != "Cancel" ) return callback();

                state.database.collection("Bids").findOne({ _id: request.order.acceptedBid }, (bidError, bid) => {
                    if ( bidError ) return response.status(500).end("Error loading bid: " + bidError.message);
                    if ( !bid ) return response.status(500).end("Bid could not be found");

                    state.database.collection("Users").update({ _id: bid.userId }, { $pull: { bids: bid._id } }, (userError) => {
                        if ( userError ) return response.status(500).end("Error updating user: " + userError.message);

                        state.database.collection("Orders").update({ _id: orderId }, { $set: { state: "Pending", acceptedBid: undefined }, $pull: { bids: request.order.acceptedBid } }, (updateError) => {
                            if ( updateError ) return response.status(500).end("Error updating order: " + updateError.message);

                            state.database.collection("Bids").remove({ _id: bid._id }, (bidRemoveError) => {
                                if ( bidRemoveError ) return response.status(500).end("Error removing order: " + bidRemoveError.message);

                                state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
                                    if ( orderError ) return response.status(500).end("Error loading updated order: " + orderError.message);
                                    if ( !order ) return response.status(500).end("Updated order could not be found");

                                    state.database.collection("Users").findOne({ _id: bid.userId }, (userError, user) => {
                                        if ( userError ) return response.status(500).end("Error loading user: " + userError.message);
                                        if ( !user ) return response.status(500).end("User could not be found");

                                        state.database.collection("Users").findOne({ orders: { $in: [orderId] } }, (receiverError, receiver) => {
                                            if ( receiverError ) return response.status(500).end("Error loading receiver: " + receiverError.message);
                                            if ( !receiver ) return response.status(500).end("Receiver could not be found");
                                            state.Notification.orderCancelled(order, receiver);

                                            return response.status(200).json({ order: order, user: user });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            };

            const startOrder = (callback) => {
                if ( input.action != "Start" ) return callback();

                state.database.collection("Orders").update({ _id: orderId }, { $set: { state: "Started" } }, (error) => {
                    if ( error ) return response.status(500).end("Error updating order: " + error.message);

                    state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
                        if ( orderError ) return response.status(500).end("Error loading order: " + orderError.message);
                        if ( !order ) return response.status(500).end("Order could not be found");

                        state.database.collection("Users").findOne({ orders: { $in: [orderId] } }, (receiverError, receiver) => {
                            if ( receiverError ) return response.status(500).end("Error loading receiver: " + receiverError.message);
                            if ( !receiver ) return response.status(500).end("Receiver could not be found");

                            state.Notification.orderStarted(order, receiver);

                            const losingDelivererIds = order.bids.filter((bidId) => { return bidId != order.acceptedBid });
                            state.database.collection("Users").find({ bids: { $in: losingDelivererIds } }).toArray((losingError, losingDeliverers) => {
                                state.Notification.orderLost(losingDeliverers);

                                return response.status(200).json(order);
                            });
                        });
                    });
                });
            };

            const receiveOrder = (callback) => {
                if ( input.action != "Receive" ) return callback();

                state.database.collection("Users").findOne({ orders: { $in: [request.order._id] } }, (receiverError, receiver) => {
                    if ( receiverError ) return response.status(500).end("Error loading receiver: " + receiverError.message);
                    if ( !receiver ) return response.status(500).end("Receiver could not be found");

                    state.database.collection("Users").findOne({ bids: { $in: [request.order.acceptedBid] } }, (delivererError, deliverer) => {
                        if ( delivererError ) return response.status(500).end("Error loading deliverer: " + delivererError.message);
                        if ( !deliverer ) return response.status(500).end("Deliverer could not be found");                                    

                        state.database.collection("Bids").findOne({ _id: request.order.acceptedBid }, (bidError, bid) => {
                            state.logger.error("Bid error: " + bidError);
                            if ( bidError ) return response.status(500).end("Error loading bid: " + bidError.message);
                            if ( !bid ) return response.status(500).end("Bid could not be found");

                            const authorisePayment = (callback) => {
                                const deliveryCut = bid.deliveryPrice * Configuration.payment.cutPercentage;
                                state.QuickPay.authorisePayment(request.order._id, deliveryCut, deliverer.creditCard, (paymentError) => {
                                    state.logger.error("Payment error: " + paymentError);
                                    if ( !paymentError ) return callback();

                                    state.database.collection("Orders").update({ _id: orderId }, { $set: { state: request.order.state } }, () => {
                                        return response.status(500).end(paymentError.message);
                                    });
                                });
                            };
                            
                            state.database.collection("Orders").update({ _id: orderId }, { $set: { state: "Received" } }, (updateOrderError) => {
                                if ( updateOrderError ) return response.status(500).end("Error updating order: " + error.message);

                                authorisePayment(() => {
                                    const rateUser = (callback) => {
                                        if ( !input.rating ) return callback();

                                        state.database.collection("Users").update({ bids: { $in: [request.order.acceptedBid] } }, { $push: { ratings: input.rating } }, (userError) => {
                                            if ( userError ) return response.status(500).end("Error updating user: " + userError.message);
                                            return callback();
                                        });
                                    };

                                    rateUser(() => {
                                        state.database.collection("Users").findOne({ bids: { $in: [request.order.acceptedBid] } }, (delivererError, deliverer) => {
                                            if ( delivererError ) return response.status(500).end("Error loading deliverer: " + delivererError.message);
                                            if ( !deliverer ) return response.status(500).end("Deliverer could not be found");                                    

                                            state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
                                                if ( orderError ) return response.status(500).end("Error loading order: " + orderError.message);
                                                if ( !order ) return response.status(500).end("Order could not be found");

                                                state.mailer.sendReceiptMailForReceiver(receiver, deliverer, order, bid, (receiverReceiptError) => {
                                                    state.mailer.sendReceiptMailForDeliverer(receiver, deliverer, order, bid, (delivererReceiptError) => {
                                                        state.mailer.sendReceiptMailForEpsilonApi(receiver, deliverer, order, bid, (epsilonApiReceiptError) => {
                                                            if ( receiverReceiptError ) return response.status(500).end("Error sending receipt to receiver: " + receiverReceiptError.message);
                                                            if ( delivererReceiptError ) return response.status(500).end("Error sending receipt to deliverer: " + delivererReceiptError.message);
                                                            if ( epsilonApiReceiptError ) return response.status(500).end("Error sending receipt to EpsilonApi: " + epsilonApiReceiptError.message);
                                                            state.Notification.orderReceived(order, bid, deliverer);

                                                            return response.status(200).json(order);
                                                        });
                                                    });                                            
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            };

            acceptOrder(() => {
                cancelOrder(() => {
                    startOrder(() => {
                        receiveOrder(() => {
                            return response.status(500).end("Error deciding action");
                        });
                    });
                });
            });
        });
    });

    // Load an orders location
    router.get("/:orderId/location", Login.User, (request, response) => {
        response.status(200).json(request.order.location);
    });

    // Update an orders location
    router.put("/:orderId/location", Login.User, (request, response) => {
        const locationRules = [rules.required, rules.object({
            latitude: [rules.required, rules.number, rules.size({ min: -90, max: 90 })],
            longitude: [rules.required, rules.number, rules.size({ min: -180, max: 180 })]
        })];
        glass.validate(request.body, locationRules, (error) => {
            if ( error ) return response.status(400).json(error.messages);

            state.database.collection("Orders").update({ _id: request.order._id }, { $set: { location: request.body } }, (error) => {
                if ( error ) return response.status(500).end("Unable to update order's location");

                state.database.collection("Orders").findOne({ _id: request.order._id }, (error, order) => {
                    if ( error ) return response.status(500).end("Unable to load updated order");

                    pickUpOrderIfPossible(order, (pickUpError) => {
                        deliverOrderIfPossible(order, (deliverError) => {
                            if ( pickUpError ) return response.status(500).end("Error picking up order: " + pickUpError.message);
                            if ( deliverError ) return response.status(500).end("Error delivering order: " + deliverError.message);

                            state.database.collection("Orders").findOne({ _id: request.order._id }, (error, order) => {
                                if ( error ) return response.status(500).end("Unable to load updated order");

                                return response.status(200).json(order);
                            });
                        });
                    });
                });
            });
        });
    });

    const pickUpOrderIfPossible = (order, callback) => {
        if ( !order.location ) return callback();

        const from = { lat: order.location.latitude, lon: order.location.longitude };
        const to = { lat: order.pickupAddress.coordinate.latitude, lon: order.pickupAddress.coordinate.longitude };
        const pickingUp = order.state === "Started" && geodist(from, to, { unit: "meters" }) < 250;
        if ( !pickingUp ) return callback();

        state.logger.info("Will notify about order pickup");
        state.database.collection("Orders").update({ _id: order._id }, { $set: { state: "PickedUp" } }, (error) => {
            if ( error ) return callback(error);

            state.database.collection("Orders").findOne({ _id: order._id }, (orderError, order) => {
                if ( orderError ) return callback(orderError);
                if ( !order ) return callback({ message: "Order could not be found" });

                state.database.collection("Users").findOne({ orders: { $in: [order._id] } }, (userError, receiver) => {
                    if ( userError ) return callback(userError);
                    if ( !receiver ) return callback({ message: "Receiver could not be found" });

                    state.Notification.orderPickedUp(order, receiver);
                    state.logger.info("Did notify about order pickup");
                    callback();
                });
            });
        });
    };

    const deliverOrderIfPossible = (order, callback) => {
        if ( !order.location ) return callback();

        const from = { lat: order.location.latitude, lon: order.location.longitude };
        const to = { lat: order.deliveryAddress.coordinate.latitude, lon: order.deliveryAddress.coordinate.longitude };
        const delivering = order.state === "PickedUp" && geodist(from, to, { unit: "meters" }) < 250;
        if ( !delivering ) return callback();

        state.logger.info("Will notify about order delivery");
        state.database.collection("Orders").update({ _id: order._id }, { $set: { state: "Delivered" } }, (error) => {
            if ( error ) return callback(error);

            state.database.collection("Orders").findOne({ _id: order._id }, (orderError, order) => {
                if ( orderError ) return callback(orderError);
                if ( !order ) return callback({ message: "Order could not be found" });

                state.database.collection("Users").findOne({ orders: { $in: [order._id] } }, (userError, receiver) => {
                    if ( userError ) return callback(userError);
                    if ( !receiver ) return callback({ message: "Receiver could not be found" });

                    state.Notification.orderDelivered(order, receiver);
                    state.logger.info("Did notify about order delivery");

                    const date = state.calendar.minutesFromNow(60);
                    const task = cron.schedule(`* ${date.getMinutes()} ${date.getHours()} * * *`, () => {
                        task.destroy();
                        jobs.sendDeliveryReminder(order._id, receiver._id, (error) => {
                            if ( error ) console.log("Error sending delivery reminder: " + error.message);
                        });
                    });

                    callback();
                });
            });
        });
    };



    return router;
};