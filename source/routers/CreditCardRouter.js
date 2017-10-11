const express = require("express");

module.exports = (state) => {
    const router = express.Router();
    const Login = require("../filters/LoginFilter")(state);

    router.post("/", (request, response) => {
        const input = request.body;

        state.validator.validate.creditCardCreationInput(input, (inputError) => {
        	if ( inputError ) return response.status(400).end(inputError.message);

            state.QuickPay.uploadCreditCard(input, (creditCardError, creditCardLink) => {
                if ( creditCardError ) return response.status(400).end("Error uploading credit card: " + creditCardError.message);
                if ( !creditCardLink ) return response.status(500).end("Credit card link was not received");

                const creditCard = state.factory.createCreditCard(creditCardLink);
                state.database.collection("CreditCards").insert(creditCard, (storeCreditCardError) => {
                    if ( storeCreditCardError ) return response.status(500).end("Error storing credit card: " + storeCreditCardError.message);
                    return response.status(201).end(creditCardLink);
                });
            });
        });
    });

    router.get("/:creditCardId", Login.User, (request, response) => {
        const creditCardId = request.params.creditCardId;
        const credential = response.locals.credential;
        state.database.collection("Users").findOne({ _id: credential.userId }, (error, user) => {
            if ( error ) return response.status(500).end("Error loading user: " + error.message);
            if ( !user ) return response.status(500).end("User could not be found");
            if ( creditCardId !== user.creditCard ) return response.status(401).end("Not allowed to load other people's credit cards");

            state.QuickPay.loadCreditCard(creditCardId, (error, suffix) => {
                if ( error ) return response.status(500).end("Error loading credit card: " + error.message);
                return response.status(200).json({ suffix: suffix });
            });
        });
    });

    router.put("/:creditCardId", Login.User, (request, response) => {
        const credential = response.locals.credential;
        state.database.collection("Users").findOne({ _id: credential.userId }, (error, user) => {
            if ( error ) return response.status(500).end("Error loading user: " + error.message);
            if ( !user ) return response.status(500).end("User could not be found");

            const input = request.body;
            state.validator.validate.creditCardCreationInput(input, (inputError) => {
                if ( inputError ) return response.status(400).end(inputError.message);

                state.QuickPay.uploadCreditCard(input, (creditCardError, creditCardId) => {
                    if ( creditCardError ) return response.status(400).end("Error uploading credit card: " + creditCardError.message);
                    if ( !creditCardId ) return response.status(500).end("Credit card id was not received");

                    state.database.collection("Users").update({ _id: credential.userId }, { $set: { creditCard: creditCardId } }, (updateError) => {
                        if ( updateError ) return response.status(500).end("Error updating user: " + updateError.message);

                        state.database.collection("Users").findOne({ _id: credential.userId }, (error, user) => {
                            if ( error ) return response.status(500).end("Error loading user: " + error.message);
                            if ( !user ) return response.status(500).end("User could not be found");

                            return response.status(200).json(user);
                        });
                    });
                });
            });
        });
    });

    return router;
};