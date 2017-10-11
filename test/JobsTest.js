const should = require("chai").should();

const TestState = require("../source/TestState");
const system = {};
const jobs = require("../source/utilities/Jobs")(system);

describe("Jobs", () => {

    beforeEach(() => {
        TestState.infuse(system);
    });

    describe(".automaticCancellation", () => {
        it("Should fail if order does not exist", (done) => {
            jobs.automaticCancellation("order-id", "bid-id", "user-id", (error) => {
                should.exist(error);
                error.message.should.equal("Order could not be found");
                done();
            });
        });
        it("Should fail if deliverer does not exist", (done) => {
            system.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                should.not.exist(orderError);

                jobs.automaticCancellation("order-id", "bid-id", "user-id", (error) => {
                    should.exist(error);
                    error.message.should.equal("Deliverer could not be found");
                    done();
                });
            });
        });
        it("Should do nothing if deliverer has taken action", (done) => {
            system.database.collection("Orders").insert({ _id: "order-id", state: "Pending" }, (orderError) => {
                system.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                    should.not.exist(orderError);
                    should.not.exist(userError);

                    jobs.automaticCancellation("order-id", "bid-id", "user-id", (error) => {
                        should.not.exist(error);
                        system.Notification.orders.should.be.empty;
                        system.Notification.users.should.be.empty;
                        done();
                    });
                });
            });
        });
        it("Should cancel order if deliverer has taken no action", (done) => {
            system.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id", bids: ["bid-id"] }, (orderError) => {
                system.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
                    system.database.collection("Bids").insert({ _id: "bid-id" }, (bidError) => {
                        should.not.exist(orderError);
                        should.not.exist(userError);
                        should.not.exist(bidError);

                        jobs.automaticCancellation("order-id", "bid-id", "user-id", (error) => {
                            should.not.exist(error);

                            system.database.collection("Users").findOne({ _id: "user-id" }, (error, user) => {
                                should.not.exist(error);
                                user.bids.should.be.empty;

                                system.database.collection("Orders").findOne({ _id: "order-id" }, (error, order) => {
                                    should.not.exist(error);
                                    order.state.should.equal("Pending");
                                    should.not.exist(order.acceptedBid);
                                    order.bids.should.be.empty;

                                    system.database.collection("Bids").findOne({ _id: "bid-id" }, (error, bid) => {
                                        should.not.exist(error);
                                        should.not.exist(bid);

                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
        it("Should notify deliverer of automatic cancellation if deliverer has taken no action", (done) => {
            system.database.collection("Orders").insert({ _id: "order-id", state: "Accepted", acceptedBid: "bid-id", bids: ["bid-id"] }, (orderError) => {
                system.database.collection("Users").insert({ _id: "user-id", bids: ["bid-id"] }, (userError) => {
                    should.not.exist(orderError);
                    should.not.exist(userError);

                    jobs.automaticCancellation("order-id", "bid-id", "user-id", (error) => {
                        should.not.exist(error);
                        system.Notification.orders.should.deep.equal([{ _id: "order-id", state: "Pending", acceptedBid: undefined, bids: [] }]);
                        system.Notification.users.should.deep.equal([{ _id: "user-id", bids: [] }]);
                        done();
                    });
                });
            });
        });
    });

    describe(".sendDeliveryReminder", () => {
        it("Should fail if order does not exist", (done) => {
            jobs.sendDeliveryReminder("order-id", "user-id", (error) => {
                should.exist(error);
                error.message.should.equal("Order could not be found");
                done();
            });
        });
        it("Should fail if receiver does not exist", (done) => {
            system.database.collection("Orders").insert({ _id: "order-id" }, (orderError) => {
                should.not.exist(orderError);

                jobs.sendDeliveryReminder("order-id", "user-id", (error) => {
                    should.exist(error);
                    error.message.should.equal("Receiver could not be found");
                    done();
                });
            });
        });
        it("Should send reminder to receiver if not marked as received", (done) => {
            system.database.collection("Orders").insert({ _id: "order-id", state: "Delivered" }, (orderError) => {
                system.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                    should.not.exist(orderError);
                    should.not.exist(userError);

                    jobs.sendDeliveryReminder("order-id", "user-id", (error) => {
                        should.not.exist(error);
                        system.Notification.orders.should.deep.equal([{ _id: "order-id", state: "Delivered" }]);
                        system.Notification.users.should.deep.equal([{ _id: "user-id" }]);
                        done();
                    });
                });
            });
        });
        it("Should not send reminder if marked as received", (done) => {
            system.database.collection("Orders").insert({ _id: "order-id", state: "Received" }, (orderError) => {
                system.database.collection("Users").insert({ _id: "user-id" }, (userError) => {
                    should.not.exist(orderError);
                    should.not.exist(userError);

                    jobs.sendDeliveryReminder("order-id", "user-id", (error) => {
                        should.not.exist(error);
                        system.Notification.orders.should.be.empty;
                        system.Notification.users.should.be.empty;
                        done();
                    });
                });
            });
        });
    });

});