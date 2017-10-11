const express = require("express");
const LoginFilter = require("../filters/LoginFilter");

module.exports = (state) => {
	const router = express.Router();
	const Login = LoginFilter(state);



	router.post("/", (request, response) => {

		const deleteCredentialIfAny = (credential, callback) => {
			if ( !credential ) return callback();

			state.database.collection("Credentials").remove({ _id: credential._id }, (error) => {
				if ( error ) return response.status(500).end("Error deleting credential: " + error.message);		

				callback();
			});
		};

		const login = request.body;
		state.validator.validate.passwordLogin(login, (loginError) => {
			if ( loginError ) return response.status(400).end(loginError.message);

			state.database.collection("Users").update({ email: login.email }, { $set: { device: login.device } }, (deviceError) => {
				if ( deviceError ) return response.status(500).end("Error updating device token: " + deviceError.message);

				state.database.collection("Users").findOne({ email: login.email }, (userError, user) => {
					if ( userError ) return response.status(500).end("Error loading user: " + userError.message);
					if ( !user ) return response.status(500).end("User could not be found");

					state.database.collection("Credentials").findOne({ userId: user._id }, (credentialError, credential) => {
						if ( credentialError ) return response.status(500).end("Error loading credential: " + credentialError.message);
						
						deleteCredentialIfAny(credential, () => {
							const credential = state.factory.createUserCredential(user);
							state.database.collection("Credentials").insert(credential, (error) => {
								if ( error ) return response.status(500).end("Error storing credential: " + error.message);

								const strippedCredential = { token: credential._id };
								return response.status(200).json(strippedCredential);
							});
						});
					});
				});
			});
		});
	});



	router.post("/facebook", (request, response) => {

		const deleteCredentialIfAny = (credential, callback) => {
			if ( !credential ) return callback();

			state.database.collection("Credentials").remove({ _id: credential._id }, (error) => {
				if ( error ) return response.status(500).end("Unable to delete credential");		

				callback();
			});
		};

		const login = request.body;
		state.validator.validate.facebookLogin(login, ["public_profile", "email"], (loginError) => {
			if ( loginError ) return response.status(400).end(loginError.message);

			state.database.collection("Users").update({ facebookUserId: login.facebookUserId }, { $set: { device: login.device } }, (deviceError) => {
				if ( deviceError ) return response.status(500).end("Error updating device token: " + deviceError.message);

				state.database.collection("Users").findOne({ facebookUserId: login.facebookUserId }, (userError, user) => {
					if ( userError ) return response.status(500).end("Error loading user: " + userError.message);
					if ( !user ) return response.status(500).end("User could not be found");

					state.database.collection("Credentials").findOne({ userId: user._id }, (credentialError, credential) => {
						if ( credentialError ) return response.status(500).end("Error loading credential: " + credentialError.message);

						deleteCredentialIfAny(credential, () => {
							const credential = state.factory.createUserCredential(user);
							state.database.collection("Credentials").insert(credential, (error) => {
								if ( error ) return response.status(500).end("Error storing credential: " + error.message);

								const strippedCredential = { token: credential._id };
								return response.status(200).json(strippedCredential);
							});
						});
					});	
				});
			});
		});
	});
	


    router.get("/user", Login.User, (request, response) => {
    	const credential = response.locals.credential;

    	state.database.collection("Users").findOne({ _id: credential.userId }, (error, user) => {
    		if ( error ) return response.status(500).end("Error loading user: " + error.message);

    		return response.status(200).json(user);
    	});
    });



    router.post("/challenge", (request, response) => {
    	const input = request.body;
    	state.validator.validate.loginChallengeCreationInput(input, (inputError) => {
    		if ( inputError ) return response.status(400).end(inputError.message);

    		state.database.collection("Users").findOne({ email: input.email }, (userError, user) => {
    			if ( userError ) return response.status(500).end("Error checking user: " + userError.message);
    			if ( !user ) return response.status(400).end("User could not be found");

    			const userId = user._id;
    			const challenge = state.factory.createChallenge(userId);
    			state.database.collection("Challenges").insert(challenge, (challengeError) => {
    				if ( challengeError ) return response.status(500).end("Error storing challenge: " + challengeError.message);

    				state.mailer.sendChallengeMail(user, challenge.secret, (error) => {
    					if ( error ) return response.status(500).end("Error sending mail: " + error);

    					return response.status(201).end("Created the challenge");
    				});
    			});
    		});
    	});
    });



    router.post("/challenge/verify", (request, response) => {
    	const input = request.body;
    	state.validator.validate.loginChallengeVerificationInput(input, (inputError) => {
    		if ( inputError ) return response.status(401).end(inputError.message);
    		return response.status(200).end("Challenge was matched");
    	});
    });



    router.put("/", (request, response) => {
    	const input = request.body;
    	state.validator.validate.loginChangeInput(input, (inputError) => {
    		if ( inputError ) return response.status(401).end(inputError.message);

    		state.database.collection("Challenges").findOne({ secret: input.secret }, (challengeError, challenge) => {
    			if ( challengeError ) return response.status(500).end("Error loading challenge: " + challengeError.message);
    			if ( !challenge ) return response.status(500).end("Challenge could not be found");

    			state.database.collection("Users").update({ _id: challenge.userId }, { $set: { password: input.password } }, (userError) => {
    				if ( userError ) return response.status(500).end("Error updating user: " + userError.message);

    				state.database.collection("Challenges").remove({ _id: "challenge-id" }, (challengeError) => {
    					if ( challengeError ) return response.status(500).end("Error deleting challenge: " + challengeError.message);
    					
    					return response.status(200).end("Changed the user's login");
    				});
    			});
    		});
    	});
    });



	return router;
};
