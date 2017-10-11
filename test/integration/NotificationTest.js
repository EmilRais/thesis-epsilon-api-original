const should = require("chai").should();

const TestState = require("../../source/TestState");

const state = {};
const Notification = require("../../source/utilities/Notification")(state);

const productionDevice = { token: "some-production-device", type: "Production" };
const developmentDevice = { token: "some-development-device", type: "Development" };

describe("Notification", function () {

	beforeEach(() => {
		TestState.infuse(state);
	});

	describe("NewOrder", () => {



		it("Should create notification", (done) => {
			const order = { _id: "order-id" };
			const users = [];
			Notification.newOrder(order, users);

			const expectedPayload = { type: "NewOrder", orderId: "order-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices - but no duplicates", (done) => {
			const order = { description: "Some order description" };
			const users = [
				{ device: { token: "abc", type: "production" } },
				{ device: { token: "123", type: "production" } },
				{ device: { token: "123", type: "production" } }
			];
			Notification.newOrder(order, users);

			const expectedDevices = [
				{ token: "abc", type: "production" },
				{ token: "123", type: "production" }
			];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", function (done) {
			state.Notification.push = Notification.push;
			const order = { type: "NewOrder" };
			const users = [{ device: productionDevice }];

			Notification.newOrder(order, users);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});



	describe("OrderReceivedBid", () => {


		it("Should create notification", (done) => {
			const order = { _id: "order-id" };
			const bid = { _id: "bid-id" };
			const receiver = {};
			Notification.orderReceivedBid(order, bid, receiver);

			const expectedPayload = { type: "OrderReceivedBid", orderId: "order-id", bidId: "bid-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices", (done) => {
			const order = {};
			const bid = {};
			const receiver = { device: "1234" };
			Notification.orderReceivedBid(order, bid, receiver);

			const expectedDevices = ["1234"];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", function (done) {
			state.Notification.push = Notification.push;
			const order = {};
			const bid = {};
			const receiver = { device: productionDevice };


			Notification.orderReceivedBid(order, bid, receiver);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});



	describe("OrderLost", () => {
		

		it("Should create notifications", (done) => {
			const deliverers = [{ device: productionDevice }];
			Notification.orderLost(deliverers);

			const expectedPayload = { type: "OrderLost" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices", (done) => {
			const deliverers = [{ device: { token: "abc", type: "Development" } }];
			Notification.orderLost(deliverers);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const deliverers = [{ device: productionDevice }];
			
			Notification.orderLost(deliverers);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});



	describe("OrderWon", () => {
		

		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const bid = { _id: "bid-id" };
			const deliverer = { device: productionDevice };
			Notification.orderWon(order, bid, deliverer);

			const expectedPayload = { type: "OrderWon", orderId: "order-id", bidId: "bid-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices", (done) => {
			const order = {};
			const bid = {};
			const deliverer = { device: { token: "abc", type: "Development" } };
			Notification.orderWon(order, bid, deliverer);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = {};
			const bid = {};
			const deliverer = { device: productionDevice };
			
			Notification.orderWon(order, bid, deliverer);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});



	describe("OrderCancelled", () => {
		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			Notification.orderCancelled(order, receiver);

			const expectedPayload = { type: "OrderCancelled", orderId: "order-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});
		it("Should create devices", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: { token: "abc", type: "Development" } };
			Notification.orderCancelled(order, receiver);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});
		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			
			Notification.orderCancelled(order, receiver);
			setTimeout(() => {
				done();
			}, 1000);
		});
	});
	describe("OrderCancelledAutomatically", () => {
		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const deliverer = { device: productionDevice };
			Notification.orderCancelledAutomatically(order, deliverer);

			const expectedPayload = { type: "OrderCancelledAutomatically", orderId: "order-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});
		it("Should create devices", (done) => {
			const order = { _id: "order-id" };
			const deliverer = { device: { token: "abc", type: "Development" } };
			Notification.orderCancelledAutomatically(order, deliverer);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});
		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = { _id: "order-id" };
			const deliverer = { device: productionDevice };
			
			Notification.orderCancelledAutomatically(order, deliverer);
			setTimeout(() => {
				done();
			}, 1000);
		});
	});



	describe("OrderStarted", () => {
		

		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			Notification.orderStarted(order, receiver);

			const expectedPayload = { type: "OrderStarted", orderId: "order-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: { token: "abc", type: "Development" } };
			Notification.orderStarted(order, receiver);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			
			Notification.orderStarted(order, receiver);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});



	describe("OrderPickedUp", () => {


		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			Notification.orderPickedUp(order, receiver);

			const expectedPayload = { type: "OrderPickedUp", orderId: "order-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: { token: "abc", type: "Development" } };
			Notification.orderPickedUp(order, receiver);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			
			Notification.orderPickedUp(order, receiver);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});



	describe("OrderDelivered", () => {


		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			Notification.orderDelivered(order, receiver);

			const expectedPayload = { type: "OrderDelivered", orderId: "order-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: { token: "abc", type: "Development" } };
			Notification.orderDelivered(order, receiver);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			
			Notification.orderDelivered(order, receiver);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});

	describe("OrderDeliveredReminder", () => {
		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			Notification.orderDeliveredReminder(order, receiver);

			const expectedPayload = { type: "OrderDeliveredReminder", orderId: "order-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});
		it("Should create devices", (done) => {
			const order = { _id: "order-id" };
			const receiver = { device: { token: "abc", type: "Development" } };
			Notification.orderDeliveredReminder(order, receiver);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});
		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = { _id: "order-id" };
			const receiver = { device: productionDevice };
			
			Notification.orderDeliveredReminder(order, receiver);
			setTimeout(() => {
				done();
			}, 1000);
		});
	});

	describe("OrderReceived", () => {
		

		it("Should create notifications", (done) => {
			const order = { _id: "order-id" };
			const bid = { _id: "bid-id" };
			const deliverer = { device: productionDevice };
			Notification.orderReceived(order, bid, deliverer);

			const expectedPayload = { type: "OrderReceived", orderId: "order-id", bidId: "bid-id" };
			state.Notification.notifications[0].payload.should.deep.equal(expectedPayload);

			done();
		});


		it("Should create devices", (done) => {
			const order = { _id: "order-id" };
			const bid = { _id: "bid-id" };
			const deliverer = { device: { token: "abc", type: "Development" } };
			Notification.orderReceived(order, bid, deliverer);

			const expectedDevices = [{ token: "abc", type: "Development" }];
			state.Notification.devices.should.deep.equal(expectedDevices);

			done();
		});


		xit("Should push the notification", (done) => {
			state.Notification.push = Notification.push;
			const order = { _id: "order-id" };
			const bid = { _id: "bid-id" };
			const deliverer = { device: productionDevice };
			
			Notification.orderReceived(order, bid, deliverer);
			setTimeout(() => {
				done();
			}, 1000);
		});


	});



});