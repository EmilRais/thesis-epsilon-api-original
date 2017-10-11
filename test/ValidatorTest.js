const should = require("chai").should();
const TestState = require("../source/TestState");
const Validator = require("../source/utilities/Validator");

const state = {};
const validator = new Validator(state);

describe("Validator", () => {


	beforeEach(() => {
		TestState.infuse(state);
	});



	describe("validate.color", () => {


		it("Should fail if no color", (done) => {
			const color = undefined;
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("No color");
				done();
			});
		});


		it("Should fail when missing required fields", (done) => {
			const color = { r: 200, g: 155, b: 180 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Does not specify exactly the required fields");
				done();
			});
		});


		it("Should fail when unknown fields are specified", (done) => {
			const color = { r: 200, g: 155, b: 180, a: 0.5, unknown: "value" };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Does not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if red is not a number", (done) => {
			const color = { r: "200", g: 155, b: 180, a: 0.5 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Red was not a number");
				done();
			});
		});


		it("Should fail if red is invalid", (done) => {
			const color = { r: 256, g: 155, b: 180, a: 0.5 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Red was invalid");
				done();
			});
		});


		it("Should fail if green is not a number", (done) => {
			const color = { r: 200, g: "155", b: 180, a: 0.5 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Green was not a number");
				done();
			});
		});


		it("Should fail if green is invalid", (done) => {
			const color = { r: 200, g: -155, b: 180, a: 0.5 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Green was invalid");
				done();
			});
		});


		it("Should fail if blue is not a number", (done) => {
			const color = { r: 200, g: 155, b: "180", a: 0.5 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Blue was not a number");
				done();
			});
		});


		it("Should fail if blue is invalid", (done) => {
			const color = { r: 200, g: 155, b: 1180, a: 0.5 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Blue was invalid");
				done();
			});
		});


		it("Should fail if alpha is not a number", (done) => {
			const color = { r: 200, g: 155, b: 180, a: "0.5" };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Alpha was not a number");
				done();
			});
		});


		it("Should fail if alpha is invalid", (done) => {
			const color = { r: 200, g: 155, b: 180, a: 1.5 };
			validator.validate.color(color, (error) => {
				should.exist(error);
				error.message.should.equal("Alpha was invalid");
				done();
			});
		});


		it("Should succeed if valid color", (done) => {
			const color = { r: 200, g: 155, b: 180, a: 0.5 };
			validator.validate.color(color, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.password", () => {


		it("Should reject if password is not a string", (done) => {
			validator.validate.password(12345, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject if password is shorter than 5 characters", (done) => {
			validator.validate.password("1234", (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject if password is longer than 32 characters", (done) => {
			validator.validate.password("123456789012345678901234567890123", (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should accept if password is exactly 5 characters long", (done) => {
			validator.validate.password("doges", (result) => {
				result.should.be.true;
				done();
			});
		});


		it("Should accept if password is exactly 32 characters long", (done) => {
			validator.validate.password("12345678901234567890123456789012", (result) => {
				result.should.be.true;
				done();
			});
		});


		it("Should accept if password is between 5 and 32 characters long", (done) => {
			validator.validate.password("monkeydonkey", (result) => {
				result.should.be.true;
				done();
			});
		});


	});



	describe("validate.secret", () => {


		it("Should fail if secret is not a string", (done) => {
			const secret = 1234;
			validator.validate.secret(secret, (error) => {
				should.exist(error);
				error.message.should.equal("Secret was not a string");
				done();
			});
		});


		it("Should fail if secret is not 6 characters long", (done) => {
			const secret = "abc12";
			validator.validate.secret(secret, (error) => {
				should.exist(error);
				error.message.should.equal("Secret was not 6 characters long");
				done();
			});
		});


		it("Should fail when challenge is failed", (done) => {
			const secret = "abc123";
			validator.validate.secret(secret, (error) => {
				should.exist(error);
				error.message.should.equal("Challenge failed");
				done();
			});
		});


		it("Should fail when challenge is expired", (done) => {
			state.validator.validate.notPastDeadline = (date, deadline, callback) => { return callback(false) };
			state.database.collection("Challenges").insert({ secret: "abc123", expires: 1000 }, (error) => {
				should.not.exist(error);

				const secret = "abc123";
				validator.validate.secret(secret, (error) => {
					should.exist(error);
					error.message.should.equal("Challenge has expired");
					done();
				});
			});
		});


		it("Should succeed if challenge is matched", (done) => {
			state.database.collection("Challenges").insert({ secret: "abc123", expires: 1000 }, (error) => {
				should.not.exist(error);

				const secret = "abc123";
				validator.validate.secret(secret, (error) => {
					should.not.exist(error);
					done();
				});
			});
		});


	});



	describe("validate.phoneNumber", () => {


		it("Should fail if not a string", (done) => {
			const phone = 12345678;
			validator.validate.phoneNumber(phone, (error) => {
				should.exist(error);
				error.message.should.equal("Phone number was not a string");
				done();
			});
		});


		it("Should fail if not 8 characters long", (done) => {
			const phone = "123456789";
			validator.validate.phoneNumber(phone, (error) => {
				should.exist(error);
				error.message.should.equal("Phone number was not 8 characters long");
				done();
			});
		});


		it("Should fail if contains non-digits", (done) => {
			const phone = "1234567h";
			validator.validate.phoneNumber(phone, (error) => {
				should.exist(error);
				error.message.should.equal("Phone number contains invalid characters");
				done();
			});
		});


		it("Should accept if valid phone number", (done) => {
			const phone = "12345678";
			validator.validate.phoneNumber(phone, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.email", () => {


		it("Should reject email if not a string", (done) => {
			validator.validate.email(333333, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject email if nothing on the left side of @", (done) => {
			validator.validate.email("@developer.dk", (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject email if nothing on the right side of @", (done) => {
			validator.validate.email("developer@", (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject email if missing domain or global top level domain", (done) => {
			validator.validate.email("developer@com", (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should accept valid email", (done) => {
			validator.validate.email("support@developer.dk", (result) => {
				result.should.be.true;
				done();
			});
		});

	});



	describe("validate.image", () => {


		it("Should reject image if not of type string", (done) => {
			validator.validate.image(12345, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject image if empty", (done) => {
			validator.validate.image("", (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should accept image if valid", (done) => {
			validator.validate.image("valid-image", (result) => {
				result.should.be.true;
				done();
			});
		});


	});



	describe("validate.notPastDeadline", () => {


		it("Should reject if no date", (done) => {
			const date = undefined;
			const deadline = new Date(1000);
			validator.validate.notPastDeadline(date, deadline, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject if no deadline", (done) => {
			const date = new Date(500);
			const deadline = undefined;
			validator.validate.notPastDeadline(date, deadline, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject if date is not a date", (done) => {
			const date = 500;
			const deadline = new Date(1000);
			validator.validate.notPastDeadline(date, deadline, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject if deadline is not a date", (done) => {
			const date = new Date(500);
			const deadline = 1000;
			validator.validate.notPastDeadline(date, deadline, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should reject if past deadline", (done) => {
			const date = new Date(1001);
			const deadline = new Date(1000);
			validator.validate.notPastDeadline(date, deadline, (result) => {
				result.should.be.false;
				done();
			});
		});


		it("Should accept if on deadline", (done) => {
			const date = new Date(1000);
			const deadline = new Date(1000);
			validator.validate.notPastDeadline(date, deadline, (result) => {
				result.should.be.true;
				done();
			});
		});


		it("Should accept if before deadline", (done) => {
			const date = new Date(999);
			const deadline = new Date(1000);
			validator.validate.notPastDeadline(date, deadline, (result) => {
				result.should.be.true;
				done();
			});
		});


	});



	describe("validate.userCreationInput", () => {


		it("Should reject if no input", (done) => {
			const input = undefined;
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should reject if not specifying all required fields", (done) => {
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", creditCard: {} };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if specifying unrecognised fields", (done) => {
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: {}, avatar: "image" };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if name is not a string", (done) => {
			const input = { name: 507, email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: {} };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'name' was not a string");
				done();
			});
		});


		it("Should reject if name is the empty string", (done) => {
			const input = { name: "", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: {} };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'name' was the empty string");
				done();
			});
		});


		it("Should reject if name is too long", (done) => {
			const input = { name: "This is a name of 33 characters. ", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: {} };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'name' was too long");
				done();
			});
		});


		it("Should reject if invalid email", (done) => {
			state.validator.validate.email = (email, callback) => { return callback(false) };
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: {} };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'email' was invalid");
				done();
			});
		});


		it("Should reject if invalid phone number", (done) => {
			state.validator.validate.phoneNumber = (phone, callback) => { return callback({ error: "Invalid phone number" }) };
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: {} };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'mobile' was invalid");
				done();
			});
		});


		it("Should reject if invalid password", (done) => {
			state.validator.validate.password = (password, callback) => { return callback(false) };
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: {} };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'password' was invalid");
				done();
			});
		});


		it("Should reject if credit card is not a string", (done) => {
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: 200 };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'creditCard' was not a string");
				done();
			});
		});


		it("Should reject if credit card does not exist", (done) => {
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
			validator.validate.userCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Credit card could not be found");
				done();
			});
		});


		it("Should accept if credit card is undefined", (done) => {
			const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password" };
			validator.validate.userCreationInput(input, (error) => {
				console.log(error);
				should.not.exist(error);
				done();
			});
		});


		it("Should accept if input is valid", (done) => {
			state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (error) => {
				should.not.exist(error);

				const input = { name: "Peter", email: "stuff@stuff.dk", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
				validator.validate.userCreationInput(input, (error) => {
					should.not.exist(error);
					done();
				});
			});
		});


	});



	describe("validate.facebookUserCreationInput", () => {


		it("Should reject if no input", (done) => {
			const input = undefined;
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should reject if not specifying all the required fields", (done) => {
			const user = {};
			const facebook = {};
			const input = { user: user };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if specifying unrecognised fields", (done) => {
			const user = {};
			const facebook = {};
			const input = { user: user, facebook: facebook, order: undefined };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if no user input", (done) => {
			const user = undefined;
			const facebook = {};
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user' had no value");
				done();
			});
		});


		it("Should reject if not specifying all required user fields", (done) => {
			const user = { name: "Peter", mobile: "12345678", password: "password" };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user' did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if specifying unrecognised user fields", (done) => {
			const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: {}, avatar: "image" };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user' did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if user's name is not a string", (done) => {
			const user = { name: 507, mobile: "12345678", password: "password", creditCard: {} };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user.name' was not a string");
				done();
			});
		});


		it("Should reject if name is the empty string", (done) => {
			const user = { name: "", mobile: "12345678", password: "password", creditCard: {} };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user.name' was the empty string");
				done();
			});
		});


		it("Should reject if name is too long", (done) => {
			const user = { name: "This is a name of 33 characters. ", mobile: "12345678", password: "password", creditCard: {} };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user.name' was too long");
				done();
			});
		});


		it("Should reject if invalid phone number", (done) => {
			state.validator.validate.phoneNumber = (phone, callback) => { return callback({ error: "Invalid phone number" }) };
			const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: {} };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user.mobile' was invalid");
				done();
			});
		});


		it("Should reject if invalid password", (done) => {
			state.validator.validate.password = (password, callback) => { return callback(false) };
			const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: {} };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user.password' was invalid");
				done();
			});
		});


		it("Should reject if credit card is not a string", (done) => {
			const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: 152 };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'user.creditCard' was not a string");
				done();
			});
		});


		it("Should reject if credit card does not exist", (done) => {
			const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Credit card could not be found");
				done();
			});
		});


		it("Should accept if credit card is undefined", (done) => {
			const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: undefined };
			const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
			const input = { user: user, facebook: facebook };
			validator.validate.facebookUserCreationInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


		it("Should reject if no facebook input", (done) => {
			state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (creditCardError) => {
				should.not.exist(creditCardError);

				const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
				const facebook = undefined;
				const input = { user: user, facebook: facebook };
				validator.validate.facebookUserCreationInput(input, (error) => {
					should.exist(error);
					error.message.should.equal("'facebook' had no value");
					done();
				});
			});
		});


		it("Should reject if facebook user id is not a string", (done) => {
			state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (creditCardError) => {
				should.not.exist(creditCardError);

				const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
				const facebook = { facebookUserId: 1234, facebookToken: "abcd1234" };
				const input = { user: user, facebook: facebook };
				validator.validate.facebookUserCreationInput(input, (error) => {
					should.exist(error);
					error.message.should.equal("'facebook.facebookUserId' was not a string");
					done();
				});
			});
		});


		it("Should reject if facebook user id is the empty string", (done) => {
			state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (creditCardError) => {
				should.not.exist(creditCardError);

				const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
				const facebook = { facebookUserId: "", facebookToken: "abcd1234" };
				const input = { user: user, facebook: facebook };
				validator.validate.facebookUserCreationInput(input, (error) => {
					should.exist(error);
					error.message.should.equal("'facebook.facebookUserId' was the empty string");
					done();
				});
			});
		});


		it("Should reject if facebook token is not a string", (done) => {
			state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (creditCardError) => {
				should.not.exist(creditCardError);

				const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
				const facebook = { facebookUserId: "peter1234", facebookToken: 1234 };
				const input = { user: user, facebook: facebook };
				validator.validate.facebookUserCreationInput(input, (error) => {
					should.exist(error);
					error.message.should.equal("'facebook.facebookToken' was not a string");
					done();
				});
			});
		});


		it("Should reject if facebook token is the empty string", (done) => {
			state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (creditCardError) => {
				should.not.exist(creditCardError);

				const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
				const facebook = { facebookUserId: "peter1234", facebookToken: "" };
				const input = { user: user, facebook: facebook };
				validator.validate.facebookUserCreationInput(input, (error) => {
					should.exist(error);
					error.message.should.equal("'facebook.facebookToken' was the empty string");
					done();
				});
			});
		});


		it("Should accept if input is valid", (done) => {
			state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (creditCardError) => {
				should.not.exist(creditCardError);

				const user = { name: "Peter", mobile: "12345678", password: "password", creditCard: "credit-card-link" };
				const facebook = { facebookUserId: "peter1234", facebookToken: "abcd1234" };
				const input = { user: user, facebook: facebook };
				validator.validate.facebookUserCreationInput(input, (error) => {
					should.not.exist(error);
					done();
				});
			});
		});


	});



	describe("validate.passwordLogin", () => {


		it("Should reject if no login", (done) => {
			const login = undefined;
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("No login");
				done();
			});
		});


		it("Should reject if not specifying exactly the required fields", (done) => {
			const login = { email: "stuff@stuff.dk", password: "password", device: undefined, blank: "stuff" };
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if email is not a string", (done) => {
			const login = { email: undefined, password: "password", device: undefined };
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("'email' was not a string");
				done();
			});
		});


		it("Should reject if password is not a string", (done) => {
			const login = { email: "stuff@stuff.dk", password: undefined, device: undefined };
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("'password' was not a string");
				done();
			});
		});


		it("Should reject if device does not specify exactly the required fields", (done) => {
			const login = { email: "stuff@stuff.dk", password: "password", device: { token: "token", type: "Development", blank: "stuff" } };
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("'device' did not specify exactly the required fields");
				done();
			});
		});


		it("Should reject if device token is not a string", (done) => {
			const login = { email: "stuff@stuff.dk", password: "password", device: { token: 123512, type: "Development" } };
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("'device.token' was not a string");
				done();
			});
		});


		it("Should reject if unknown device type", (done) => {
			const login = { email: "stuff@stuff.dk", password: "password", device: { token: "token", type: "Testing" } };
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("'device.type' was not recognised");
				done();
			});
		});


		it("Should reject if no user exists with email", (done) => {
			const login = { email: "stuff@stuff.dk", password: "password", device: undefined };
			validator.validate.passwordLogin(login, (error) => {
				should.exist(error);
				error.message.should.equal("'email' was not in use");
				done();
			});
		});


		it("Should reject if passwords do not match", (done) => {
			state.database.collection("Users").insert({ email: "stuff@stuff.dk", password: "1234" }, (error) => {
				should.not.exist(error);

				const login = { email: "stuff@stuff.dk", password: "password", device: undefined };
				validator.validate.passwordLogin(login, (error) => {
					should.exist(error);
					error.message.should.equal("Passwords do not match");
					done();
				});
			});
		});


		it("Should accept if passwords do match", (done) => {
			state.database.collection("Users").insert({ email: "stuff@stuff.dk", password: "password" }, (error) => {
				should.not.exist(error);

				const login = { email: "stuff@stuff.dk", password: "password", device: undefined };
				validator.validate.passwordLogin(login, (error) => {
					should.not.exist(error);
					done();
				});
			});
		});


	});



	describe("validate.facebookLogin", () => {


		it("Should fail if no login", (done) => {
			const login = undefined;
			const requiredPermissions = undefined;
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("No login");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: undefined, blank: "stuff"  };
			const requiredPermissions = undefined;
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if not specifying permissions in an array", (done) => {
			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: undefined };
			const requiredPermissions = "public_profile";
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("Permissions were not specified in an array");
				done();
			});
		});


		it("Should fail if device does not specify exactly the required fields", (done) => {
			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: { token: "abcdabcd", type: "Development", blank: "stuff" } };
			const requiredPermissions = ["public_profile"];
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("'device' did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if device token is not a string", (done) => {
			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: { token: 123812, type: "Development" } };
			const requiredPermissions = ["public_profile"];
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("'device.token' was not a string");
				done();
			});
		});


		it("Should fail if device type is not recognised", (done) => {
			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: { token: "abcdabcd", type: "Testing" } };
			const requiredPermissions = ["public_profile"];
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("'device.type' was not recognised");
				done();
			});
		});


		it("Should fail if fails loading data", (done) => {
			state.facebook.loadData = (login, callback) => { return callback({ message: "Failed loading data" }) };

			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: undefined };
			const requiredPermissions = ["public_profile"];
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("Failed loading data");
				done();
			});
		});


		it("Should fail if invalid login", (done) => {
			state.facebook.validateData = (login, requiredPermissions, data) => { return false };
			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: undefined };
			const requiredPermissions = ["public_profile"];
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.exist(error);
				error.message.should.equal("Invalid login");
				done();
			});
		});


		it("Should succeed if valid login", (done) => {
			const login = { facebookUserId: "peter1234", facebookToken: "abcd1234", device: undefined };
			const requiredPermissions = ["public_profile"];
			validator.validate.facebookLogin(login, requiredPermissions, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.userCredential", () => {


		it("Should fail if no credential", (done) => {
			const credential = undefined;
			validator.validate.userCredential(credential, (error) => {
				should.exist(error);
				error.message.should.equal("No credential");
				done();
			});
		});


		it("Should fail if not specifying all required fields", (done) => {
			const credential = { _id: "credential-id", userId: "user-id", role: "User" };
			validator.validate.userCredential(credential, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if specifying unrecognised fields", (done) => {
			const credential = { _id: "credential-id", userId: "user-id", role: "User", expires: 1000, secret: "doge" };
			validator.validate.userCredential(credential, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if expiration date is not a number", (done) => {
			const credential = { _id: "credential-id", userId: "user-id", role: "User", expires: "1000" };
			validator.validate.userCredential(credential, (error) => {
				should.exist(error);
				error.message.should.equal("'expires' was not a number");
				done();
			});
		});


		it("Should fail if not a user credential", (done) => {
			const credential = { _id: "credential-id", userId: "user-id", role: "Admin", expires: 1000 };
			validator.validate.userCredential(credential, (error) => {
				should.exist(error);
				error.message.should.equal("Credential was not a user credential");
				done();
			});
		});


		it("Should fail if past its deadline", (done) => {
			state.validator.validate.notPastDeadline = (date, deadline, callback) => { return callback(false) };
			const credential = { _id: "credential-id", userId: "user-id", role: "User", expires: 1000 };
			validator.validate.userCredential(credential, (error) => {
				should.exist(error);
				error.message.should.equal("Credential was past its deadline");
				done();
			});
		});


		it("Should fail if user does not exist", (done) => {
			state.validator.validate.userExists = (id, callback) => { return callback({ message: "User could not be found" }) };
			const credential = { _id: "credential-id", userId: "user-id", role: "User", expires: 1000 };
			validator.validate.userCredential(credential, (error) => {
				should.exist(error);
				error.message.should.equal("User could not be found");
				done();
			});
		});


		it("Should succeed if valid credential", (done) => {
			const credential = { _id: "credential-id", userId: "user-id", role: "User", expires: 1000 };
			validator.validate.userCredential(credential, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});


	describe("validate.address", () => {


		it("Should fail if no address", (done) => {
			const address = undefined;
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("No address");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const address = { name: "Street", blank: "", coordinate: { latitude: 12, longitude: 24 } };
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if name is not a string", (done) => {
			const address = { name: 508, coordinate: { latitude: 12, longitude: 24 } };
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("'name' was not a string");
				done();
			});
		});


		it("Should fail if no coordinate", (done) => {
			const address = { name: "Street", coordinate: undefined };
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("'coordinate' had no value");
				done();
			});
		});


		it("Should fail if latitude is not a number", (done) => {
			const address = { name: "Street", coordinate: { latitude: "12", longitude: 24 } };
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("'coordinate.latitude' was not a number");
				done();
			});
		});


		it("Should fail if latitude is invalid", (done) => {
			const address = { name: "Street", coordinate: { latitude: 120, longitude: 24 } };
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("'coordinate.latitude' was invalid");
				done();
			});
		});


		it("Should fail if longitude is not a number", (done) => {
			const address = { name: "Street", coordinate: { latitude: 12, longitude: "24" } };
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("'coordinate.longitude' was not a number");
				done();
			});
		});


		it("Should fail if longitude is invalid", (done) => {
			const address = { name: "Street", coordinate: { latitude: 12, longitude: -240 } };
			validator.validate.address(address, (error) => {
				should.exist(error);
				error.message.should.equal("'coordinate.longitude' was invalid");
				done();
			});
		});
		

		it("Should succeed if address is valid", (done) => {
			const address = { name: "Street", coordinate: { latitude: 12, longitude: 24 } };
			validator.validate.address(address, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.userCredentialHeader", () => {
		

		it("Should fail if no header", (done) => {
			const header = undefined;
			validator.validate.userCredentialHeader(header, (error) => {
				should.exist(error);
				error.message.should.equal("No header");
				done();
			});
		});


		it("Should fail if malformed header", (done) => {
			const header = "malformed";
			validator.validate.userCredentialHeader(header, (error) => {
				should.exist(error);
				error.message.should.equal("Malformed header");
				done();
			});
		});


		it("Should fail if not specifying all required fields", (done) => {
			const header = JSON.stringify({});
			validator.validate.userCredentialHeader(header, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if specifying unrecognised fields", (done) => {
			const header = JSON.stringify({ token: "token1234", secret: "1234" });
			validator.validate.userCredentialHeader(header, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if invalid credential", (done) => {
			state.validator.validate.userCredential = (credential, callback) => { return callback({ message: "Invalid user credential" }) };
			const header = JSON.stringify({ token: "token1234" });
			validator.validate.userCredentialHeader(header, (error) => {
				should.exist(error);
				error.message.should.equal("Invalid user credential");
				done();
			});
		});


		it("Should succeed if valid credential", (done) => {
			const header = JSON.stringify({ token: "token1234" });
			validator.validate.userCredentialHeader(header, (error) => {
				should.not.exist(error);
				done();
			});
		});


		it("Should return credential", (done) => {
			state.database.collection("Credentials").insert({ _id: "token1234", userId: "user-id", role: "User", expires: 1000 }, (error) => {
				should.not.exist(error);

				const header = JSON.stringify({ token: "token1234" });
				validator.validate.userCredentialHeader(header, (error, credential) => {
					should.exist(credential);

					const expectedCredential = { _id: "token1234", userId: "user-id", role: "User", expires: 1000 };
					credential.should.deep.equal(expectedCredential);
					done();
				});
			});
		});


	});



	describe("validate.userExists", () => {


		it("Should reject if no id", (done) => {
			validator.validate.userExists(undefined, (error) => {
				should.exist(error);
				error.message.should.equal("No id");
				done();
			});
		});


		it("Should reject if user does not exist", (done) => {
			validator.validate.userExists("user-id", (error) => {
				should.exist(error);
				error.message.should.equal("User could not be found");
				done();
			});
		});


		it("Should accept if user exists", (done) => {
			const user = { _id: "user-id" };
			state.database.collection("Users").insert(user, (error) => {
				should.not.exist(error);

				validator.validate.userExists("user-id", (userError) => {
					should.not.exist(userError);
					done();
				});
			});
		});


	});



	describe("validate.orderCreationInput", () => {
		

		it("Should fail if no input", (done) => {
			const input = undefined;
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if input does not specify exactly the required fields", (done) => {
			const input = { description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if expensive is not a boolean", (done) => {
			const input = { expensive: "false", description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'expensive' was not a boolean");
				done();
			});
		});


		it("Should fail if description is not a string", (done) => {
			const input = { expensive: false, description: 508, paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'description' was not a string");
				done();
			});
		});


		it("Should fail if description is the empty string", (done) => {
			const input = { expensive: false, description: "", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'description' was the empty string");
				done();
			});
		});


		it("Should fail if description is too long", (done) => {
			const input = { expensive: false, description: "This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 characters. This is a long description of 501 charact", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'description' was too long");
				done();
			});
		});


		it("Should fail if payment type is not a string", (done) => {
			const input = { expensive: false, description: "Description", paymentType: 25, cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'paymentType' was not a string");
				done();
			});
		});


		it("Should fail if unrecognised payment type", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Loan", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'paymentType' was not recognised");
				done();
			});
		});


		it("Should fail if cost is not a number", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: "100", deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cost' was not a number");
				done();
			});
		});


		it("Should fail if cost is negative", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: -100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cost' was negative");
				done();
			});
		});


		it("Should fail if delivery price is not a number", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: "50", deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryPrice' was not a number");
				done();
			});
		});


		it("Should fail if delivery price is negative", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: -50, deliveryTime: { earliest: 300, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryPrice' was negative");
				done();
			});
		});


		it("Should fail if delivery time does not specify exactly the required fields", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, perhaps: "stuff", latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryTime' did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if earliest delivery time is not a number", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: "300", latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryTime.earliest' was not a number");
				done();
			});
		});


		it("Should fail if latest delivery time is not a number", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 300, latest: "400" }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryTime.latest' was not a number");
				done();
			});
		});


		it("Should fail if earliest delivery time is later than latest delivery time", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 500, latest: 400 }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryTime.earliest' was later than 'deliveryTime.latest'");
				done();
			});
		});


		it("Should fail if delivery interval is less than 15 minutes", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 500, latest: 499 + (1000 * 60 * 15)  }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryTime' was less than a 15 minute interval");
				done();
			});
		});


		it("Should fail if invalid delivery address", (done) => {
			state.validator.validate.address = (address, callback) => { return callback(address.name == "Matas" ? { message: "Invalid address" } : undefined) };
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 500, latest: 500 + (1000 * 60 * 15) }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryAddress' was invalid");
				done();
			});
		});


		it("Should fail if invalid pickup address", (done) => {
			state.validator.validate.address = (address, callback) => { return callback(address.name == "Home" ? { message: "Invalid address" } : undefined) };
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 500, latest: 500 + (1000 * 60 * 15) }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'pickupAddress' was invalid");
				done();
			});
		});
		

		it("Should succeed if everything is valid", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: { earliest: 500, latest: 500 + (1000 * 60 * 15) }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


		it("Should be valid to specify no cost: already paid for", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: undefined, deliveryPrice: 50, deliveryTime: { earliest: 500, latest: 500 + (1000 * 60 * 15) }, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


		it("Should be valid to specify no delivery time: as soon as possible", (done) => {
			const input = { expensive: false, description: "Description", paymentType: "Cash", cost: 100, deliveryPrice: 50, deliveryTime: undefined, deliveryAddress: { name: "Matas", coordinate: { latitude: 12, longitude: 24 } }, pickupAddress: { name: "Home", coordinate: { latitude: 36, longitude: 48 } } };
			validator.validate.orderCreationInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});


	
	describe("validate.bidCreationInput", () => {


		it("Should fail if no order id", (done) => {
			const orderId = undefined;
			const userId = undefined;
			const input = undefined;
			validator.validate.bidCreationInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("No order id");
				done();
			});
		});


		it("Should fail if no user id", (done) => {
			const orderId = "order-id";
			const userId = undefined;
			const input = undefined;
			validator.validate.bidCreationInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("No user id");
				done();
			});
		});


		it("Should fail if no input", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = undefined;
			validator.validate.bidCreationInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { deliveryPrice: 20, deliveryTime: 1000, blank: "stuff" };
			validator.validate.bidCreationInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});
		

		it("Should fail if delivery price is not a number", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { deliveryPrice: "20", deliveryTime: 1000 };
			validator.validate.bidCreationInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryPrice' was not a number");
				done();
			});
		});
		

		it("Should fail if delivery price is negative", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { deliveryPrice: -20, deliveryTime: 1000 };
			validator.validate.bidCreationInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("'deliveryPrice' was negative");
				done();
			});
		});


		it("Should fail if user already bid on order", (done) => {
			state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id", orderId: "order-id" }, (error) => {
				const orderId = "order-id";
				const userId = "user-id";
				const input = { deliveryPrice: 20, deliveryTime: 1000 };
				validator.validate.bidCreationInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("User had already bid on order");
					done();
				});
			});
		});


		it("Should fail if user does not exist", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { deliveryPrice: 20, deliveryTime: 1000 };
			validator.validate.bidCreationInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("User could not be found");
				done();
			});
		});


		it("Should fail if bidding on own order", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { deliveryPrice: 20, deliveryTime: 1000 };
				validator.validate.bidCreationInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Users cannot bid on their own orders");
					done();
				});
			});
		});


		it("Should fail if exceeding 2 active bids", (done) => {
			state.calendar.now = () => { return new Date(400) };
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (userError) => {
				state.database.collection("Bids").insert([
					{ _id: "bid-1-id", userId: "user-id", scheduledDeliveryTime: 500 },
					{ _id: "bid-id-2", userId: "user-id", scheduledDeliveryTime: 800 }
				], (bidError) => {
					should.not.exist(userError);
					should.not.exist(bidError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { deliveryPrice: 20, deliveryTime: 1000 };
					validator.validate.bidCreationInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("User has already got two active bids");
						done();
					});
				});
			});
		});


		it("Should fail if order does not exist", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { deliveryPrice: 20, deliveryTime: 1000 };
				validator.validate.bidCreationInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Order could not be found");
					done();
				});
			});
		});


		it("Should fail if order is not pending", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", deliveryTime: { earliest: 1000, latest: 1000 } }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { deliveryPrice: 20, deliveryTime: "1000" };
					validator.validate.bidCreationInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("Order was not in a pending state");
						done();
					});
				});
			});
		});
		

		it("Should fail if delivery time is not a number", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", state: "Pending", deliveryTime: { earliest: 1000, latest: 1000 } }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { deliveryPrice: 20, deliveryTime: "1000" };
					validator.validate.bidCreationInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("'deliveryTime' was not a number");
						done();
					});
				});
			});
		});
		

		it("Should fail if delivery time is too early", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", state: "Pending", deliveryTime: { earliest: 1001, latest: 1000 } }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { deliveryPrice: 20, deliveryTime: 1000 };
					validator.validate.bidCreationInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("'deliveryTime' is too early");
						done();
					});
				});
			});
		});


		it("Should fail if delivery time is too late", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", state: "Pending", deliveryTime: { earliest: 1000, latest: 999 } }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { deliveryPrice: 20, deliveryTime: 1000 };
					validator.validate.bidCreationInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("'deliveryTime' is too late");
						done();
					});
				});
			});
		});
		

		it("Should succeed if everything is valid", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", state: "Pending", deliveryTime: { earliest: 1000, latest: 1000 } }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { deliveryPrice: 20, deliveryTime: 1000 };
					validator.validate.bidCreationInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed if no delivery time", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", state: "Pending", delivertime: undefined }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { deliveryPrice: 20, deliveryTime: 1000 };
					validator.validate.bidCreationInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


	});



	describe("validate.orderChangeInput", () => {


		it("Should fail if no order id", (done) => {
			const orderId = undefined;
			const userId = undefined;
			const input = undefined;
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("No order id");
				done();
			});
		});


		it("Should fail if no user id", (done) => {
			const orderId = "order-id";
			const userId = undefined;
			const input = undefined;
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("No user id");
				done();
			});
		});


		it("Should fail if no input", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = undefined;
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if unrecognised action", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Delete" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("'action' was not recognised");
				done();
			});
		});


		it("Should fail accepting if not specifying exactly the required fields", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Accept", bidId: "150", blank: "stuff" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error accepting order: Did not specify exactly the required fields to accept");
				done();
			});
		});


		it("Should fail accepting if bid id is not a string", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Accept", bidId: 150 };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error accepting order: 'bidId' was not a string");
				done();
			});
		});


		it("Should fail accepting if user does not exist", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Accept", bidId: "bid-id" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error accepting order: User was not the owner of the order");
				done();
			});
		});


		it("Should fail accepting if user is not the owner", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Accept", bidId: "bid-id" };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error accepting order: User was not the owner of the order");
					done();
				});
			});
		});


		it("Should fail accepting if order does not exist", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Accept", bidId: "bid-id" };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error accepting order: Order did not contain bid");
					done();
				});
			});
		});


		it("Should fail accepting if order does not contain bid", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", bids: [] }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Accept", bidId: "bid-id" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("Error accepting order: Order did not contain bid");
						done();
					});
				});
			});
		});


		it("Should fail accepting if order is not in a pending state", (done) => {
			state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
				state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id"] }, (orderError) => {
					should.not.exist(userError);
					should.not.exist(orderError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Accept", bidId: "bid-id" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("Error accepting order: Order was not in the pending state");
						done();
					});
				});
			});
		});


		it("Should fail cancelling if not specifying exactly the required fields", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Cancel", blank: "stuff" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error cancelling order: Did not specify exactly the required fields to cancel");
				done();
			});
		});


		it("Should fail cancelling if order does not exist", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Cancel" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error cancelling order: Order could not be found");
				done();
			});
		});


		it("Should fail cancelling an order not in the accepted state", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Pending" }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Cancel" };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error cancelling order: Order was not in the accepted state");
					done();
				});
			});
		});


		it("Should fail cancelling if user does not exist", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id" }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Cancel" };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error cancelling order: User was not the winner of the order");
					done();
				});
			});
		});


		it("Should fail cancelling if user was not the winner of the owner", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: [] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Cancel" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("Error cancelling order: User was not the winner of the order");
						done();
					});
				});
			});
		});


		it("Should fail starting if not specifying exactly the required fields", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Start", blank: "stuff" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error starting order: Did not specify exactly the required fields to start");
				done();
			});
		});


		it("Should fail starting if order does not exist", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Start" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error starting order: Order could not be found");
				done();
			});
		});


		it("Should fail starting an order not in the accepted state", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Pending" }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Start" };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error starting order: Order was not in the accepted state");
					done();
				});
			});
		});


		it("Should fail starting if user does not exist", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id" }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Start" };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error starting order: User was not the winner of the order");
					done();
				});
			});
		});


		it("Should fail starting if user was not the winner of the owner", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: [] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Start" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("Error starting order: User was not the winner of the order");
						done();
					});
				});
			});
		});


		it("Should fail receiving if not specifying exactly the required fields", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Receive", rating: 3, blank: "stuff" };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error receiving order: Did not specify exactly the required fields to receive");
				done();
			});
		});


		it("Should fail receiving if invalid rating", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Receive", rating: 3.1 };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error receiving order: 'rating' was invalid");
				done();
			});
		});


		it("Should fail receiving if order does not exist", (done) => {
			const orderId = "order-id";
			const userId = "user-id";
			const input = { action: "Receive", rating: 3 };
			validator.validate.orderChangeInput(orderId, userId, input, (error) => {
				should.exist(error);
				error.message.should.equal("Error receiving order: Order could not be found");
				done();
			});
		});


		it("Should fail receiving an order not in the started, picked up, or delivered state", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Pending" }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Receive", rating: 3 };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error receiving order: Order was in neither the started, picked up, or delivered state");
					done();
				});
			});
		});


		it("Should fail receiving if user does not exist", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Started", acceptedBid: "bid-id" }, (error) => {
				should.not.exist(error);

				const orderId = "order-id";
				const userId = "user-id";
				const input = { action: "Receive", rating: 3 };
				validator.validate.orderChangeInput(orderId, userId, input, (error) => {
					should.exist(error);
					error.message.should.equal("Error receiving order: User was not the owner of the order");
					done();
				});
			});
		});


		it("Should fail receiving if user was not the owner of the order", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Started", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: [] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Receive", rating: 3 };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.exist(error);
						error.message.should.equal("Error receiving order: User was not the owner of the order");
						done();
					});
				});
			});
		});


		it("Should succeed accepting if input is valid and order pending", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id"], state: "Pending" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Accept", bidId: "bid-id" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed cancelling if input is valid and order accepted", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Cancel" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed starting if input is valid and order accepted", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Start" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed picking up if input is valid and order started", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Started", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "PickUp" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed delivering if input is valid and order started", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Started", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Deliver" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed delivering if input is valid and order picked up", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "PickedUp", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Deliver" };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed receiving if not rating", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Started", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Receive", rating: undefined };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed receiving if input is valid and order started", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Started", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Receive", rating: 3 };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed receiving if input is valid and order picked up", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "PickedUp", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Receive", rating: 3 };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


		it("Should succeed receiving if input is valid and order delivered", (done) => {
			state.database.collection("Orders").insert({ _id: "order-id", state: "Delivered", acceptedBid: "bid-id" }, (orderError) => {
				state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
					should.not.exist(orderError);
					should.not.exist(userError);

					const orderId = "order-id";
					const userId = "user-id";
					const input = { action: "Receive", rating: 3 };
					validator.validate.orderChangeInput(orderId, userId, input, (error) => {
						should.not.exist(error);
						done();
					});
				});
			});
		});


	});



	describe("validate.userChangeInput", () => {


		it("Should fail if no input", (done) => {
			const input = undefined;
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});
		it("Should fail if input has no fields", (done) => {
			const input = {};
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No fields specified");
				done();
			});
		});
		it("Should fail if input specifies unknown fields", (done) => {
			const input = { blank: "stuff" };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Unknown fields specified");
				done();
			});
		});
		it("Should fail if name is not a string", (done) => {
			const input = { name: 200 };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'name' was not a string");
				done();
			});
		});
		it("Should fail if name is too long", (done) => {
			const input = { name: "Name that is longer than 32 characters" };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'name' was too long");
				done();
			});
		});
		it("Should fail if mobile is invalid", (done) => {
			state.validator.validate.phoneNumber = (input, callback) => { return callback({ message: "Invalid phone number" }) };
			const input = { mobile: "1234" };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'mobile' was invalid");
				done();
			});
		});
		it("Should fail if description is not a string", (done) => {
			const input = { description: 500 };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'description' was not a string");
				done();
			});
		});
		it("Should fail if description is too long", (done) => {
			const input = { description: "This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 chracters. This is a long description of 1001 " };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'description' was too long");
				done();
			});
		});
		it("Should fail if active deliverer is not a boolean", (done) => {
			const input = { activeDeliverer: "false" };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'activeDeliverer' was not a boolean");
				done();
			});
		});
		it("Should fail if specifying valid and invalid field", (done) => {
			const input = { description: "Description", activeDeliverer: "false" };
			validator.validate.userChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'activeDeliverer' was not a boolean");
				done();
			});
		});


		it("Should succeed if description is valid", (done) => {
			const input = { description: "Description" };
			validator.validate.userChangeInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});

		it("Should succeed if active deliverer is valid", (done) => {
			const input = { activeDeliverer: true };
			validator.validate.userChangeInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


		it("Should succeed if specifying several valid fields", (done) => {
			const input = { description: "Description", activeDeliverer: true };
			validator.validate.userChangeInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.userAvatarChangeInput", () => {


		it("Should fail if no input", (done) => {
			const input = undefined;
			validator.validate.userAvatarChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const input = { image: "image", blank: "stuff" };
			validator.validate.userAvatarChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if image is invalid", (done) => {
			state.validator.validate.image = (image, callback) => { return callback(false) };
			const input = { image: "image" };
			validator.validate.userAvatarChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'image' was invalid");
				done();
			});
		});


		it("Should succeed if input is valid", (done) => {
			const input = { image: "image" };
			validator.validate.userAvatarChangeInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.loginChallengeCreationInput", () => {


		it("Should fail if no input", (done) => {
			const input = undefined;
			validator.validate.loginChallengeCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const input = { email: "stuff@stuff.dk", blank: "stuff" };
			validator.validate.loginChallengeCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if email is invalid", (done) => {
			state.validator.validate.email = (email, callback) => { return callback(false) };
			const input = { email: "stuff@stuff.dk" };
			validator.validate.loginChallengeCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'email' was invalid");
				done();
			});
		});


		it("Should succeed if valid input", (done) => {
			const input = { email: "stuff@stuff.dk" };
			validator.validate.loginChallengeCreationInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.loginChallengeVerificationInput", () => {


		it("Should fail if no input", (done) => {
			const input = undefined;
			validator.validate.loginChallengeVerificationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const input = { secret: "some-secret", blank: "stuff" };
			validator.validate.loginChallengeVerificationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if challenge fails", (done) => {
			state.validator.validate.secret = (secret, callback) => { return callback({ message: "Challenge failed" }) };
			const input = { secret: "some-secret" };
			validator.validate.loginChallengeVerificationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Challenge failed");
				done();
			});
		});


		it("Should fail if challenge is matched", (done) => {
			const input = { secret: "some-secret" };
			validator.validate.loginChallengeVerificationInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.loginChangeInput", () => {


		it("Should fail if no input", (done) => {
			const input = undefined;
			validator.validate.loginChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const input = { secret: "some-secret", password: "password", blank: "stuff" };
			validator.validate.loginChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if secret is invalid", (done) => {
			state.validator.validate.secret = (secret, callback) => { return callback({ message: "Secret was invalid" }) };
			const input = { secret: "some-secret", password: "password" };
			validator.validate.loginChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Secret was invalid");
				done();
			});
		});


		it("Should fail if password is invalid", (done) => {
			state.validator.validate.password = (password, callback) => { return callback(false) };
			const input = { secret: "some-secret", password: "password" };
			validator.validate.loginChangeInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Password was invalid");
				done();
			});
		});


		it("Should succeed if input is valid", (done) => {
			const input = { secret: "some-secret", password: "password" };
			validator.validate.loginChangeInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});


	});



	describe("validate.creditCardCreationInput", (done) => {


		it("Should fail if no input", (done) => {
			const input = undefined;
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("No input");
				done();
			});
		});


		it("Should fail if not specifying exactly the required fields", (done) => {
			const input = { cardNumber: "1234567890123456", month: "04", year: "17", cvc: "130", blank: "stuff" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Did not specify exactly the required fields");
				done();
			});
		});


		it("Should fail if credit card number is not a string", (done) => {
			const input = { cardNumber: 1234567890123456, month: "04", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cardNumber' was not a string");
				done();
			});
		});


		it("Should fail if credit card number is not 16 characters long", (done) => {
			const input = { cardNumber: "12345678901234567", month: "04", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cardNumber' was not 16 characters long");
				done();
			});
		});


		it("Should fail if credit card number is not number parsable", (done) => {
			const input = { cardNumber: "123456789012345a", month: "04", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cardNumber' contained invalid characters");
				done();
			});
		});


		it("Should fail if credit card month is not a string", (done) => {
			const input = { cardNumber: "1234567890123456", month: 04, year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'month' was not a string");
				done();
			});
		});


		it("Should fail if credit card month is not 2 characters long", (done) => {
			const input = { cardNumber: "1234567890123456", month: "001", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'month' was not 2 characters long");
				done();
			});
		});


		it("Should fail if credit card month is not number parsable", (done) => {
			const input = { cardNumber: "1234567890123456", month: "a1", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'month' contained invalid characters");
				done();
			});
		});


		it("Should fail if credit card month is not between 1 and 12", (done) => {
			const input = { cardNumber: "1234567890123456", month: "13", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'month' was invalid");
				done();
			});
		});


		it("Should fail if credit card year is not a string", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: 17, cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'year' was not a string");
				done();
			});
		});


		it("Should fail if credit card year is not 2 characters long", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: "017", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'year' was not 2 characters long");
				done();
			});
		});


		it("Should fail if credit card year is not number parsable", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: "1d", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'year' contained invalid characters");
				done();
			});
		});


		it("Should fail if credit card validation code is not a string", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: "17", cvc: 130 };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cvc' was not a string");
				done();
			});
		});


		it("Should fail if credit card validation code is not 3 characters long", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: "17", cvc: "1300" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cvc' was not 3 characters long");
				done();
			});
		});


		it("Should fail if credit card validation code is not number parsable", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: "17", cvc: "13d" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("'cvc' contained invalid characters");
				done();
			});
		});


		it("Should fail if credit card expired in another year", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: "15", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Credit card expired");
				done();
			});
		});


		xit("Should fail if credit card expired in current year", (done) => {
			const input = { cardNumber: "1234567890123456", month: "01", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.exist(error);
				error.message.should.equal("Credit card expired recently");
				done();
			});
		});


		it("Should succeed if input is valid", (done) => {
			const input = { cardNumber: "1234567890123456", month: "11", year: "17", cvc: "130" };
			validator.validate.creditCardCreationInput(input, (error) => {
				should.not.exist(error);
				done();
			});
		});
	});



});
