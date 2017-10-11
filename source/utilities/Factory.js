const ObjectID = require("mongodb").ObjectID;
const Random = require("randomstring");
const Configuration = require("../Configuration");
const Mails = require("../data/Mails");
const moment = require("moment");
const accounting = require("accounting");


module.exports = function (state) {



	const createId = () => {
		return new ObjectID().toHexString();
	};



	const createShortId = () => {
		return Random.generate(20);
	};



	const createSecret = () => {
		return Random.generate(6);
	};



	const createImage = (imageData) => {
		const id = state.factory.createId();
		return { _id: id, image: imageData };
	};



	const createUserCredential = (user) => {
		const id = state.factory.createId();
		const expirationDate = state.calendar.hoursFromNow(72);
		return { _id: id, role: "User", userId: user._id, expires: expirationDate.getTime() };
	};



	const createAdminCredential = (user) => {
		const id = state.factory.createId();
		const expirationDate = state.calendar.hoursFromNow(24);
		return { _id: id, role: "Admin", expires: expirationDate.getTime() };
	};



	const createUser = (input) => {
		const id = state.factory.createId();
		return { _id: id, email: input.email, password: input.password, facebookUserId: undefined, name: input.name, description: undefined, avatar: undefined, mobile: input.mobile, ratings: [], creditCard: input.creditCard, activeDeliverer: true, orders: [], bids: [] };
	};



	const createFacebookUser = (input, information, image) => {
		const id = state.factory.createId();
		return { _id: id, email: information.email, password: input.password, facebookUserId: information.id, name: input.name, description: undefined, avatar: image._id, mobile: input.mobile, ratings: [], creditCard: input.creditCard, activeDeliverer: true, orders: [], bids: [] };
	};



	const createOrder = (input) => {
		const id = state.factory.createShortId();
		const creationDate = state.calendar.now();
		const orderState = "Pending";
		return { _id: id, expensive: input.expensive, description: input.description, paymentType: input.paymentType, cost: input.cost, deliveryPrice: input.deliveryPrice, deliveryTime: input.deliveryTime, scheduledDeliveryTime: undefined, deliveryAddress: input.deliveryAddress, pickupAddress: input.pickupAddress, creationDate: creationDate.getTime(), bids: [], acceptedBid: undefined, state: orderState, location: undefined };
	};



	const createBid = (orderId, userId, input) => {
		const id = state.factory.createId();
		return { _id: id, orderId: orderId, userId: userId, deliveryPrice: input.deliveryPrice, deliveryTime: input.deliveryTime };
	};



	const createDeliverer = (user) => {
		return { name: user.name, mobile: user.mobile, avatar: user.avatar, description: user.description, ratings: user.ratings };
	};



	const createReceiver = (user) => {
		return { name: user.name, mobile: user.mobile };
	};



	const createChallenge = (userId) => {
		const id = state.factory.createId();
		const secret = state.factory.createSecret();
		const expirationDate = state.calendar.minutesFromNow(5);
		return { _id: id, userId: userId, secret: secret, expires: expirationDate.getTime() };
	};



	const createChallengeMail = (user, secret) => {
		const mergeFields = (message) => {
			return message
				.replace(/{user.firstName}/g, firstWord(user.name))
				.replace(/{secret}/g, secret);
		};

		const mail = Mails.challenge;
		return { from: Configuration.mail.sender, to: user.email, subject: mail.subject, html: mergeFields(mail.html), text: mergeFields(mail.text) };
	};



	const createReceiptMailForReceiver = (receiver, deliverer, order, bid) => {
		const mergeFields = (message) => {
			return message
				.replace(/{receiver.firstName}/g, firstWord(receiver.name))
				.replace(/{order.scheduledDeliveryTime}/g, formatTime(order.scheduledDeliveryTime))
				.replace(/{order.description}/g, order.description)
				.replace(/{order.deliveryAddress}/g, order.deliveryAddress.name)
				.replace(/{bid.deliveryPrice}/g, formatMoney(bid.deliveryPrice))
				.replace(/{deliverer.name}/g, deliverer.name);
		};

		const mail = Mails.receiptForReceiver;
		return { from: Configuration.mail.sender, to: receiver.email, subject: mail.subject, html: mergeFields(mail.html), text: mergeFields(mail.text) };
	};



	const createReceiptMailForDeliverer = (receiver, deliverer, order, bid) => {
		const mergeFields = (message) => {
			return message
				.replace(/{deliverer.firstName}/g, firstWord(deliverer.name))
				.replace(/{order.scheduledDeliveryTime}/g, formatTime(order.scheduledDeliveryTime))
				.replace(/{receiver.name}/g, receiver.name)
				.replace(/{order.description}/g, order.description)
				.replace(/{order.deliveryAddress}/g, order.deliveryAddress.name)
				.replace(/{bid.deliveryPrice}/g, formatMoney(bid.deliveryPrice));
		};

		const mail = Mails.receiptForDeliverer;
		return { from: Configuration.mail.sender, to: deliverer.email, subject: mail.subject, html: mergeFields(mail.html), text: mergeFields(mail.text) };
	};



	const createReceiptMailForEpsilonApi = (receiver, deliverer, order, bid) => {
		const mergeFields = (message) => {
			return message
				.replace(/{order.scheduledDeliveryTime}/g, formatTime(order.scheduledDeliveryTime))
				.replace(/{order.description}/g, order.description)
				.replace(/{order.pickupAddress}/g, order.pickupAddress.name)
				.replace(/{receiver.name}/g, receiver.name)
				.replace(/{receiver.phone}/g, receiver.mobile)
				.replace(/{order.deliveryAddress}/g, order.deliveryAddress.name)
				.replace(/{receiver.email}/g, receiver.email)
				.replace(/{deliverer.name}/g, deliverer.name)
				.replace(/{deliverer.phone}/g, deliverer.mobile)
				.replace(/{deliverer.email}/g, deliverer.email);
		};

		const mail = Mails.receiptForEpsilonApi;
		const recipient = state.production ? Configuration.mail.receiverInProduction : Configuration.mail.receiverInTest;
		return { from: Configuration.mail.sender, to: recipient, subject: mail.subject, html: mergeFields(mail.html), text: mergeFields(mail.text) };
	};



	const createCreditCard = (link) => {
		const id = state.factory.createId();
		return { _id: id, link: link };
	};

	const firstWord = (text) => {
		const firstSpaceInText = text.indexOf(" ");
		return firstSpaceInText == -1 ? text : text.substr(0, firstSpaceInText);
	};

	const formatMoney = (money) => {
		return accounting.formatMoney(money, "", 2, ".", ",");
	};


	const formatTime = (time) => {
		return moment(time).format("[d]. D/M-YYYY [kl]. HH:mm");
	};



	const factory = {};
	factory.createId = createId;
	factory.createShortId = createShortId;
	factory.createSecret = createSecret;
	factory.createImage = createImage;
	factory.createUserCredential = createUserCredential;
	factory.createAdminCredential = createAdminCredential;
	factory.createUser = createUser;
	factory.createFacebookUser = createFacebookUser;
	factory.createOrder = createOrder;
	factory.createBid = createBid;
	factory.createDeliverer = createDeliverer;
	factory.createReceiver = createReceiver;
	factory.createChallenge = createChallenge;
	factory.createChallengeMail = createChallengeMail;
	factory.createReceiptMailForDeliverer = createReceiptMailForDeliverer;
	factory.createReceiptMailForReceiver = createReceiptMailForReceiver;
	factory.createReceiptMailForEpsilonApi = createReceiptMailForEpsilonApi;
	factory.createCreditCard = createCreditCard;
	return factory;
};