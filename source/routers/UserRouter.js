const express = require("express");
const async = require("async");
const LoginFilter = require("../filters/LoginFilter");



module.exports = (state) => {
    const router = express.Router();
    const Login = LoginFilter(state);

    // Check if Facebook user already exists
    router.get("/facebook/:facebookUserId/exists", (request, response) => {
        const facebookUserId = request.params.facebookUserId;
        state.database.collection("Users").findOne({ facebookUserId: facebookUserId }, (error, user) => {
            if ( error ) return response.status(500).end("Error checking user: " + error.message);
            if ( !user ) return response.status(204).end("User does not exist");
            
            return response.status(200).end("User exists");
        });
    });

    // Check if user is logged in
    router.get("/", Login.User, (request, response) => {
        response.status(200).end("User is logged in");
    });

    // Create a regular user
    router.post("/", (request, response) => {
        const input = request.body;
        state.validator.validate.userCreationInput(input, (inputError) => {
            if ( inputError ) return response.status(400).end(inputError.message);

            state.database.collection("Users").findOne({ email: input.email }, (userError, existingUser) => {
                if ( userError ) return response.status(500).end("Error checking user: " + userError.message);
                if ( existingUser ) return response.status(400).end("User already exists");

                const user = state.factory.createUser(input);
                state.database.collection("Users").insert(user, (error) => {
                    if ( error ) return response.status(500).end("Error storing user: " + error.message);

                    if ( input.creditCard === undefined ) return response.status(201).end("Created the user");
                    state.database.collection("CreditCards").remove({ link: input.creditCard }, (creditCardError) => {
                        if ( creditCardError ) return response.status(500).end("Error removing credit card: " + creditCardError.message);
                        return response.status(201).end("Created the user");
                    });
                });
            });
        });
    });



    router.post("/facebook", (request, response) => {
        const input = request.body;
        state.validator.validate.facebookUserCreationInput(input, (inputError) => {
            if ( inputError ) return response.status(400).end(inputError.message);

            state.database.collection("Users").findOne({ facebookUserId: input.facebook.facebookUserId }, (userError, existingUser) => {
                if ( userError ) return response.status(500).end("Error checking user with facebook user id: " + userError.message);
                if ( existingUser ) return response.status(400).end("User already exists through facebook user id");

                state.facebook.loadData(input.facebook, (error, data) => {
                    if ( error ) return response.status(500).end("Error checking Facebook: " + error.message);

                    const validFacebookData = state.facebook.validateData(input.facebook, ["public_profile", "email"], data);
                    if ( !validFacebookData ) return response.status(500).end("Invalid facebook data");

                    state.facebook.extractInformation({ token: input.facebook.facebookToken, fields: "id%2Cemail%2Cpicture.width(1000).height(1000)" }, (informationError, information) => {
                        if ( informationError ) return response.status(500).end("Error loading information: " + informationError.message);
                        if ( !information ) return response.status(500).end("No facebook information");

                        state.database.collection("Users").findOne({ email: information.email }, (userError, existingUser) => {
                            if ( userError ) return response.status(500).end("Error checking user with email: " + userError.message);
                            if ( existingUser ) return response.status(400).end("User already exists through email");

                            state.imageLoader.loadImage(information.picture.data.url, (imageLoadError, imageData) => {
                                if ( imageLoadError ) return response.status(500).end("Error loading image: " + imageLoadError.message);

                                const image = state.factory.createImage(imageData);
                                state.database.collection("Images").insert(image, (imageSaveError) => {
                                    if ( imageSaveError ) return response.status(500).end("Error saving image: " + imageSaveError.message);

                                    const user = state.factory.createFacebookUser(input.user, information, image);
                                    state.database.collection("Users").insert(user, (error) => {
                                        if ( error ) return response.status(500).end("Error storing user: " + error.message);

                                        if ( input.user.creditCard === undefined ) return response.status(201).end("Created the user");
                                        state.database.collection("CreditCards").remove({ link: input.user.creditCard }, (creditCardError) => {
                                            if ( creditCardError ) return response.status(500).end("Error deleting credit card: " + creditCardError.message);
                                            return response.status(201).end("Created the user");
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



    router.put("/:userId", Login.User, (request, response) => {
        const credential = response.locals.credential;
        const userId = request.params.userId;
        if ( userId !== credential.userId ) return response.status(401).end("Not allowed to change other users' profile");

        const input = request.body;
        state.validator.validate.userChangeInput(input, (inputError) => {
            if ( inputError ) return response.status(400).end(inputError.message);

            state.database.collection("Users").update({ _id: userId }, { $set: input }, (updateUserError) => {
                if ( updateUserError ) return response.status(500).end("Error updating user: " + updateUserError.message);

                state.database.collection("Users").findOne({ _id: userId }, (userError, user) => {
                    if ( userError ) return response.status(500).end("Error loading user: " + userError.message);
                    if ( !user ) return response.status(500).end("User could not be found");

                    return response.status(200).json(user);
                });
            });
        });
    });


    router.put("/:userId/avatar", Login.User, (request, response) => {
        const credential = response.locals.credential;
        const userId = request.params.userId;
        if ( userId !== credential.userId ) return response.status(401).end("Not allowed to change other users' avatar");

        const deleteImage = (id, callback) => {
            if ( !id ) return callback();

            state.database.collection("Images").remove({ _id: id }, (removeImageError) => {
                if ( removeImageError ) return response.status(500).end("Error removing image: " + removeImageError.message);
                callback();
            });
        }


        const input = request.body;
        state.validator.validate.userAvatarChangeInput(input, (inputError) => {
            if ( inputError ) return response.status(400).end(inputError.message);

            state.database.collection("Users").findOne({ _id: userId }, (existingUserError, existingUser) => {
                if ( existingUserError ) return response.status(500).end("Error loading existing user: " + existingUserError.message);
                if ( !existingUser ) return response.status(500).end("Existing user could not be found");
                const oldAvatarId = existingUser.avatar;

                const image = state.factory.createImage(input.image);
                state.database.collection("Images").insert(image, (imageError) => {
                    if ( imageError ) return response.status(500).end("Error storing image: " + imageError.message);

                    state.database.collection("Users").update({ _id: userId }, { $set: { avatar: image._id } }, (updateUserError) => {
                        if ( updateUserError ) return response.status(500).end("Error updating user: " + updateUserError.message);

                        deleteImage(oldAvatarId, () => {
                            state.database.collection("Users").findOne({ _id: userId }, (updatedUserError, user) => {
                                if ( updatedUserError ) return response.status(500).end("Error loading updated user: " + updateUserError.message);
                                if ( !user ) return response.status(500).end("Updated user could not be found");

                                return response.status(200).json(user);
                            });
                        });
                    });
                });
            });
        });
    });



    router.get("/:userId/bids", Login.User, (request, response) => {
        const credential = response.locals.credential;
        const userId = request.params.userId;
        if ( userId !== credential.userId ) return response.status(401).end("Not allowed to load other users' bids");

        state.database.collection("Users").findOne({ _id: userId }, (userError, user) => {
            if ( userError ) return response.status(500).end("Error checking user: " + userError.message);
            if ( !user ) return response.status(500).end("User could not be found");

            state.database.collection("Bids").find({ _id: { $in: user.bids } }).toArray((bidError, bids) => {
                if ( bidError ) return response.status(500).end("Error loading bids: " + bidError.message);

                const deliverer = state.factory.createDeliverer(user);
                return response.status(200).json(bids.map((bid) => {
                    delete bid.userId;
                    bid.deliverer = deliverer;
                    return bid;
                }));
            });
        });
    });


    router.delete("/:userId", Login.User, (request, response) => {
        const credential = response.locals.credential;
        const userId = request.params.userId;
        if ( userId !== credential.userId ) return response.status(401).end("Not allowed to delete other users");

        state.database.collection("Users").findOne({ _id: userId }, (userError, user) => {
            if ( userError ) return response.status(500).end("Error loading user: " + userError.message);
            if ( !user ) return response.status(500).end("User could not be found");

            async.parallel([
                (bidsHaveBeenDeleted) => {
                    async.each(user.bids, (bidId, next) => {
                        state.database.collection("Orders").update({ bids: { $in: [bidId] } }, { $pull: { bids: [bidId] } }, (orderError) => {
                            if ( orderError ) return next(orderError);

                            state.database.collection("Bids").remove({ _id: bidId }, next);
                        });
                    }, bidsHaveBeenDeleted);
                },
                (ordersHaveBeenDeleted) => {
                    async.each(user.orders, (orderId, nextOrder) => {
                        state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
                            if ( orderError ) return nextOrder(orderError);
                            if ( !order ) return nextOrder();
                            
                            async.each(order.bids, (bidId, nextBid) => {
                                state.database.collection("Users").update({ bids: { $in: [bidId] } }, { $pull: { bids: [bidId] } }, (userError) => {
                                    if ( userError ) return nextBid(userError);
                                    state.database.collection("Bids").remove({ _id: bidId }, nextBid);
                                });
                            }, (error) => {
                                if ( error ) return response.status(500).end("Error removing bids for order: " + error.message);
                                state.database.collection("Orders").remove({ _id: orderId }, nextOrder);
                            });
                        });
                    }, ordersHaveBeenDeleted);
                }
            ], (error) => {
                if ( error ) return response.status(500).end("Error preparing to delete user: " + error.message);

                state.database.collection("Users").remove({ _id: userId }, (userError) => {
                    if ( userError ) return response.status(500).end("Error deleting user: " + userError.message);
                    return response.status(200).end("Deleted the user");
                });
            });
        });
    });


    return router;
};