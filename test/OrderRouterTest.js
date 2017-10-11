const should = require("chai").should();
const agent = require("superagent");

const Configuration = require("../source/Configuration");
const TestState = require("../source/TestState");

const state = {};
const app = require("../source/Server")(state);
var server = undefined;

describe("OrderRouter", () => {

    before((done) => {
        server = app.listen(4000, done);
    });

    beforeEach(() => {
        TestState.infuse(state);
    });

    after((done) => {
        server.close(done);
    });



    describe("POST /orders", () => {
    	

    	it("Should fail if not logged in as user", (done) => {
    		state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
    		const input = undefined;
    		agent
    			.post("localhost:4000/orders")
    			.send(input)
    			.end((error, response) => {
    				response.status.should.equal(401);
    				response.text.should.equal("Invalid user credential");
    				done();
    			});
    	});


	    it("Should fail if invalid input", (done) => {
	    	state.validator.validate.orderCreationInput = (input, callback) => { return callback({ message: "Input was invalid" }) };
	    	const input = undefined;
    		agent
    			.post("localhost:4000/orders")
    			.send(input)
    			.end((error, response) => {
    				response.status.should.equal(400);
    				response.text.should.equal("Input was invalid");
    				done();
    			});
	    });


	    it("Should return 201 if succesful", (done) => {
	    	state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
	    	const input = {};
    		agent
    			.post("localhost:4000/orders")
    			.send(input)
    			.end((error, response) => {
    				response.status.should.equal(201);
    				response.text.should.equal("Created the order");
    				done();
    			});
	    });


	    it("Should store order", (done) => {
	    	state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
	    	state.factory.createOrder = (input) => { return { _id: "order-id", description: "Description" } };
	    	const input = {};
    		agent
    			.post("localhost:4000/orders")
    			.send(input)
    			.end((error, response) => {
    				state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
    					should.not.exist(error);
    					should.exist(order);

    					const expectedOrder = { _id: "order-id", description: "Description" };
    					order.should.deep.equal(expectedOrder);
    					done();
    				});
    			});
	    });


	    it("Should update user", (done) => {
	    	state.database.collection("Users").insert({ _id: "user-id", orders: [] }, (error) => {
	    		should.not.exist(error);

	    		state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
		    	state.factory.createShortId = () => { return "order-id" };
		    	const input = {};
	    		agent
	    			.post("localhost:4000/orders")
	    			.send(input)
	    			.end((error, response) => {
	    				state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
	    					should.not.exist(error);
	    					should.exist(user);

	    					const expectedUser = { _id: "user-id", orders: ["order-id"] };
	    					user.should.deep.equal(expectedUser);
	    					done();
	    				});
	    			});
	    	});
	    });


        it("Should notify all active deliverers except order owner about the new order", (done) => {
            state.database.collection("Users").insert([{ _id: "user-id", orders: [], activeDeliverer: true }, { _id: "user2-id", activeDeliverer: true }, { _id: "user3-id", activeDeliverer: false }], (error) => {
                should.not.exist(error);

                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.factory.createId = () => { return "order-id" };
                const input = { description: "Description" };
                agent
                    .post("localhost:4000/orders")
                    .send(input)
                    .end((error, response) => {
                        state.Notification.orders[0].description.should.equal("Description");
                        state.Notification.users.should.deep.equal([
                            { _id: "user2-id", activeDeliverer: true }
                        ]);
                        done();
                    });
            });
        });


    });



    describe("GET /orders", () => {
        

        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            agent
                .get("localhost:4000/orders")
                .end((error, response) => {
                    response.status.should.equal(401);
                    response.text.should.equal("Invalid user credential");
                    done();
                });
        });


        it("Should fail when user does not exist", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            agent
                .get("localhost:4000/orders")
                .end((error, response) => {
                    response.status.should.equal(500);
                    response.text.should.equal("User could not be found");
                    done();
                });
        });


        it("Should fail when receiver does not exist", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }); };
            state.database.collection("Users").insert({ _id: "user-id", name: "Peter", mobile: "87654321", bids: ["bid-id"] }, (userError) => {
                state.database.collection("Orders").insert([{ _id: "a", acceptedBid: "bid-id" }, { _id: "b" }], (orderError) => {
                    should.not.exist(userError);
                    should.not.exist(orderError);

                    agent
                        .get("localhost:4000/orders")
                        .end((error, response) => {
                            response.status.should.equal(500);
                            response.text.should.equal("Receiver could not be found");
                            done();
                        });
                });
            });
        });


        it("Should return 200 when succesful", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }); };
            state.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                should.not.exist(userError);

                agent
                    .get("localhost:4000/orders")
                    .end((error, response) => {
                        response.status.should.equal(200);
                        done();
                    });
            });
        });


        it("Should return zero orders", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }); };
            state.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                should.not.exist(userError);

                agent
                    .get("localhost:4000/orders")
                    .end((error, response) => {
                        response.body.should.be.empty;
                        done();
                    });
            });
        });


        it("Should only add receiver if winner", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }); };
            state.database.collection("Users").insert([{ _id: "receiver-id", name: "Anders", mobile: "12345678", orders: ["a"] }, { _id: "user-id", name: "Peter", mobile: "87654321", bids: ["bid-id"] }], (userError) => {
                state.database.collection("Orders").insert([{ _id: "a", acceptedBid: "bid-id" }, { _id: "b" }], (orderError) => {
                    should.not.exist(userError);
                    should.not.exist(orderError);

                    agent
                        .get("localhost:4000/orders")
                        .end((error, response) => {
                            const expectedOrders = [{ _id: "a", acceptedBid: "bid-id", receiver: { name: "Anders", mobile: "12345678" }  }, { _id: "b" }];
                            response.body.should.deep.equal(expectedOrders);
                            done();
                        });
                });
            });
        });


        it("Should return several orders", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }); };
            state.database.collection("Users").insert({ _id: "user-id", bids: [] }, (userError) => {
                state.database.collection("Orders").insert([{ _id: "a" }, { _id: "b" }], (orderError) => {
                    should.not.exist(userError);
                    should.not.exist(orderError);

                    agent
                        .get("localhost:4000/orders")
                        .end((error, response) => {
                            const expectedOrders = [{ _id: "a" }, { _id: "b" }];
                            response.body.should.deep.equal(expectedOrders);
                            done();
                        });
                });
            });
        });

        
    });

    describe("Load a specific order: GET /orders/:orderId", () => {
        it("Should fail if order does not exist", (done) => {
            agent
                .get("localhost:4000/orders/order-id")
                .end((error, response) => {
                    response.text.should.equal("Order could not be found");
                    response.status.should.equal(404);
                    done();
                });
        });
        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            state.database.collection("Orders").insert({ _id: "order-id" }, (error) => {
                should.not.exist(error);

                agent
                    .get("localhost:4000/orders/order-id")
                    .end((error, response) => {
                        response.text.should.equal("Invalid user credential");
                        response.status.should.equal(401);
                        done();
                    });
            });
        });
        it("Should fail if user does not exist", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Orders").insert({ _id: "order-id" }, (error) => {
                should.not.exist(error);

                agent
                    .get("localhost:4000/orders/order-id")
                    .end((error, response) => {
                        response.text.should.equal("User could not be found");
                        response.status.should.equal(500);
                        done();
                    });
            });
        });
        it("Should return order without its receiver if user is not the winner", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "winner-id" }, (orderError) => {
                state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
                    should.not.exist(orderError);
                    should.not.exist(userError);

                    agent
                        .get("localhost:4000/orders/order-id")
                        .end((error, response) => {
                            const expectedOrder = { _id: "order-id", acceptedBid: "winner-id" };
                            response.body.should.deep.equal(expectedOrder);
                            response.status.should.equal(200);
                            done();
                        });
                });
            });
        });
        it("Should return order with its receiver if user is the winner", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                state.database.collection("Users").insert([{ _id: "user-id", bids: ["bid-id"] }, { _id: "receiver-id", name: "Peter", orders: ["order-id"] }], (userError) => {
                    should.not.exist(orderError);
                    should.not.exist(userError);

                    agent
                        .get("localhost:4000/orders/order-id")
                        .end((error, response) => {
                            const expectedOrder = { _id: "order-id", acceptedBid: "bid-id", receiver: { name: "Peter" } };
                            response.body.should.deep.equal(expectedOrder);
                            response.status.should.equal(200);
                            done();
                        });
                });
            });
        });
    });

    describe("PUT /orders/:orderId", () => {

        it("Should fail if order does not exist", (done) => {
            const input = {};
            const orderId = "order-id";
            agent
                .put(`localhost:4000/orders/${orderId}`)
                .send(input)
                .end((error, response) => {
                    response.status.should.equal(404);
                    response.text.should.equal("Order could not be found");
                    done();
                });
        });

        it("Should fail if not logged in as user", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
            state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                should.not.exist(orderError);

                const input = {};
                const orderId = "order-id";
                agent
                    .put(`localhost:4000/orders/${orderId}`)
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(401);
                        response.text.should.equal("Invalid user credential");
                        done();
                    });
            });
        });


        it("Should fail if invalid input", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.validator.validate.orderChangeInput = (orderId, userId, input, callback) => { return callback({ message: "Input was invalid" }) };
            state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                should.not.exist(orderError);

                const input = {};
                const orderId = "order-id";
                agent
                    .put(`localhost:4000/orders/${orderId}`)
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(400);
                        response.text.should.equal("Input was invalid");
                        done();
                    });
            });
        });


        it("Should fail if action is not handled", (done) => {
            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
            state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                should.not.exist(orderError);

                const input = { action: "Delete" };
                const orderId = "order-id";
                agent
                    .put(`localhost:4000/orders/${orderId}`)
                    .send(input)
                    .end((error, response) => {
                        response.status.should.equal(500);
                        response.text.should.equal("Error deciding action");
                        done();
                    });
            });
        });

        describe("Accepting", () => {
            it("Should fail accepting if bid did not exist", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                    should.not.exist(orderError);

                    const input = { action: "Accept", bidId: "bid-id" };
                    const orderId = "order-id";
                    agent
                        .put(`localhost:4000/orders/${orderId}`)
                        .send(input)
                        .end((error, response) => {
                            response.status.should.equal(500);
                            response.text.should.equal("Bid could not be found");
                            done();
                        });
                });
            });


            it("Should fail accepting if deliverer does not exist", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Bids").insert({ _id: "bid-id", deliveryTime: 700 }, (bidError) => {
                    state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                        should.not.exist(bidError);
                        should.not.exist(orderError);

                        const input = { action: "Accept", bidId: "bid-id" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                response.status.should.equal(500);
                                response.text.should.equal("Deliverer could not be found");
                                done();
                            });
                    });
                });
            });


            it("Should return 200 when succesful accepting", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Bids").insert({ _id: "bid-id", deliveryTime: 700 }, (bidError) => {
                    state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id"] }, (orderError) => {
                        state.database.collection("Users").insert({ _id: "deliverer-id", bids: ["bid-id"] }, (userError) => {
                            should.not.exist(bidError);
                            should.not.exist(orderError);
                            should.not.exist(userError);

                            const input = { action: "Accept", bidId: "bid-id" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    response.status.should.equal(200);
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should update order when accepting", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Bids").insert({ _id: "bid-id", deliveryTime: 700 }, (bidError) => {
                    state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                        should.not.exist(bidError);
                        should.not.exist(orderError);
                        
                        const input = { action: "Accept", bidId: "bid-id" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                                    should.not.exist(error);
                                    should.exist(order);

                                    const expectedOrder = { _id: "order-id", state: "Accepted", acceptedBid: "bid-id", scheduledDeliveryTime: 700 };
                                    order.should.deep.equal(expectedOrder);
                                    done();
                                });
                            });
                    });
                });
            });


            it("Should notify the accepted deliverer", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Bids").insert({ _id: "bid-id", deliveryTime: 700 }, (bidError) => {
                    state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                        state.database.collection("Users").insert({ _id: "deliverer-id", bids: ["bid-id"], device: { token: "abc", type: "Development" } }, (userError) => {
                            should.not.exist(bidError);
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            
                            const input = { action: "Accept", bidId: "bid-id" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    state.Notification.orders.should.deep.equal([{ _id: "order-id", state: "Accepted", acceptedBid: "bid-id", scheduledDeliveryTime: 700 }]);
                                    state.Notification.bids.should.deep.equal([{ _id: "bid-id", deliveryTime: 700 }])
                                    state.Notification.users.should.deep.equal([{ _id: "deliverer-id", bids: ["bid-id"], device: { token: "abc", type: "Development" } }]);
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should return the updated order when accepting", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Bids").insert({ _id: "bid-id", deliveryTime: 700 }, (bidError) => {
                    state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id"] }, (orderError) => {
                        state.database.collection("Users").insert({ _id: "deliverer-id", bids: ["bid-id"] }, (userError) => {
                            should.not.exist(bidError);
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            
                            const input = { action: "Accept", bidId: "bid-id" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedOrder = { _id: "order-id", state: "Accepted", bids: ["bid-id"], acceptedBid: "bid-id", scheduledDeliveryTime: 700 };
                                    response.body.should.deep.equal(expectedOrder);
                                    done();
                                });
                        });
                    });
                });
            });
        });

        describe("Cancelling", () => {
            it("Should fail cancelling if bid does not exist", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    should.not.exist(orderError);

                    const input = { action: "Cancel" };
                    const orderId = "order-id";
                    agent
                        .put(`localhost:4000/orders/${orderId}`)
                        .send(input)
                        .end((error, response) => {
                            response.status.should.equal(500);
                            response.text.should.equal("Bid could not be found");
                            done();
                        });
                });
            });


            it("Should fail cancelling if user does not exist", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                        const input = { action: "Cancel" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                response.status.should.equal(500);
                                response.text.should.equal("User could not be found");
                                done();
                            });
                    });
                });
            });

            it("Should fail if receiver does not exist", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id", "some-bid-id"] }, (userError) => {
                            should.not.exist(orderError);
                            should.not.exist(bidError);
                            should.not.exist(userError);

                            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                            const input = { action: "Cancel" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    response.text.should.equal("Receiver could not be found");
                                    response.status.should.equal(500);
                                    done();
                                });
                        });
                    });
                });
            });

            it("Should return 200 when succesful cancelling", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        state.database.collection("Users").insert([{ _id: "receiver-id", orders: ["order-id"] }, { _id: "user-id", bids: ["bid-id", "some-bid-id"] }], (userError) => {
                            should.not.exist(orderError);
                            should.not.exist(bidError);
                            should.not.exist(userError);

                            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                            const input = { action: "Cancel" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    response.status.should.equal(200);
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should update user when cancelling", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        state.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id", "some-bid-id"] }, (userError) => {
                            should.not.exist(orderError);
                            should.not.exist(bidError);
                            should.not.exist(userError);

                            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                            const input = { action: "Cancel" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    state.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                                        should.not.exist(error);
                                        should.exist(user);

                                        const expectedUser = { _id: "user-id", bids: ["some-bid-id"] };
                                        user.should.deep.equal(expectedUser);
                                        done();
                                    });
                                });
                        });
                    });
                });
            });


            it("Should update order when cancelling", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                        const input = { action: "Cancel" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                                    should.not.exist(error);
                                    should.exist(order);

                                    const expectedOrder = { _id: "order-id", state: "Pending", bids: ["other-bid-id"], acceptedBid: undefined };
                                    order.should.deep.equal(expectedOrder);
                                    done();
                                });
                            });
                    });
                });
            });


            it("Should remove the bid when cancelling", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        should.not.exist(orderError);
                        should.not.exist(bidError);

                        state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                        const input = { action: "Cancel" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                state.database.collection("Bids").findOne({ _id: "bid-id" }, (error, bid) => {
                                    should.not.exist(error);
                                    should.not.exist(bid);
                                    done();
                                });
                            });
                    });
                });
            });

            it("Should send notification to receiver when cancelling", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        state.database.collection("Users").insert([{_id: "receiver-id", orders: ["order-id"] }, { _id: "user-id", bids: ["bid-id", "some-bid-id"] }], (userError) => {
                            should.not.exist(orderError);
                            should.not.exist(bidError);
                            should.not.exist(userError);

                            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                            const input = { action: "Cancel" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedOrder = { _id: "order-id", state: "Pending", bids: ["other-bid-id"], acceptedBid: undefined };
                                    state.Notification.orders.should.deep.equal([expectedOrder]);

                                    const expectedUser = { _id: "receiver-id", orders: ["order-id"] };
                                    state.Notification.users.should.deep.equal([expectedUser]);
                                    
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should return the updated order and user when cancelling", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "other-bid-id"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Bids").insert({ _id: "bid-id", userId: "user-id" }, (bidError) => {
                        state.database.collection("Users").insert([{_id: "receiver-id", orders: ["order-id"] }, { _id: "user-id", bids: ["bid-id", "some-bid-id"] }], (userError) => {
                            should.not.exist(orderError);
                            should.not.exist(bidError);
                            should.not.exist(userError);

                            state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                            const input = { action: "Cancel" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedOrder = { _id: "order-id", state: "Pending", bids: ["other-bid-id"] };
                                    response.body.order.should.deep.equal(expectedOrder);

                                    const expectedUser = { _id: "user-id", bids: ["some-bid-id"] };
                                    response.body.user.should.deep.equal(expectedUser);
                                    
                                    done();
                                });
                        });
                    });
                });
            });
        });


        describe("Starting", () => {
            it("Should fail starting if receiver does not exist", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                    should.not.exist(orderError);

                    state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                    const input = { action: "Start" };
                    const orderId = "order-id";
                    agent
                        .put(`localhost:4000/orders/${orderId}`)
                        .send(input)
                        .end((error, response) => {
                            response.text.should.equal("Receiver could not be found");
                            response.status.should.equal(500);
                            done();
                        });
                });
            });

            it("Should return 200 when succesful starting", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: [] }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "receiver-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                        const input = { action: "Start" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                response.status.should.equal(200);
                                done();
                            });
                    });
                });
            });


            it("Should update order when starting", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id" }, (error) => {
                    should.not.exist(error);

                    state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                    const input = { action: "Start" };
                    const orderId = "order-id";
                    agent
                        .put(`localhost:4000/orders/${orderId}`)
                        .send(input)
                        .end((error, response) => {
                            state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                                should.not.exist(error);
                                should.exist(order);

                                const expectedOrder = { _id: "order-id", state: "Started" };
                                order.should.deep.equal(expectedOrder);
                                done();
                            });
                        });
                });
            });


            it("Should notify receiver when order is starting", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "receiver-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                        const input = { action: "Start" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                const expectedOrder = { _id: "order-id", state: "Started" };
                                state.Notification.orders.should.deep.equal([expectedOrder]);

                                const expectedUser = { _id: "receiver-id", orders: ["order-id"] };
                                state.Notification.users.should.deep.equal([expectedUser])

                                done();
                            });
                    });
                });
            });


            it("Should notify the losing deliverers when starting", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", bids: ["bid-id", "lost-bid-1", "lost-bid-2"], acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "receiver-id", orders: ["order-id"] }, { _id: "deliverer-id", bids: ["bid-id"], device: { token: "abc", type: "Development" } }, { _id: "loser-1", bids: ["lost-bid-1"], device: { token: "abc", type: "Development" } }, { _id: "loser-2", bids: ["lost-bid-2"], device: { token: "abc", type: "Development" } }], (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        const input = { action: "Start" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                state.Notification.users[1].should.deep.equal({ _id: "loser-1", bids: ["lost-bid-1"], device: { token: "abc", type: "Development" } });
                                state.Notification.users[2].should.deep.equal({ _id: "loser-2", bids: ["lost-bid-2"], device: { token: "abc", type: "Development" } });
                                done();
                            });
                    });
                });
            });


            it("Should return the updated order when starting", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", bids: [] }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "receiver-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                        const input = { action: "Start" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                const expectedOrder = { _id: "order-id", state: "Started", bids: [] };
                                response.body.should.deep.equal(expectedOrder);
                                done();
                            });
                    });
                });
            });
        });

        describe("Receiving", () => {
            it("Should fail receiving if receiver does not exist", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                    should.not.exist(orderError);

                    const input = { action: "Receive" };
                    const orderId = "order-id";
                    agent
                        .put(`localhost:4000/orders/${orderId}`)
                        .send(input)
                        .end((error, response) => {
                            response.status.should.equal(500);
                            response.text.should.equal("Receiver could not be found");
                            done();
                        });
                });
            });


            it("Should fail receiving if deliverer does not exist", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "user-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        const input = { action: "Receive" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                response.status.should.equal(500);
                                response.text.should.equal("Deliverer could not be found");
                                done();
                            });
                    });
                });
            });


            it("Should fail receiving if bid does not exist", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-id"] }, { _id: "deliverer-id", bids: ["bid-id"] }], (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        const input = { action: "Receive" };
                        const orderId = "order-id";
                        agent
                            .put(`localhost:4000/orders/${orderId}`)
                            .send(input)
                            .end((error, response) => {
                                response.status.should.equal(500);
                                response.text.should.equal("Bid could not be found");
                                done();
                            });
                    });
                });
            });


            it("Should fail receiving if failing to authorise payment", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.QuickPay.authorisePayment = (orderId, amount, creditCardId, callback) => { return callback({ message: "Unable to authorise payment" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id", state: "Started" }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-id"] }, { _id: "deliverer-id", bids: ["bid-id"] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    response.status.should.equal(500);
                                    response.text.should.equal("Unable to authorise payment");

                                    state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                                        should.not.exist(error);
                                        should.exist(order);

                                        order.state.should.equal("Started");
                                        done();
                                    });
                                });
                        });
                    });
                });
            });


            it("Should return 200 when succesful receiving", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id", deliveryAddress: {}, pickupAddress: {} }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", name: "Peter Hansen", orders: ["order-id"] }, { _id: "deliverer-id", name: "Anders Madsen", bids: ["bid-id"] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    response.status.should.equal(200);
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should secure a 10% cut for EpsilonApi from deliverer", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.QuickPay.authorisePayment = (orderId, amount, creditCardId, callback) => { state.QuickPay.payments.push({ order: orderId, creditCard: creditCardId, amount: amount }); callback(undefined) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-id"] }, { _id: "deliverer-id", bids: ["bid-id"], creditCard: "deliverer-credit-card-id" }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id", deliveryPrice: 160 }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    state.QuickPay.payments.should.include({ order: "order-id", creditCard: "deliverer-credit-card-id", amount: 16 });
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should update order when receiving", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-id"] }, { _id: "deliverer-id", bids: ["bid-id"] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                                        should.not.exist(error);
                                        should.exist(order);

                                        const expectedOrder = { _id: "order-id", acceptedBid: "bid-id", state: "Received" };
                                        order.should.deep.equal(expectedOrder);
                                        done();
                                    });
                                });
                        });
                    });
                });
            });


            it("Should update user if rated when receiving", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-id"] }, { _id: "deliverer-id", bids: ["bid-id"], ratings: [] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive", rating: 3.0 };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    state.database.collection("Users").findOne({ _id: "deliverer-id" }, (error, user) => {
                                        should.not.exist(error);
                                        should.exist(user);

                                        user.ratings.should.include(3.0);
                                        done();
                                    });
                                });
                        });
                    });
                });
            });


            it("Should send a receipt mail to the receiver", (done) => {
                state.factory.createReceiptMailForReceiver = (receiver, deliverer, order, bid) => { return { text: `${receiver._id} - ${deliverer._id} - ${order._id} - ${bid._id}` } };
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id" }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", orders: ["order-id"], email: "receiver@stuff.dk" }, { _id: "deliverer-id", bids: ["bid-id"], email: "deliverer@stuff.dk", ratings: [] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedMail = { text: "user-id - deliverer-id - order-id - bid-id" };
                                    state.mailer.mails[0].should.deep.equal(expectedMail);
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should send a receipt mail to the deliverer", (done) => {
                state.factory.createReceiptMailForDeliverer = (receiver, deliverer, order, bid) => { return { text: `${receiver._id} - ${deliverer._id} - ${order._id} - ${bid._id}` } };
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id", deliveryAddress: {}, pickupAddress: {} }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", name: "Peter Hansen", orders: ["order-id"], email: "receiver@stuff.dk" }, { _id: "deliverer-id", name: "Anders Madsen", bids: ["bid-id"], email: "deliverer@stuff.dk", ratings: [] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedMail = { text: "user-id - deliverer-id - order-id - bid-id" };
                                    state.mailer.mails[1].should.deep.equal(expectedMail);
                                    done();
                                });
                        });
                    });
                });
            });


            it("Should send a receipt mail to EpsilonApi", (done) => {
                state.factory.createReceiptMailForEpsilonApi = (receiver, deliverer, order, bid) => { return { text: `${receiver._id} - ${deliverer._id} - ${order._id} - ${bid._id}` } };
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id", deliveryAddress: {}, pickupAddress: {} }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", name: "Peter Hansen", orders: ["order-id"], email: "receiver@stuff.dk" }, { _id: "deliverer-id", name: "Anders Madsen", bids: ["bid-id"], email: "deliverer@stuff.dk", ratings: [] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedMail = { text: "user-id - deliverer-id - order-id - bid-id" };
                                    state.mailer.mails[2].should.deep.equal(expectedMail);
                                    done();
                                });
                        });
                    });
                });
            });

            it("Should notify deliverer when order is marked as received", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id", deliveryAddress: {}, pickupAddress: {} }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", name: "Peter Hansen", orders: ["order-id"] }, { _id: "deliverer-id", name: "Anders Madsen", bids: ["bid-id"], ratings: [] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedOrder = { _id: "order-id", acceptedBid: "bid-id", state: "Received", deliveryAddress: {}, pickupAddress: {} };
                                    state.Notification.orders.should.deep.equal([expectedOrder]);

                                    const expectedBid = { _id: "bid-id" };
                                    state.Notification.bids.should.deep.equal([expectedBid]);
                                    
                                    const expectedUser = { _id: "deliverer-id", name: "Anders Madsen", bids: ["bid-id"], ratings: [] };
                                    state.Notification.users.should.deep.equal([expectedUser]);

                                    done();
                                });
                        });
                    });
                });
            });


            it("Should return the updated order when receiving", (done) => {
                state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, { userId: "user-id" }) };
                state.database.collection("Orders").insert({ _id: "order-id", acceptedBid: "bid-id", deliveryAddress: {}, pickupAddress: {} }, (orderError) => {
                    state.database.collection("Users").insert([{ _id: "user-id", name: "Peter Hansen", orders: ["order-id"] }, { _id: "deliverer-id", name: "Anders Madsen", bids: ["bid-id"], ratings: [] }], (userError) => {
                        state.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                            should.not.exist(orderError);
                            should.not.exist(userError);
                            should.not.exist(bidError);

                            const input = { action: "Receive" };
                            const orderId = "order-id";
                            agent
                                .put(`localhost:4000/orders/${orderId}`)
                                .send(input)
                                .end((error, response) => {
                                    const expectedOrder = { _id: "order-id", acceptedBid: "bid-id", state: "Received", deliveryAddress: {}, pickupAddress: {} };
                                    response.body.should.deep.equal(expectedOrder);
                                    done();
                                });
                        });
                    });
                });
            });
        });
        
    });

    describe("Load an order's location: GET /orders/:orderId/location", () => {
        it("Should fail if unknown order", (done) => {
            agent
                .get(`localhost:4000/orders/order-id/location`)
                .end((error, response) => {
                    response.text.should.equal("Order could not be found");
                    response.status.should.equal(404);
                    done();
                });
        });
        it("Should load order's location", (done) => {
            state.database.collection("Orders").insert({ _id: "order-id", location: { latitude: 80, longitude: -30 } }, (error) => {
                should.not.exist(error);

                agent
                .get(`localhost:4000/orders/order-id/location`)
                .end((error, response) => {
                    const expectedLocation = { latitude: 80, longitude: -30 };
                    response.body.should.deep.equal(expectedLocation);
                    response.status.should.equal(200);
                    done();
                });
            });
        });
    });

    describe("Update an order's location: PUT /orders/:orderId/location", () => {
        it("Should fail if unknown order", (done) => {
            const input = undefined;
            agent
                .put(`localhost:4000/orders/order-id/location`)
                .send(input)
                .end((error, response) => {
                    response.text.should.equal("Order could not be found");
                    response.status.should.equal(404);
                    done();
                });
        });
        it("Should fail if invalid location", (done) => {
            state.database.collection("Orders").insert({ _id: "order-id", location: undefined }, (error) => {
                should.not.exist(error);

                const input = { location: "invalid" };
                agent
                    .put(`localhost:4000/orders/order-id/location`)
                    .send(input)
                    .end((error, response) => {
                        response.body.should.deep.equal([
                            '"$" has unrecognised field "location"',
                            '"$.latitude" was missing',
                            '"$.longitude" was missing'
                        ]);
                        response.status.should.equal(400);
                        done();
                    });
            });
        });
        it("Should update order's location", (done) => {
            state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Started", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 25, longitude: 26 } } }, (error) => {
                should.not.exist(error);

                const input = { latitude: 80, longitude: -30 };
                agent
                    .put(`localhost:4000/orders/order-id/location`)
                    .send(input)
                    .end((error, response) => {
                        state.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                            should.not.exist(error);
                            
                            const expectedLocation = { latitude: 80, longitude: -30 };
                            order.location.should.deep.equal(expectedLocation);

                            done();
                        });
                    });
            });
        });
        it("Should return the updated order", (done) => {
            state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Started", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 25, longitude: 26 } } }, (error) => {
                should.not.exist(error);

                const input = { latitude: 80, longitude: -30 };
                agent
                    .put(`localhost:4000/orders/order-id/location`)
                    .send(input)
                    .end((error, response) => {
                        const expectedOrder = { _id: "order-id", location: { latitude: 80, longitude: -30 }, state: "Started", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 25, longitude: 26 } } };
                        response.body.should.deep.equal(expectedOrder);
                        
                        response.status.should.equal(200);
                        done();
                    });
            });
        });
        describe("Pickup", () => {
            it("Should not pick up if order has not been started", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Pending", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 80, longitude: -30.025 } } }, (error) => {
                    should.not.exist(error);

                    const input = { latitude: 80, longitude: -30 };
                    agent
                        .put(`localhost:4000/orders/order-id/location`)
                        .send(input)
                        .end((error, response) => {
                            response.body.state.should.equal("Pending");
                            done();
                        });
                });
            });
            it("Should not pick up if pickup zone is further away than a kilometer", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Started", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 80, longitude: -50 } } }, (error) => {
                    should.not.exist(error);

                    const input = { latitude: 80, longitude: -30 };
                    agent
                        .put(`localhost:4000/orders/order-id/location`)
                        .send(input)
                        .end((error, response) => {
                            response.body.state.should.equal("Started");
                            done();
                        });
                });
            });
            it("Should fail if receiver does not exist", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Started", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 80, longitude: -30.005 } } }, (error) => {
                    should.not.exist(error);

                    const input = { latitude: 80, longitude: -30 };
                    agent
                        .put(`localhost:4000/orders/order-id/location`)
                        .send(input)
                        .end((error, response) => {
                            response.text.should.equal("Error picking up order: Receiver could not be found");
                            response.status.should.equal(500);
                            done();
                        });
                });
            });
            it("Should pick up order if appropriate", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Started", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 80, longitude: -30.005 } } }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "receiver-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        const input = { latitude: 80, longitude: -30 };
                        agent
                            .put(`localhost:4000/orders/order-id/location`)
                            .send(input)
                            .end((error, response) => {
                                response.body.state.should.equal("PickedUp");
                                response.status.should.equal(200);
                                done();
                            });
                    });
                });
            });
            it("Should notify receiver about pickup", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Started", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 80, longitude: -30.005 } } }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "receiver-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        const input = { latitude: 80, longitude: -30 };
                        agent
                            .put(`localhost:4000/orders/order-id/location`)
                            .send(input)
                            .end((error, response) => {
                                state.Notification.orders.should.deep.equal([{ _id: "order-id", location: { latitude: 80, longitude: -30 }, state: "PickedUp", deliveryAddress: { coordinate: { latitude: 13, longitude: 14 } }, pickupAddress: { coordinate: { latitude: 80, longitude: -30.005 } } }]);
                                state.Notification.users.should.deep.equal([{ _id: "receiver-id", orders: ["order-id"] }]);
                                done();
                            });
                    });
                });
            });
        });
        describe("Delivery", () => {
            it("Should not deliver if order has not been picked up", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "Started", deliveryAddress: { coordinate: { latitude: 80, longitude: -30.025 } }, pickupAddress: { coordinate: { latitude: 13, longitude: 14 } } }, (error) => {
                    should.not.exist(error);

                    const input = { latitude: 80, longitude: -30 };
                    agent
                        .put(`localhost:4000/orders/order-id/location`)
                        .send(input)
                        .end((error, response) => {
                            response.body.state.should.equal("Started");
                            done();
                        });
                });
            });
            it("Should not deliver if delivery zone is further away than a kilometer", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "PickedUp", deliveryAddress: { coordinate: { latitude: 80, longitude: -50 } }, pickupAddress: { coordinate: { latitude: 13, longitude: 14 } } }, (error) => {
                    should.not.exist(error);

                    const input = { latitude: 80, longitude: -30 };
                    agent
                        .put(`localhost:4000/orders/order-id/location`)
                        .send(input)
                        .end((error, response) => {
                            response.body.state.should.equal("PickedUp");
                            done();
                        });
                });
            });
            it("Should fail if receiver does not exist", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "PickedUp", deliveryAddress: { coordinate: { latitude: 80, longitude: -30.005 } }, pickupAddress: { coordinate: { latitude: 13, longitude: 14 } } }, (error) => {
                    should.not.exist(error);

                    const input = { latitude: 80, longitude: -30 };
                    agent
                        .put(`localhost:4000/orders/order-id/location`)
                        .send(input)
                        .end((error, response) => {
                            response.text.should.equal("Error delivering order: Receiver could not be found");
                            response.status.should.equal(500);
                            done();
                        });
                });
            });
            it("Should deliver order if appropriate", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "PickedUp", deliveryAddress: { coordinate: { latitude: 80, longitude: -30.005 } }, pickupAddress: { coordinate: { latitude: 13, longitude: 14 } } }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "receiver-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        const input = { latitude: 80, longitude: -30 };
                        agent
                            .put(`localhost:4000/orders/order-id/location`)
                            .send(input)
                            .end((error, response) => {
                                response.body.state.should.equal("Delivered");
                                response.status.should.equal(200);
                                done();
                            });
                    });
                });
            });
            it("Should notify receiver about delivery", (done) => {
                state.database.collection("Orders").insert({ _id: "order-id", location: undefined, state: "PickedUp", deliveryAddress: { coordinate: { latitude: 80, longitude: -30.005 } }, pickupAddress: { coordinate: { latitude: 13, longitude: 14 } } }, (orderError) => {
                    state.database.collection("Users").insert({ _id: "receiver-id", orders: ["order-id"] }, (userError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);

                        const input = { latitude: 80, longitude: -30 };
                        agent
                            .put(`localhost:4000/orders/order-id/location`)
                            .send(input)
                            .end((error, response) => {
                                state.Notification.orders.should.deep.equal([{ _id: "order-id", location: { latitude: 80, longitude: -30 }, state: "Delivered", deliveryAddress: { coordinate: { latitude: 80, longitude: -30.005 } }, pickupAddress: { coordinate: { latitude: 13, longitude: 14 } } }]);
                                state.Notification.users.should.deep.equal([{ _id: "receiver-id", orders: ["order-id"] }]);
                                done();
                            });
                    });
                });
            });
        });
    });

});