const express = require("express");
const async = require("async");
const LoginFilter = require("../filters/LoginFilter");



module.exports = (state) => {
    const middleware = require("../middleware")(state);
    const router = express.Router();
    const Login = LoginFilter(state);

    router.param("bidId", middleware.prepareBid);

    router.post("/:orderId", Login.User, (request, response) => {
        const credential = response.locals.credential;
        const orderId = request.params.orderId;
        const input = request.body;
        
        state.validator.validate.bidCreationInput(orderId, credential.userId, input, (inputError) => {
        	if ( inputError ) return response.status(400).end(inputError.message);

    		const bid = state.factory.createBid(orderId, credential.userId, input);
    		state.database.collection("Bids").insert(bid, (bidStoreError) => {
    			if ( bidStoreError ) return response.status(500).end("Error storing bid: " + bidStoreError.message);

    			state.database.collection("Orders").update({ _id: orderId }, { $push: { bids: bid._id } }, (orderError) => {
    				if ( orderError ) return response.status(500).end("Error updating order: " + orderError.message);

    				state.database.collection("Users").update({ _id: credential.userId }, { $push: { bids: bid._id } }, (userError) => {
    					if ( userError ) return response.status(500).end("Error updating user: " + userError.message);

                        state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
                            state.database.collection("Users").findOne({ orders: { $in: [orderId] } }, (receiverError, receiver) => {
                                state.database.collection("Users").findOne({ _id: credential.userId }, (delivererError, deliverer) => {
                                    if ( deliverer ) bid.deliverer = state.factory.createDeliverer(deliverer);
                                    if ( order && receiver && deliverer ) state.Notification.orderReceivedBid(order, bid, receiver);

                                    return response.status(201).end("Created the bid");
                                });
                            });
                        });
    				});
    			});
    		});
        });
    });

    // Load specific bid
    router.get("/bid/:bidId", Login.User, (request, response) => {
        return response.status(200).json(request.bid);
    });

    router.get("/:orderId", Login.User, (request, response) => {
        const credential = response.locals.credential;
    	const orderId = request.params.orderId;

        state.database.collection("Users").findOne({ _id: credential.userId, orders: { $in: [orderId] } }, (userError, owner) => {
            if ( userError ) return response.status(500).end("Error checking user: " + userError.message);
            if ( !owner ) return response.status(401).end("User does not own the order");

            state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
                if ( orderError ) return response.status(500).end("Error checking order: " + orderError.message);
                if ( !order ) return response.status(400).end("Order could not be found");

                state.database.collection("Bids").find({ _id: { $in: order.bids } }).toArray((error, bids) => {
                    if ( error ) return response.status(500).end("Error loading bids: " + error.message);

                    async.map(bids, (bid, next) => {
                        state.database.collection("Users").findOne({ _id: bid.userId }, (userError, user) => {
                            delete bid.userId;
                            bid.deliverer = state.factory.createDeliverer(user);
                            next(undefined, bid);
                        });
                    }, (error, result) => {
                        return response.status(200).json(result);
                    });
                });
            });
        });
    });



    return router;
};