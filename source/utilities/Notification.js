const apn = require("apn");
const Configuration = require("../Configuration");

var developmentConnection = undefined;
var productionConnection = undefined;
module.exports = (state) => {

	const getDevelopmentConnection = () => {
		if ( developmentConnection ) return developmentConnection;

		const developmentOptions = { production: false, pfx: "resources/development.p12", passphrase: "some-password" };
		developmentConnection = new apn.Connection(developmentOptions);
		const developmentFeedback = new apn.Feedback(developmentOptions);
		return developmentConnection;
	}

	const getProductionConnection = () => {
		if ( productionConnection ) return productionConnection;

		const productionOptions = {
			production: true,
			pfx: "resources/production.p12",
			passphrase: "some-password",
			batchFeedback: true,
			interval: 300
		};
		productionConnection = new apn.Connection(productionOptions);
		
		const productionFeedback = new apn.Feedback(productionOptions);
		productionFeedback.on("feedback", function (items) {
			console.log("## Notification Feedback Service ##");
			if ( items.length === 0 ) {
				console.log("Nothing to report");
				console.log("## END ##");
				return;
			}

			console.log(`Found ${items.length} incidents`);

			const tokens = items.map((item) => {
				const token = item.device.toString();
				const wellFormedToken = token.match(/.{8}/g).join(" ");
				console.log("Device: " + wellFormedToken);
				return wellFormedToken;
			});

			state.database.collection("Users").update({ "device.token": { "$in": tokens } }, { $set: { device: null } }, { multi: true }, (error) => {
				if ( error )
					console.log(error);

				console.log("## END ##");
			});
		});
		return productionConnection;
	};

	const push = (notification, devices) => {
		console.log("About to push " + notification.payload.type + " notification to:");

		devices.forEach((device) => {
			console.log("- " + device.token);

			const deviceToken = apn.Device(device.token);

			if ( device.type == "Development" ) return getDevelopmentConnection().pushNotification(notification, deviceToken);
			if ( device.type == "Production" ) return getProductionConnection().pushNotification(notification, deviceToken);
			state.logger.error("Unrecognised device type: " + device.type);
		});
	};

	const newOrder = (order, users) => {
		const notification = new apn.Notification({ type: "NewOrder", orderId: order._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: New order";

		const devices = users.filter((user) => { return user.device }).map((user) => { return user.device });
		const uniqueDevices = [];

		devices.forEach((device) => {
			var containsDevice = false;
			uniqueDevices.forEach((otherDevice) => {
				if ( device.token === otherDevice.token && device.type === otherDevice.type )
					containsDevice = true;
			});
			

			if ( !containsDevice )
				uniqueDevices.push(device);
		});

		state.Notification.push(notification, uniqueDevices);
	};

	const orderReceivedBid = (order, bid, receiver) => {
		const notification = new apn.Notification({ type: "OrderReceivedBid", orderId: order._id, bidId: bid._id });
		notification.contentAvailable = 1;
		if ( !state.production ) notification.alert = "Test: Order received bid";

		const devices = receiver.device ? [receiver.device] : [];
		state.Notification.push(notification, devices);
	};

	const orderLost = (deliverers) => {
		const notification = new apn.Notification({ type: "OrderLost" });
		notification.contentAvailable = 1;
		if ( !state.production ) notification.alert = "Test: Order lost";

		const devices = deliverers.filter((user) => { return user.device }).map((user) => { return user.device });
		state.Notification.push(notification, devices);
	};

	const orderWon = (order, bid, deliverer) => {
		const notification = new apn.Notification({ type: "OrderWon", orderId: order._id, bidId: bid._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: Order won";

		const devices = deliverer.device ? [deliverer.device] : [];
		state.Notification.push(notification, devices);
	};

	const orderCancelled = (order, receiver) => {
		const notification = new apn.Notification({ type: "OrderCancelled", orderId: order._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: Order cancelled";

		const devices = receiver.device ? [receiver.device] : [];
		state.Notification.push(notification, devices);
	};

	const orderCancelledAutomatically = (order, deliverer) => {
		const notification = new apn.Notification({ type: "OrderCancelledAutomatically", orderId: order._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: Order cancelled automatically";

		const devices = deliverer.device ? [deliverer.device] : [];
		state.Notification.push(notification, devices);
	};

	const orderStarted = (order, receiver) => {
		const notification = new apn.Notification({ type: "OrderStarted", orderId: order._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: Order started";

		const devices = receiver.device ? [receiver.device] : [];
		state.Notification.push(notification, devices);
	};



	const orderPickedUp = (order, receiver) => {
		const notification = new apn.Notification({ type: "OrderPickedUp", orderId: order._id });
		notification.contentAvailable = 1;
		if ( !state.production ) notification.alert = "Test: Order picked up";

		const devices = receiver.device ? [receiver.device] : [];
		state.Notification.push(notification, devices);
	};


	
	const orderDelivered = (order, receiver) => {
		const notification = new apn.Notification({ type: "OrderDelivered", orderId: order._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: Order delivered";

		const devices = receiver.device ? [receiver.device] : [];
		state.Notification.push(notification, devices);
	};

	const orderDeliveredReminder = (order, receiver) => {
		const notification = new apn.Notification({ type: "OrderDeliveredReminder", orderId: order._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: Order delivered reminder";

		const devices = receiver.device ? [receiver.device] : [];
		state.Notification.push(notification, devices);
	};

	const orderReceived = (order, bid, deliverer) => {
		const notification = new apn.Notification({ type: "OrderReceived", orderId: order._id, bidId: bid._id });
		notification.contentAvailable = 1
		if ( !state.production ) notification.alert = "Test: Order received";

		const devices = deliverer.device ? [deliverer.device] : [];
		state.Notification.push(notification, devices);
	};



	const Notification = {};
	Notification.push = push;
	Notification.newOrder = newOrder;
	Notification.orderReceivedBid = orderReceivedBid;
	Notification.orderLost = orderLost;
	Notification.orderWon = orderWon;
	Notification.orderCancelled = orderCancelled;
	Notification.orderCancelledAutomatically = orderCancelledAutomatically;
	Notification.orderStarted = orderStarted;
	Notification.orderPickedUp = orderPickedUp;
	Notification.orderDelivered = orderDelivered;
	Notification.orderDeliveredReminder = orderDeliveredReminder;
	Notification.orderReceived = orderReceived;
	return Notification;
};