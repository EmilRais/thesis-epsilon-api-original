const should = require("chai").should();
const agent = require("superagent");

const TestState = require("../source/TestState");
const FacebookApp = require("../source/Configuration").facebook;

const state = {};
const app = require("../source/Server")(state);
var server = undefined;

describe("UserRouter", () => {

    before((done) => {
        server = app.listen(4000, done);
    });

    beforeEach(() => {
        TestState.infuse(state);
    });

    after((done) => {
        server.close(done);
    });



    describe("GET /users/facebook/:facebookUserId/exists", () => {


        it("Should return 204 if user does not exist", (done) => {
            const facebookUserId = "peter1234";
            agent
                .get(`localhost:4000/users/facebook/${facebookUserId}/exists`)
                .end((error, response) => {
                    response.status.should.equal(204);
                    done();
                });
        });


        it("Should tell if user exists", (done) => {
            state.database.collection("Users").insert({ facebookUserId: "peter1234" }, (error) => {
                should.not.exist(error);

                const facebookUserId = "peter1234";
                agent
                    .get(`localhost:4000/users/facebook/${facebookUserId}/exists`)
                    .end((error, response) => {
                        response.status.should.equal(200);
                        response.text.should.equal("User exists");
                        done();
                    });
            });
        });


    });

    describe("Check if logged in: GET /users", () => {
        it("Should return 401 if not logged in", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            agent
                .get("localhost:4000/users")
                .end((error, response) => {
                    response.text.should.equal("Invalid user credential");
                    response.status.should.equal(401);
                    done();
                });
        });
        it("Should return 200 if logged in", (done) => {
            agent
                .get("localhost:4000/users")
                .end((error, response) => {
                    response.text.should.equal("User is logged in");
                    response.status.should.equal(200);
                    done();
                });
        });
    });

    describe("POST /users", () => {


        it("Should fail if invalid input", (done) => {
            state.validator.validate.userCreationInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
            const input = { name: "Peter", email: "stuff@stuff.dk" };
            agent
                .post("localhost:4000/users")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(400);
                    response.text.should.equal("Input was invalid");
                    done();
                });
        });


        it("Should fail if user already exists through email", (done) => {
            state.database.collection("Users").insert({ name: "Anders", email: "stuff@stuff.dk" }, (error) => {
                should.not.exist(error);

                const input = { name: "Peter", email: "stuff@stuff.dk" };
                agent
                    .post("localhost:4000/users")
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(400);
                        response.text.should.equal("User already exists");
                        done();
                    });
            });
        });


        it("Should return 201 when succesful", (done) => {
            const input = { name: "Peter", email: "stuff@stuff.dk", creditCard: "credit-card-link" };
            agent
                .post("localhost:4000/users")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(201);
                    response.text.should.equal("Created the user");
                    done();
                });
        });


        it("Should store the user", (done) => {
            state.factory.createId = () => { return "user-id" };
            const input = { name: "Peter", email: "stuff@stuff.dk", creditCard: "credit-card-link" };
            agent
                .post("localhost:4000/users")
                .send(input)
                .end((error, response) => {
                    state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                        should.not.exist(error);
                        should.exist(user);

                        const expectedUser = { _id: "user-id", email: "stuff@stuff.dk", password: undefined, facebookUserId: undefined, name: "Peter", description: undefined, avatar: undefined, mobile: undefined, ratings: [], creditCard: "credit-card-link", activeDeliverer: true, orders: [], bids: [] };
                        user.should.deep.equal(expectedUser);
                        done();
                    });
                });
        });


        it("Should delete the credit card", (done) => {
            state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (error) => {
                should.not.exist(error);

                state.factory.createId = () => { return "user-id" };
                const input = { name: "Peter", email: "stuff@stuff.dk", creditCard: "credit-card-link" };
                agent
                    .post("localhost:4000/users")
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("CreditCards").findOne({ _id: "credit-card-id" }, (error, creditCard) => {
                            should.not.exist(error);
                            should.not.exist(creditCard);
                            done();
                        });
                    });
            });
        });


    });



    describe("POST /users/facebook", () => {


        it("Should fail if invalid input", (done) => {
            state.validator.validate.facebookUserCreationInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
            const input = {};
            agent
                .post("localhost:4000/users/facebook")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(400);
                    response.text.should.equal("Input was invalid");
                    done();
                });
        });


        it("Should fail if user already exists through facebook user id", (done) => {
            state.database.collection("Users").insert({ facebookUserId: "peter1234" }, (error) => {
                should.not.exist(error);

                const input = { facebook: { facebookUserId: "peter1234" } };
                agent
                    .post("localhost:4000/users/facebook")
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(400);
                        response.text.should.equal("User already exists through facebook user id");
                        done();
                    });
            });
        });


        it("Should fail if invalid facebook data", (done) => {
            state.facebook.validateData = (login, permissions, data) => { return false };
            const input = { facebook: { facebookUserId: "peter1234" } };
            agent
                .post("localhost:4000/users/facebook")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(500);
                    response.text.should.equal("Invalid facebook data");
                    done();
                });
        });


        it("Should fail when no facebook information", (done) => {
            state.database.collection("Users").insert({ email: "stuff@stuff.dk" }, (error) => {
                should.not.exist(error);

                const input = { user: {}, facebook: { facebookUserId: "peter1234" } };
                agent
                    .post("localhost:4000/users/facebook")
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(500);
                        response.text.should.equal("No facebook information");
                        done();
                    });
            });
        });


        it("Should fail if user already exists through email", (done) => {
            state.facebook.extractInformation = (options, callback) => { return callback(undefined, { email: "stuff@stuff.dk" }) };
            state.database.collection("Users").insert({ email: "stuff@stuff.dk" }, (error) => {
                should.not.exist(error);

                state.facebook.loadData = (login, callback) => { return callback(undefined, { email: "stuff@stuff.dk" }) };
                const input = { user: {}, facebook: { facebookUserId: "peter1234" } };
                agent
                    .post("localhost:4000/users/facebook")
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(400);
                        response.text.should.equal("User already exists through email");
                        done();
                    });
            });
        });


        it("Should return 201 when succesful", (done) => {
            state.facebook.extractInformation = (options, callback) => { return callback(undefined, { email: "stuff@stuff.dk", picture: { data: {} } }) };
            const input = { user: { creditCard: "credit-card-link" }, facebook: { facebookUserId: "peter1234" } };
            agent
                .post("localhost:4000/users/facebook")
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(201);
                    response.text.should.equal("Created the user");
                    done();
                });
        });


        it("Should store the avatar", (done) => {
            state.factory.createId = () => { return "id" };
            state.facebook.extractInformation = (options, callback) => { return callback(undefined, { id: "peter1234", email: "stuff@stuff.dk", picture: { data: {} } }) };
            state.imageLoader.loadImage = (url, callback) => { return callback(undefined, "image") };
            const input = { user: { password: "password", name: "Peter", mobile: "12345678", creditCard: "credit-card-link" }, facebook: { facebookUserId: "peter1234" } };
            agent
                .post("localhost:4000/users/facebook")
                .send(input)
                .end((error, response) => {
                    state.database.collection("Images").findOne({ _id: "id" }, (error, image) => {
                        should.not.exist(error);
                        should.exist(image);

                        const expectedImage = { _id: "id", image: "image" };
                        image.should.deep.equal(expectedImage);

                        done();
                    });
                });
        });


        it("Should store the user", (done) => {
            state.factory.createId = () => { return "id" };
            state.facebook.extractInformation = (options, callback) => { return callback(undefined, { id: "peter1234", email: "stuff@stuff.dk", picture: { data: {} } }) };
            const input = { user: { password: "password", name: "Peter", mobile: "12345678", creditCard: "credit-card-link" }, facebook: { facebookUserId: "peter1234" } };
            agent
                .post("localhost:4000/users/facebook")
                .send(input)
                .end((error, response) => {
                    state.database.collection("Users").findOne({ _id: "id" }, (error, user) => {
                        should.not.exist(error);
                        should.exist(user);

                        const expectedUser = { _id: 'id', email: 'stuff@stuff.dk', password: "password", facebookUserId: "peter1234", name: "Peter", description: undefined, avatar: "id", mobile: "12345678", ratings: [], creditCard: "credit-card-link", activeDeliverer: true, orders: [], bids: [] };
                        user.should.deep.equal(expectedUser);
                        done();
                    });
                });
        });


        it("Should delete the credit card", (done) => {
            state.database.collection("CreditCards").insert({ _id: "credit-card-id", link: "credit-card-link" }, (error) => {
                should.not.exist(error);

                state.facebook.extractInformation = (options, callback) => { return callback(undefined, { email: "stuff@stuff.dk", picture: { data: {} } }) };
                const input = { user: { creditCard: "credit-card-link" }, facebook: { facebookUserId: "peter1234" } };
                agent
                    .post("localhost:4000/users/facebook")
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("CreditCards").findOne({ _id: "credit-card-id" }, (error, creditCard) => {
                            should.not.exist(error);
                            should.not.exist(creditCard);
                            done();
                        });
                    });
            });
        });


    });



    describe("GET /users/:userId/bids", () => {


        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const userId = "user-id";
            agent
                .get(`localhost:4000/users/${userId}/bids`)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Invalid user credential");
                    done();
                });
        });


        it("Should fail if bids belong to someone else", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const userId = "some-other-user-id";
            agent
                .get(`localhost:4000/users/${userId}/bids`)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Not allowed to load other users' bids");
                    done();
                });
        });


        it("Should fail if user does not exist", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const userId = "user-id";
            agent
                .get(`localhost:4000/users/${userId}/bids`)
                .end((error, response) => {
                    response.status.should.equal(500);
                    response.text.should.equal("User could not be found");
                    done();
                });
        });


        it("Should return 200 when succesful", (done) => {
            state.database.collection("Users").insert({ _id: "user-id", bids: [] }, (error) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                const userId = "user-id";
                agent
                    .get(`localhost:4000/users/${userId}/bids`)
                    .end((error, response) => {
                        response.status.should.equal(200);
                        done();
                    });
            });
        });


        it("Should return zero bids", (done) => {
            state.database.collection("Users").insert({ _id: "user-id", bids: [] }, (error) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                const userId = "user-id";
                agent
                    .get(`localhost:4000/users/${userId}/bids`)
                    .end((error, response) => {
                        response.body.should.be.empty;
                        done();
                    });
            });
        });


        it("Should return several bids", (done) => {
            state.database.collection("Users").insert({ _id: "user-id", name: "Peter", avatar: "peter-image", description: "Peter's description", ratings: [4, 5], bids: ["a", "b"] }, (userError) => {
                state.database.collection("Bids").insert([{ _id: "a", userId: "user-id" }, { _id: "b", userId: "user-id" }], (bidError) => {
                    should.not.exist(userError);
                    should.not.exist(bidError);

                    state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                    const userId = "user-id";
                    agent
                        .get(`localhost:4000/users/${userId}/bids`)
                        .end((error, response) => {
                            const expectedBids = [
                                { _id: "a", deliverer: { name: "Peter", avatar: "peter-image", description: "Peter's description", ratings: [4, 5] } },
                                { _id: "b", deliverer: { name: "Peter", avatar: "peter-image", description: "Peter's description", ratings: [4, 5] } }
                            ];
                            response.body.should.deep.equal(expectedBids);
                            done();
                        });
                });
            });
        });


    });



    describe("PUT /users/:userId", () => {


        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const input = undefined;
            const userId = "user-id";
            agent
                .put(`localhost:4000/users/${userId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Invalid user credential");
                    done();
                });
        });


        it("Should fail if attempting to modify other user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user2-id" }) };
            const input = undefined;
            const userId = "user-id";
            agent
                .put(`localhost:4000/users/${userId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Not allowed to change other users' profile");
                    done();
                });
        });


        it("Should fail if input is invalid", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.validator.validate.userChangeInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
            const input = undefined;
            const userId = "user-id";
            agent
                .put(`localhost:4000/users/${userId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(400);
                    response.text.should.equal("Input was invalid");
                    done();
                });
        });


        it("Should fail if user does not exist", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const input = undefined;
            const userId = "user-id";
            agent
                .put(`localhost:4000/users/${userId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(500);
                    response.text.should.equal("User could not be found");
                    done();
                });
        });


        it("Should return 200 when succesful", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                should.not.exist(userError);

                const input = {};
                const userId = "user-id";
                agent
                    .put(`localhost:4000/users/${userId}`)
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(200);
                        done();
                    });
            });
        });


        it("Should update the user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                should.not.exist(userError);

                const input = { description: "Description", activeDeliverer: true };
                const userId = "user-id";
                agent
                    .put(`localhost:4000/users/${userId}`)
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                            should.not.exist(error);
                            should.exist(user);

                            const expectedUser = { _id: "user-id", description: "Description", activeDeliverer: true };
                            user.should.deep.equal(expectedUser);
                            done();
                        });
                    });
            });
        });


        it("Should return the updated user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                should.not.exist(userError);

                const input = { description: "Description", activeDeliverer: true };
                const userId = "user-id";
                agent
                    .put(`localhost:4000/users/${userId}`)
                    .send(input)
                    .end((error, response) => {
                        const expectedUser = { _id: "user-id", description: "Description", activeDeliverer: true };
                        response.body.should.deep.equal(expectedUser);
                        done();
                    });
            });
        });


    });



    describe("PUT /users/:userId/avatar", () => {


        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const input = undefined;
            const userId = "user-id";
            agent
                .put(`localhost:4000/users/${userId}/avatar`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Invalid user credential");
                    done();
                });
        });


        it("Should fail if attempting to modify other user's avatar", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const input = undefined;
            const userId = "user2-id";
            agent
                .put(`localhost:4000/users/${userId}/avatar`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Not allowed to change other users' avatar");
                    done();
                });
        });


        it("Should fail if input is invalid", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.validator.validate.userAvatarChangeInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
            const input = undefined;
            const userId = "user-id";
            agent
                .put(`localhost:4000/users/${userId}/avatar`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(400);
                    response.text.should.equal("Input was invalid");
                    done();
                });
        });


        it("Should fail if user does not exist", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const input = undefined;
            const userId = "user-id";
            agent
                .put(`localhost:4000/users/${userId}/avatar`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(500);
                    response.text.should.equal("Existing user could not be found");
                    done();
                });
        });


        it("Should return 200 when succesful", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id", avatar: undefined }, (userError) => {
                should.not.exist(userError);

                const input = {};
                const userId = "user-id";
                agent
                    .put(`localhost:4000/users/${userId}/avatar`)
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(200);
                        done();
                    });
            });
        });


        it("Should store image", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.factory.createId = () => { return "image-id" };
            state.database.collection("Users").insert({ _id: "user-id", avatar: undefined }, (userError) => {
                should.not.exist(userError);

                const input = { image: "image-data" };
                const userId = "user-id";
                agent
                    .put(`localhost:4000/users/${userId}/avatar`)
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("Images").findOne({ _id: "image-id" }, (error, image) => {
                            should.not.exist(error);
                            should.exist(image);

                            const expectedImage = { _id: "image-id", image: "image-data" };
                            image.should.deep.equal(expectedImage);
                            done();
                        });
                    });
            });
        });


        it("Should update user's avatar", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.factory.createId = () => { return "image-id" };
            state.database.collection("Users").insert({ _id: "user-id", avatar: undefined }, (userError) => {
                should.not.exist(userError);

                const input = { image: "image-data" };
                const userId = "user-id";
                agent
                    .put(`localhost:4000/users/${userId}/avatar`)
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                            should.not.exist(error);
                            should.exist(user);

                            const expectedUser = { _id: "user-id", avatar: "image-id" };
                            user.should.deep.equal(expectedUser);
                            done();
                        });
                    });
            });
        });


        it("Should remove old avatar if exists", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.factory.createId = () => { return "image-id" };
            state.database.collection("Users").insert({ _id: "user-id", avatar: "old-avatar-id" }, (userError) => {
                state.database.collection("Images").insert({ _id: "old-avatar-id" }, (imageError) => {
                    should.not.exist(userError);
                    should.not.exist(imageError);

                    const input = { image: "image-data" };
                    const userId = "user-id";
                    agent
                        .put(`localhost:4000/users/${userId}/avatar`)
                        .send(input)
                        .end((error, response) => {
                            state.database.collection("Images").findOne({ _id: "old-avatar-id" }, (error, image) => {
                                should.not.exist(error);
                                should.not.exist(image);
                                done();
                            });
                        });
                });
            });
        });
        

        it("Should return updated user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.factory.createId = () => { return "image-id" };
            state.database.collection("Users").insert({ _id: "user-id", avatar: undefined }, (userError) => {
                should.not.exist(userError);

                const input = { image: "image-data" };
                const userId = "user-id";
                agent
                    .put(`localhost:4000/users/${userId}/avatar`)
                    .send(input)
                    .end((error, response) => {
                        const expectedUser = { _id: "user-id", avatar: "image-id" };
                        response.body.should.deep.equal(expectedUser);
                        done();
                    });
            });
        });
    });
    describe("Delete a user: DELETE /users/:userId", () => {
        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const userId = "user-id";
            agent
                .delete(`localhost:4000/users/${userId}`)
                .end((error, response) => {
                    response.text.should.equal("Invalid user credential");
                    response.status.should.equal(401);
                    done();
                });
        });
        it("Should fail if trying to delete someone else", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const userId = "other-user-id";
            agent
                .delete(`localhost:4000/users/${userId}`)
                .end((error, response) => {
                    response.text.should.equal("Not allowed to delete other users");
                    response.status.should.equal(401);
                    done();
                });
        });
        it("Should remove user's bids from their respective orders", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-1"] }, (userError) => {
                state.database.collection("Orders").insert({ _id: "order-1", bids: ["bid-1"] }, (orderError) => {
                    should.not.exist(userError);
                    should.not.exist(orderError);

                    const userId = "user-id";
                    agent
                        .delete(`localhost:4000/users/${userId}`)
                        .end((error, response) => {
                            state.database.collection("Orders").findOne({ _id: "order-1" }, (error, order) => {
                                should.not.exist(error);

                                const expectedOrder = { _id: "order-1", bids: [] };
                                order.should.deep.equal(expectedOrder);
                                done();
                            });
                        });
                });
            });
        });
        it("Should delete user's bids", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-1"] }, (userError) => {
                state.database.collection("Orders").insert({ _id: "order-1", bids: ["bid-1"] }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-1" }, (bidError) => {
                        should.not.exist(userError);
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        const userId = "user-id";
                        agent
                            .delete(`localhost:4000/users/${userId}`)
                            .end((error, response) => {
                                state.database.collection("Bids").findOne({ _id: "bid-1" }, (error, bid) => {
                                    should.not.exist(error);
                                    should.not.exist(bid);
                                    done();
                                });
                            });
                    });
                });
            });
        });
        it("Should remove bids on user's orders from their respective users", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-2"], bids: ["bid-1"] }, { _id: "user-2", bids: ["bid-3"] }], (userError) => {
                state.database.collection("Orders").insert([{ _id: "order-1", bids: ["bid-1"] }, { _id: "order-2", bids: ["bid-3"] }], (orderError) => {
                    state.database.collection("Bids").insert([{ _id: "bid-1" }, { _id: "bid-3" }], (bidError) => {
                        should.not.exist(userError);
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        const userId = "user-id";
                        agent
                            .delete(`localhost:4000/users/${userId}`)
                            .end((error, response) => {
                                state.database.collection("Users").findOne({ _id: "user-2" }, (error, user) => {
                                    should.not.exist(error);
                                    
                                    const expectedUser = { _id: "user-2", bids: [] };
                                    user.should.deep.equal(expectedUser);

                                    done();
                                });
                            });
                    });
                });
            });
        });
        it("Should delete bids on user's orders", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-2"], bids: ["bid-1"] }, { _id: "user-2", bids: ["bid-3"] }], (userError) => {
                state.database.collection("Orders").insert([{ _id: "order-1", bids: ["bid-1"] }, { _id: "order-2", bids: ["bid-3"] }], (orderError) => {
                    state.database.collection("Bids").insert([{ _id: "bid-1" }, { _id: "bid-3" }], (bidError) => {
                        should.not.exist(userError);
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        const userId = "user-id";
                        agent
                            .delete(`localhost:4000/users/${userId}`)
                            .end((error, response) => {
                                state.database.collection("Bids").findOne({ _id: "bid-3" }, (error, bid) => {
                                    should.not.exist(error);
                                    should.not.exist(bid);
                                    done();
                                });
                            });
                    });
                });
            });
        });
        it("Should delete user's orders", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-2"], bids: ["bid-1"] }, { _id: "user-2", bids: ["bid-3"] }], (userError) => {
                state.database.collection("Orders").insert([{ _id: "order-1", bids: ["bid-1"] }, { _id: "order-2", bids: ["bid-3"] }], (orderError) => {
                    state.database.collection("Bids").insert([{ _id: "bid-1" }, { _id: "bid-3" }], (bidError) => {
                        should.not.exist(userError);
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        const userId = "user-id";
                        agent
                            .delete(`localhost:4000/users/${userId}`)
                            .end((error, response) => {
                                state.database.collection("Orders").findOne({ _id: "order-2" }, (error, order) => {
                                    should.not.exist(error);
                                    should.not.exist(order);
                                    done();
                                });
                            });
                    });
                });
            });
        });
        it("Should delete user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-2"], bids: ["bid-1"] }, { _id: "user-2", bids: ["bid-3"] }], (userError) => {
                state.database.collection("Orders").insert([{ _id: "order-1", bids: ["bid-1"] }, { _id: "order-2", bids: ["bid-3"] }], (orderError) => {
                    state.database.collection("Bids").insert([{ _id: "bid-1" }, { _id: "bid-3" }], (bidError) => {
                        should.not.exist(userError);
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        const userId = "user-id";
                        agent
                            .delete(`localhost:4000/users/${userId}`)
                            .end((error, response) => {
                                state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                                    should.not.exist(error);
                                    should.not.exist(user);
                                    done();
                                });
                            });
                    });
                });
            });
        });
        it("Should return 200", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-2"], bids: ["bid-1"] }, { _id: "user-2", bids: ["bid-3"] }], (userError) => {
                state.database.collection("Orders").insert([{ _id: "order-1", bids: ["bid-1"] }, { _id: "order-2", bids: ["bid-3"] }], (orderError) => {
                    state.database.collection("Bids").insert([{ _id: "bid-1" }, { _id: "bid-3" }], (bidError) => {
                        should.not.exist(userError);
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        const userId = "user-id";
                        agent
                            .delete(`localhost:4000/users/${userId}`)
                            .end((error, response) => {
                                response.text.should.equal("Deleted the user");
                                response.status.should.equal(200);
                                done();
                            });
                    });
                });
            });
        });
    });



});
