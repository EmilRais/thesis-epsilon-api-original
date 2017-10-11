const should = require("chai").should();
const agent = require("superagent");

const TestState = require("../source/TestState");

const state = {};
const app = require("../source/Server")(state);
var server = undefined;

describe("CreditCardRouter", () => {

    before((done) => {
        server = app.listen(4000, done);
    });

    beforeEach(() => {
        TestState.infuse(state);
    });

    after((done) => {
        server.close(done);
    });



    describe("POST /credit-cards", () => {
        it("Should fail if input is invalid", (done) => {
            state.validator.validate.creditCardCreationInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
            const input = undefined;
            agent
                .post("localhost:4000/credit-cards")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(400);
                    response.text.should.equal("Input was invalid");
                    done();
                });
        });
        it("Should fail if QuickPay rejects", (done) => {
            state.QuickPay.uploadCreditCard = (creditCard, callback) => { return callback({ message: "Credit card was invalid" }) };
            const input = undefined;
            agent
                .post("localhost:4000/credit-cards")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(400);
                    response.text.should.equal("Error uploading credit card: Credit card was invalid");
                    done();
                });
        });
        it("Should fail if QuickPay does not respond with a link", (done) => {
            state.QuickPay.uploadCreditCard = (creditCard, callback) => { return callback() };
            const input = undefined;
            agent
                .post("localhost:4000/credit-cards")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(500);
                    response.text.should.equal("Credit card link was not received");
                    done();
                });
        });
        it("Should return 201 when succesful", (done) => {
            state.QuickPay.uploadCreditCard = (creditCard, callback) => { return callback(undefined, "credit-card-id" ) };
            const input = undefined;
            agent
                .post("localhost:4000/credit-cards")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(201);
                    done();
                });
        });
        it("Should store credit card link", (done) => {
            state.QuickPay.uploadCreditCard = (creditCard, callback) => { return callback(undefined, creditCard.cardNumber == "100" ? "credit-card-id" : undefined ) };
            state.factory.createId = () => { return "credit-card-id" };
            const input = { "cardNumber": "100"  };
            agent
                .post("localhost:4000/credit-cards")
                .send(input)
                .end((error, response) => {
                    state.database.collection("CreditCards").findOne({ link: "credit-card-id" }, (error, creditCard) => {
                        should.not.exist(error);
                        should.exist(creditCard);

                        const expectedCreditCard = { _id: "credit-card-id", link: "credit-card-id" };
                        creditCard.should.deep.equal(expectedCreditCard);
                        done(); 
                    });
                }); 
        });
        it("Should return credit card link", (done) => {
            state.QuickPay.uploadCreditCard = (creditCard, callback) => { return callback(undefined, creditCard.cardNumber == "100" ? "credit-card-id" : undefined ) };
            const input = { "cardNumber": "100"  };
            agent
                .post("localhost:4000/credit-cards")
                .send(input)
                .end((error, response) => {
                    response.text.should.equal("credit-card-id");
                    done();
                });
        });
    });

    describe("Load credit card suffix: GET /credit-cards/:creditCardId", () => {
        it("Should fail if user is not logged in", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const creditCardId = "abc";
            agent
                .get(`localhost:4000/credit-cards/${creditCardId}`)
                .end((error, response) => {
                    response.text.should.equal("Invalid user credential");
                    response.status.should.equal(401);
                    done();
                });
        });
        it("Should fail if someone else's credit card", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id", creditCard: "abc" }, (userError) => {
                should.not.exist(userError);

                const creditCardId = "abcd";
                agent
                    .get(`localhost:4000/credit-cards/${creditCardId}`)
                    .end((error, response) => {
                        response.text.should.equal("Not allowed to load other people's credit cards");
                        response.status.should.equal(401);
                        done();
                    });
            });
        });
        it("Should load credit card", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.QuickPay.loadCreditCard = (creditCardId, callback) => { return callback(undefined, "1234") };
            state.database.collection("Users").insert({ _id: "user-id", creditCard: "abc" }, (userError) => {
                should.not.exist(userError);

                const creditCardId = "abc";
                agent
                    .get(`localhost:4000/credit-cards/${creditCardId}`)
                    .end((error, response) => {
                        response.body.should.deep.equal({ suffix: "1234" });
                        response.status.should.equal(200);
                        done();
                    });
            });
        });
    });
    describe("Change credit card: PUT /credit-cards/:creditCardId", () => {
        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const creditCardId = "abc";
            agent
                .put(`localhost:4000/credit-cards/${creditCardId}`)
                .end((error, response) => {
                    response.text.should.equal("Invalid user credential");
                    response.status.should.equal(401);
                    done();
                });
        });
        it("Should fail if new credit card is invalid", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.validator.validate.creditCardCreationInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
            state.database.collection("Users").insert({ _id: "user-id", creditCard: "abc" }, (userError) => {
                should.not.exist(userError);

                const creditCardId = "abc";
                agent
                    .put(`localhost:4000/credit-cards/${creditCardId}`)
                    .end((error, response) => {
                        response.text.should.equal("Input was invalid");
                        response.status.should.equal(400);
                        done();
                    });
            });
        });
        it("Should update user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.QuickPay.uploadCreditCard = (creditCard, callback) => { return callback(undefined, "abcd") };
            state.database.collection("Users").insert({ _id: "user-id", creditCard: "abc" }, (userError) => {
                should.not.exist(userError);

                const creditCardId = "abc";
                agent
                    .put(`localhost:4000/credit-cards/${creditCardId}`)
                    .end((error, response) => {
                        state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                            should.not.exist(error);
                            user.should.deep.equal({ _id: "user-id", creditCard: "abcd" });
                            done();
                        });
                    });
            });
        });
        it("Should return user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.QuickPay.uploadCreditCard = (creditCard, callback) => { return callback(undefined, "abcd") };
            state.database.collection("Users").insert({ _id: "user-id", creditCard: "abc" }, (userError) => {
                should.not.exist(userError);

                const creditCardId = "abc";
                agent
                    .put(`localhost:4000/credit-cards/${creditCardId}`)
                    .end((error, response) => {
                        response.body.should.deep.equal({ _id: "user-id", creditCard: "abcd" });
                        response.status.should.equal(200);
                        done();
                    });
            });
        });
    });

});