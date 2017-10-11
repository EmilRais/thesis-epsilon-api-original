const should = require("chai").should();
const agent = require("superagent");
const TestState = require("../source/TestState");

const state = {};
const app = require("../source/Server")(state);
var server = undefined;

describe("LoginRouter", () => {


	before((done) => {
		server = app.listen(4000, done);
	})

	beforeEach(() => {
		TestState.infuse(state);
	});

	after((done) => {
		server.close();
		done();
	});



	describe("POST /login", () => {


		it("Should fail if invalid input", (done) => {
			state.validator.validate.passwordLogin = (login, callback) => { return callback({ message: "Input was invalid" }) };
			const login = { email: "stuff@stuff.dk", password: "password" };
			agent
				.post("localhost:4000/login")
				.send(login)
				.end((error, response) => {
					response.status.should.equal(400);
					response.text.should.equal("Input was invalid");
					done();
				});
		});


		it("Should fail if user does not exist", (done) => {
			const login = { email: "stuff@stuff.dk", password: "password" };
			agent
				.post("localhost:4000/login")
				.send(login)
				.end((error, response) => {
					response.status.should.equal(500);
					response.text.should.equal("User could not be found");
					done();
				});
		});


		it("Should return 200 if succesful", (done) => {
			state.database.collection("Users").insert({ email: "stuff@stuff.dk" }, (error) => {
				should.not.exist(error);

				const login = { email: "stuff@stuff.dk", password: "password" };
				agent
					.post("localhost:4000/login")
					.send(login)
					.end((error, response) => {
						response.status.should.equal(200);
						done();
					});
			});
		});


		it("Should update device", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", email: "stuff@stuff.dk" }, (error) => {
				should.not.exist(error);

				const login = { email: "stuff@stuff.dk", password: "password", device: { token: "token", type: "Development" } };
				agent
					.post("localhost:4000/login")
					.send(login)
					.end((error, response) => {
						state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
							should.not.exist(error);
							should.exist(user);

							const expectedDevice = { token: "token", type: "Development" };
							user.device.should.deep.equal(expectedDevice);
							done();
						});
					});
			});
		});


		it("Should delete existing credential if any", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", email: "stuff@stuff.dk" }, (userError) => {
				state.database.collection("Credentials").insert({ _id: "credential-id", userId: "user-id" }, (credentialError) => {
					should.not.exist(userError);
					should.not.exist(credentialError);

					const login = { email: "stuff@stuff.dk", password: "password" };
					agent
						.post("localhost:4000/login")
						.send(login)
						.end((error, response) => {
							state.database.collection("Credentials").findOne({ _id: "credential-id" }, (error, credential) => {
								should.not.exist(error);
								should.not.exist(credential);
								done();
							});
						});
				});
			});
		});


		it("Should store credential", (done) => {
			state.calendar.hoursFromNow = (hours) => { return new Date(1000) };
			state.factory.createId = () => { return "credential-id" };
			state.database.collection("Users").insert({ _id: "user-id", email: "stuff@stuff.dk" }, (error) => {
				should.not.exist(error);

				const login = { email: "stuff@stuff.dk", password: "password" };
				agent
					.post("localhost:4000/login")
					.send(login)
					.end((error, response) => {
						state.database.collection("Credentials").findOne({ _id: "credential-id" }, (error, credential) => {
							should.not.exist(error);
							should.exist(credential);

							const expectedCredential = { _id: "credential-id", role: "User", userId: "user-id", expires: 1000 };
							credential.should.deep.equal(expectedCredential);
							done();
						});
					});
			});
		});


		it("Should return stripped credential", (done) => {
			state.factory.createId = () => { return "credential-id" };
			state.database.collection("Users").insert({ email: "stuff@stuff.dk" }, (error) => {
				should.not.exist(error);

				const login = { email: "stuff@stuff.dk", password: "password" };
				agent
					.post("localhost:4000/login")
					.send(login)
					.end((error, response) => {
						const strippedCredential = { token: "credential-id" };
						response.body.should.deep.equal(strippedCredential);
						done();
					});
			});
		});
	});



	describe("POST /login/facebook", () => {
		

		it("Should fail if invalid login", (done) => {
			state.validator.validate.facebookLogin = (login, requiredPermissions, callback) => { return callback({ message: "Login was invalid" }) };
			const login = { facebookUserId: "peter1234", token: "abcd1234" };;
			agent
				.post("localhost:4000/login/facebook")
				.send(login)
				.end((error, response) => {
					response.status.should.equal(400);
					response.text.should.equal("Login was invalid");
					done();
				});
		});


		it("Should fail if user does not exist", (done) => {
			const login = { facebookUserId: "peter1234", token: "abcd1234" };;
			agent
				.post("localhost:4000/login/facebook")
				.send(login)
				.end((error, response) => {
					response.status.should.equal(500);
					response.text.should.equal("User could not be found");
					done();
				});
		});


		it("Should return 200 when succesful", (done) => {
			state.database.collection("Users").insert({ facebookUserId: "peter1234" }, (error) => {
				should.not.exist(error);

				const login = { facebookUserId: "peter1234", token: "abcd1234" };;
				agent
					.post("localhost:4000/login/facebook")
					.send(login)
					.end((error, response) => {
						response.status.should.equal(200);
						done();
					});
			});
		});


		it("Should update device", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", facebookUserId: "peter1234", device: { token: "abcd", type: "Development" } }, (error) => {
				should.not.exist(error);

				const login = { facebookUserId: "peter1234", token: "abcd1234", device: { token: "dbad", type: "Production" } };
				agent
					.post("localhost:4000/login/facebook")
					.send(login)
					.end((error, response) => {
						state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
							should.not.exist(error);
							should.exist(user);

							const expectedDevice = { token: "dbad", type: "Production" };
							user.device.should.deep.equal(expectedDevice);
							done();
						});
					});
			});
		});


		it("Should delete existing credential if any", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", facebookUserId: "peter1234" }, (userError) => {
				state.database.collection("Credentials").insert({ _id: "credential-id", userId: "user-id" }, (credentialError) => {
					should.not.exist(userError);
					should.not.exist(credentialError);

					const login = { facebookUserId: "peter1234", token: "abcd1234" };;
					agent
						.post("localhost:4000/login/facebook")
						.send(login)
						.end((error, response) => {
							state.database.collection("Credentials").findOne({ _id: "credential-id" }, (error, credential) => {
								should.not.exist(error);
								should.not.exist(credential);
								done();
							});
						});
				});
			});
		});


		it("Should store credential", (done) => {
			state.factory.createId = () => { return "credential-id" };
			state.calendar.hoursFromNow = (hours) => { return new Date(1000) };
			state.database.collection("Users").insert({ _id: "user-id", facebookUserId: "peter1234" }, (error) => {
				should.not.exist(error);

				const login = { facebookUserId: "peter1234", token: "abcd1234" };;
				agent
					.post("localhost:4000/login/facebook")
					.send(login)
					.end((error, response) => {
						state.database.collection("Credentials").findOne({ _id: "credential-id" }, (error, credential) => {
							should.not.exist(error);
							should.exist(credential);

							const expectedCredential = { _id: "credential-id", role: "User", userId: "user-id", expires: 1000 };
							credential.should.deep.equal(expectedCredential);
							done();
						});
					});
			});
		});


		it("Should return stripped credential", (done) => {
			state.factory.createId = () => { return "credential-id" };
			state.database.collection("Users").insert({ _id: "user-id", facebookUserId: "peter1234" }, (error) => {
				should.not.exist(error);

				const login = { facebookUserId: "peter1234", token: "abcd1234" };;
				agent
					.post("localhost:4000/login/facebook")
					.send(login)
					.end((error, response) => {
						const strippedCredential = { token: "credential-id" };
						response.body.should.deep.equal(strippedCredential);
						done();
					});
			});
		});


	});



    describe("GET /login/user", () => {


    	it("Should fail if not logged in as user", (done) => {
    		state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Credential was invalid" }) };
    		agent
				.get("localhost:4000/login/user")
				.end((error, response) => {
					response.status.should.equal(401);
					response.text.should.equal("Credential was invalid");
					done();
				});
    	});


    	it("Should return user when succesful", (done) => {
			state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
			state.database.collection("Users").insert({ _id: "user-id", facebookUserId: "john1234" }, (error) => {
				should.not.exist(error);

				agent
					.get("localhost:4000/login/user")
					.end((error, response) => {
						const expectedUser = { _id: "user-id", facebookUserId: "john1234" };
						response.body.should.deep.equal(expectedUser);
						done();
					});
			});
		});


    });



    describe("POST /login/challenge", () => {
    	

    	it("Should fail if invalid input", (done) => {
    		state.validator.validate.loginChallengeCreationInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
    		const input = undefined;
    		agent
    			.post("localhost:4000/login/challenge")
    			.send(input)
    			.end((error, response) => {
    				response.status.should.equal(400);
    				response.text.should.equal("Input was invalid");
    				done();
    			});
    	});


	    it("Should fail if user does not exist", (done) => {
	    	const input = { email: "stuff@stuff.dk" };
    		agent
    			.post("localhost:4000/login/challenge")
    			.send(input)
    			.end((error, response) => {
    				response.status.should.equal(400);
    				response.text.should.equal("User could not be found");
    				done();
    			});
	    });


	    it("Should return 201 when succesful", (done) => {
	    	state.database.collection("Users").insert({ _id: "user-id", name: "Peter Hansen", email: "stuff@stuff.dk" }, (userError) => {
	    		should.not.exist(userError);

	    		const input = { email: "stuff@stuff.dk" };
	    		agent
	    			.post("localhost:4000/login/challenge")
	    			.send(input)
	    			.end((error, response) => {
	    				response.status.should.equal(201);
	    				response.text.should.equal("Created the challenge");
	    				done();
	    			});
	    	});
	    });
	    

	    it("Should store challenge", (done) => {
	    	state.factory.createId = () => { return "challenge-id" };
	    	state.factory.createSecret = () => { return "some-secret" };
	    	state.calendar.minutesFromNow = () => { return new Date(1500) };
	    	state.database.collection("Users").insert({ _id: "user-id", email: "stuff@stuff.dk" }, (userError) => {
	    		should.not.exist(userError);

	    		const input = { email: "stuff@stuff.dk" };
	    		agent
	    			.post("localhost:4000/login/challenge")
	    			.send(input)
	    			.end((error, response) => {
	    				state.database.collection("Challenges").findOne({ _id: "challenge-id" }, (error, challenge) => {
	    					should.not.exist(error);
	    					should.exist(challenge);

	    					const expectedChallenge = { _id: "challenge-id", userId: "user-id", secret: "some-secret", expires: 1500 };
	    					challenge.should.deep.equal(expectedChallenge);
	    					done();
	    				});
	    			});
	    	});
	    });


	    it("Should send mail", (done) => {
	    	state.factory.createSecret = () => { return "some-secret" };
	    	state.factory.createChallengeMail = (receiver, secret) => { return { from: "@", to: receiver.email, subject: "@", text: secret } };
	    	state.database.collection("Users").insert({ _id: "user-id", email: "stuff@stuff.dk" }, (userError) => {
	    		should.not.exist(userError);

	    		const input = { email: "stuff@stuff.dk" };
	    		agent
	    			.post("localhost:4000/login/challenge")
	    			.send(input)
	    			.end((error, response) => {
	    				const expectedMail = { from: "@", to: "stuff@stuff.dk", subject: "@", text: "some-secret" };
	    				state.mailer.mails.should.include(expectedMail);
	    				done();
	    			});
	    	});
	    });


    });



    describe("POST /login/challenge/verify", () => {


    	it("Should return 401 if challenge is failed", (done) => {
    		state.validator.validate.loginChallengeVerificationInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
    		agent
    			.post("localhost:4000/login/challenge/verify")
    			.end((error, response) => {
    				response.status.should.equal(401);
    				response.text.should.equal("Input was invalid");
    				done();
    			});
    	});


    	it("Should return 200 if challenge is matched", (done) => {
    		agent
    			.post("localhost:4000/login/challenge/verify")
    			.end((error, response) => {
    				response.status.should.equal(200);
    				response.text.should.equal("Challenge was matched");
    				done();
    			});
    	});


    });



    describe("PUT /login", () => {


    	it("Should fail if input is invalid", (done) => {
    		state.validator.validate.loginChangeInput = (input, callback) => { return callback({ message: "Challenge failed" }) };

    		const input = undefined;
    		agent
    			.put("localhost:4000/login")
    			.send(input)
    			.end((error, response) => {
    				response.status.should.equal(401);
    				response.text.should.equal("Challenge failed");
    				done();
    			});
    	});


	    it("Should fail if challenge does not exist", (done) => {
    		const input = { secret: "some-secret" };
    		agent
    			.put("localhost:4000/login")
    			.send(input)
    			.end((error, response) => {
    				response.status.should.equal(500);
    				response.text.should.equal("Challenge could not be found");
    				done();
    			});
	    });


	    it("Should return 200 when succesful", (done) => {
	    	state.database.collection("Challenges").insert({ _id: "challenge-id", userId: "user-id", secret: "some-secret" }, (error) => {
	    		should.not.exist(error);

	    		const input = { secret: "some-secret", password: "password" };
	    		agent
	    			.put("localhost:4000/login")
	    			.send(input)
	    			.end((error, response) => {
	    				response.status.should.equal(200);
	    				response.text.should.equal("Changed the user's login");
	    				done();
	    			});
	    	});
	    });


	    it("Should update user", (done) => {
	    	state.database.collection("Challenges").insert({ _id: "challenge-id", userId: "user-id", secret: "some-secret" }, (challengeError) => {
	    		state.database.collection("Users").insert({ _id: "user-id", password: "old-password" }, (userError) => {
	    			should.not.exist(challengeError);
	    			should.not.exist(userError);

		    		const input = { secret: "some-secret", password: "password" };
		    		agent
		    			.put("localhost:4000/login")
		    			.send(input)
		    			.end((error, response) => {
		    				state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
		    					should.not.exist(error);
		    					should.exist(user);

		    					const expectedUser = { _id: "user-id", password: "password" };
		    					user.should.deep.equal(expectedUser);

		    					done();
		    				})
		    			});
	    		});
	    	});
	    });


	    it("Should delete credential", (done) => {
	    	state.database.collection("Challenges").insert({ _id: "challenge-id", userId: "user-id", secret: "some-secret" }, (challengeError) => {
	    		state.database.collection("Users").insert({ _id: "user-id", password: "old-password" }, (userError) => {
	    			should.not.exist(challengeError);
	    			should.not.exist(userError);

		    		const input = { secret: "some-secret", password: "password" };
		    		agent
		    			.put("localhost:4000/login")
		    			.send(input)
		    			.end((error, response) => {
		    				state.database.collection("Challenges").findOne({ _id: "challenge-id" }, (error, challenge) => {
		    					should.not.exist(error);
		    					should.not.exist(challenge);
		    					done();
		    				})
		    			});
	    		});
	    	});
	    });


    });



});