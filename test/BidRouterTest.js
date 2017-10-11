const should = require("chai").should();
const agent = require("superagent");

const TestState = require("../source/TestState");

const state = {};
const app = require("../source/Server")(state);
var server = undefined;

describe("BidRouter", () => {

    before((done) => {
        server = app.listen(4000, done);
    });

    beforeEach(() => {
        TestState.infuse(state);
    });

    after((done) => {
        server.close(done);
    });



    describe("POST /bids/:orderId", () => {
        

        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const input = undefined;
            const orderId = "order-id";
            agent
                .post(`localhost:4000/bids/${orderId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Invalid user credential");
                    done();
                });
        });


        it("Should fail if input is invalid", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.validator.validate.bidCreationInput = (orderId, userId, input, callback) => { return callback({ message: "Input was invalid" }) };
            const input = undefined;
            const orderId = "order-id";
            agent
                .post(`localhost:4000/bids/${orderId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(400);
                    response.text.should.equal("Input was invalid");
                    done();
                });
        });


        it("Should return 201 when succesful", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const input = undefined;
            const orderId = "order-id";
            agent
                .post(`localhost:4000/bids/${orderId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(201);
                    response.text.should.equal("Created the bid");
                    done();
                });
        });


        it("Should store bid", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.factory.createId = () => { return "bid-id" };
            const input = { deliveryPrice: 100, deliveryTime: 500 };
            const orderId = "order-id";
            agent
                .post(`localhost:4000/bids/${orderId}`)
                .send(input)
                .end((error, response) => {
                    state.database.collection("Bids").findOne({ _id: "bid-id" }, (error, bid) => {
                        should.not.exist(error);
                        should.exist(bid);

                        const expectedBid = { _id: 'bid-id', orderId: 'order-id', userId: 'user-id', deliveryPrice: 100, deliveryTime: 500 };
                        bid.should.deep.equal(expectedBid);
                        done();
                    });
                });
        });


        it("Should update order", (done) => {
            state.database.collection("Orders").insert({ _id: "order-id", bids: [] }, (error) => {
                should.not.exist(error);

                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.factory.createId = () => { return "bid-id" };
                const input = { deliveryPrice: 100, deliveryTime: 500 };
                const orderId = "order-id";
                agent
                    .post(`localhost:4000/bids/${orderId}`)
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                            should.not.exist(error);
                            should.exist(order);

                            order.bids.should.include("bid-id");
                            done();
                        });
                    });
            });
        });


        it("Should update user", (done) => {
            state.database.collection("Users").insert({ _id: "user-id", bids: [] }, (error) => {
                should.not.exist(error);

                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.factory.createId = () => { return "bid-id" };
                const input = { deliveryPrice: 100, deliveryTime: 500 };
                const orderId = "order-id";
                agent
                    .post(`localhost:4000/bids/${orderId}`)
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                            should.not.exist(error);
                            should.exist(user);

                            user.bids.should.include("bid-id");
                            done();
                        });
                    });
            });
        });


        it("Should notify the receiver about new bids", (done) => {
            state.database.collection("Orders").insert({ _id: "order-id", bids: [] }, (orderError) => {
                state.database.collection("Users").insert([{ _id: "receiver-id", orders: ["order-id"] }, { _id: "user-id", name: "Peter Hansen" } ], (userError) => {
                    should.not.exist(orderError);
                    should.not.exist(userError);

                    state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                    state.factory.createId = () => { return "bid-id" };
                    const input = { deliveryPrice: 100, deliveryTime: 500 };
                    const orderId = "order-id";
                    agent
                        .post(`localhost:4000/bids/${orderId}`)
                        .send(input)
                        .end((error, response) => {
                            state.Notification.orders[0].should.deep.equal({ _id: "order-id", bids: ["bid-id"] });
                            state.Notification.bids[0].should.deep.equal({ _id: "bid-id", orderId: "order-id", userId: "user-id", deliveryPrice: 100, deliveryTime: 500, deliverer: { name: "Peter Hansen", avatar: undefined, description: undefined, mobile: undefined, ratings: undefined } });
                            state.Notification.users[0].should.deep.equal({ _id: "receiver-id", orders: ["order-id"] });
                            done();
                        });
                });
            });
        });


    });

    describe("Load specific bid: GET /bids/bid/:bidId", () => {
        it("Should fail if bid does not exist", (done) => {
            agent
                .get("localhost:4000/bids/bid/bid-id")
                .end((error, response) => {
                    response.text.should.equal("Bid could not be found");
                    response.status.should.equal(404);
                    done();
                });
        });
        it("Should fail if deliverer does not exist", (done) => {
            state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                should.not.exist(bidError);

                agent
                    .get("localhost:4000/bids/bid/bid-id")
                    .end((error, response) => {
                        response.text.should.equal("Deliverer could not be found");
                        response.status.should.equal(500);
                        done();
                    });
            });
        });
        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
                    should.not.exist(bidError);
                    should.not.exist(userError);

                    agent
                        .get("localhost:4000/bids/bid/bid-id")
                        .end((error, response) => {
                            response.text.should.equal("Invalid user credential");
                            response.status.should.equal(401);
                            done();
                        });
                });
            });
        });
        it("Should return bid", (done) => {
            state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                state.database.collection("Users").insert({ _id: "user-id", name: "Peter Hansen", mobile: "11223344", bids: ["bid-id"] }, (userError) => {
                    should.not.exist(bidError);
                    should.not.exist(userError);

                    agent
                        .get("localhost:4000/bids/bid/bid-id")
                        .end((error, response) => {
                            const expectedBid = { _id: "bid-id", deliverer: { name: "Peter Hansen", mobile: "11223344" } };
                            response.body.should.deep.equal(expectedBid);
                            response.status.should.equal(200);
                            done();
                        });
                });
            });
        });
    });

    describe("GET /bids/:orderId", () => {
        

        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            const orderId = "order-id";
            agent
                .get(`localhost:4000/bids/${orderId}`)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Invalid user credential");
                    done();
                });
        });


        it("Should fail if user does not own the order", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            const orderId = "order-id";
            agent
                .get(`localhost:4000/bids/${orderId}`)
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("User does not own the order");
                    done();
                });
        });


        it("Should fail if order does not exist", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (error) => {
                should.not.exist(error);

                const orderId = "order-id";
                agent
                    .get(`localhost:4000/bids/${orderId}`)
                    .end((error, response) => {
                        response.status.should.equal(400);
                        response.text.should.equal("Order could not be found");
                        done();
                    });
            });
        });


        it("Should return 200 when succesful", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: [] }, (orderError) => {
                    should.not.exist(userError);
                    should.not.exist(orderError);

                    const orderId = "order-id";
                    agent
                        .get(`localhost:4000/bids/${orderId}`)
                        .end((error, response) => {
                            response.status.should.equal(200);
                            done();
                        });
                });
            });
        });


        it("Should return zero bids", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: [] }, (orderError) => {
                    should.not.exist(userError);
                    should.not.exist(orderError);

                    const orderId = "order-id";
                    agent
                        .get(`localhost:4000/bids/${orderId}`)
                        .end((error, response) => {
                            response.body.should.deep.equal([]);
                            done();
                        });
                });
            });
        });


        it("Should return several bids", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-id"] }, { _id: "user1-id", name: "Peter", avatar: "peter-image", description: "Peter's description", ratings: [4, 5] }, { _id: "user2-id", name: "Maria", avatar: "maria-image", ratings: [5] }], (userError) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["a", "b"] }, (orderError) => {
                    state.database.collection("Bids").insert([{ _id: "a", userId: "user1-id" }, { _id: "b", userId: "user2-id" }], (bidError) => {
                        should.not.exist(userError);
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        const orderId = "order-id";
                        agent
                            .get(`localhost:4000/bids/${orderId}`)
                            .end((error, response) => {
                                const expectedBids = [
                                    { _id: "a", deliverer: { name: "Peter", avatar: "peter-image", description: "Peter's description", ratings: [4, 5] } },
                                    { _id: "b", deliverer: { name: "Maria", avatar: "maria-image", ratings: [5] } }
                                ];
                                response.body.should.deep.equal(expectedBids);
                                done();
                            });
                    });
                });
            });
        });


    });



});