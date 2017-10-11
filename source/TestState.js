const tingodb = require("tingodb");
const TestEngine = tingodb({ memStore: true });
const Random = require("randomstring");
const Factory = require("../source/utilities/Factory");
const Mailer = require("../source/utilities/Mailer");
const Calendar = require("../source/utilities/Calendar");


const infuseTestState = (state) => {
	const database = new TestEngine.Db(`database/${Random.generate(7)}`, {});

	const validator = { validate: {} };
	validator.validate.color = (color, callback) => { callback(undefined) };
	validator.validate.password = (password, callback) => { callback(true) };
	validator.validate.secret = (secret, callback) => { callback(undefined) };
	validator.validate.phoneNumber = (phone, callback) => { callback(undefined) };
	validator.validate.email = (email, callback) => { callback(true) };
	validator.validate.image = (image, callback) => { callback(true) };
	validator.validate.notPastDeadline = (date, deadline, callback) => { callback(true) };
	validator.validate.address = (address, callback) => { callback(undefined) };

	validator.validate.userCreationInput = (input, callback) => { callback(undefined) };
	validator.validate.facebookUserCreationInput = (input, callback) => { callback(undefined) };
	validator.validate.passwordLogin = (login, callback) => { callback(undefined) };
	validator.validate.facebookLogin = (login, requiredPermissions, callback) => { callback(undefined) };
	validator.validate.userCredential = (credential, callback) => { callback(undefined) };
	validator.validate.userCredentialHeader = (header, callback) => { callback(undefined) };
	validator.validate.userExists = (id, callback) => { callback(undefined) };
	validator.validate.userChangeInput = (input, callback) => { callback(undefined) };
	validator.validate.userAvatarChangeInput = (input, callback) => { callback(undefined) };
	validator.validate.loginChallengeCreationInput = (input, callback) => { callback(undefined) };
	validator.validate.loginChallengeVerificationInput = (input, callback) => { callback(undefined) };
	validator.validate.loginChangeInput = (input, callback) => { callback(undefined) };
	validator.validate.creditCardCreationInput = (input, callback) => { callback(undefined) };

	validator.validate.orderCreationInput = (input, callback) => { callback(undefined) };
	validator.validate.bidCreationInput = (orderId, userId, input, callback) => { callback(undefined) };
	validator.validate.orderChangeInput = (orderId, userId, input, callback) => { callback(undefined) };
	
    const logger = { messages: [] };
    logger.info = (message) => { logger.messages.push(message) };
    logger.error = (message) => { logger.messages.push(message) };
    logger.hasLogged = (message) => { return logger.messages.some((loggedMessage) => { return loggedMessage.indexOf(message) != -1 }); };

    const facebook = {};
    facebook.validateData = (login, requiredFields, data) => { return true };
    facebook.loadData = (login, callback) => { callback() };
    facebook.extractInformation = (options, callback) => { callback() };

    const factory = Factory(state);

    const imageLoader = {};
    imageLoader.loadImage = (url, callback) => { callback() };

    const mailer = { mails: [] };
    mailer.sendChallengeMail = (receiver, secret, callback) => { mailer.mails.push(factory.createChallengeMail(receiver, secret)); callback(undefined) };
    mailer.sendReceiptMailForReceiver = (receiver, deliverer, order, bid, callback) => { mailer.mails.push(factory.createReceiptMailForReceiver(receiver, deliverer, order, bid, callback)); callback(undefined) };
    mailer.sendReceiptMailForDeliverer = (receiver, deliverer, order, bid, callback) => { mailer.mails.push(factory.createReceiptMailForDeliverer(receiver, deliverer, order, bid, callback)); callback(undefined) };
    mailer.sendReceiptMailForEpsilonApi = (receiver, deliverer, order, bid, callback) => { mailer.mails.push(factory.createReceiptMailForEpsilonApi(receiver, deliverer, order, bid, callback)); callback(undefined) };

    const Notification = { notifications: [], devices: [], orders: [], bids: [], users: [] };
    Notification.push = (notification, devices) => { Notification.notifications.push(notification); Array.prototype.push.apply(Notification.devices, devices) };
    Notification.newOrder = (order, users) => { Notification.orders.push(order); Array.prototype.push.apply(Notification.users, users) };
    Notification.orderReceivedBid = (order, bid, receiver) => { Notification.orders.push(order); Notification.bids.push(bid); Notification.users.push(receiver) };
    Notification.orderLost = (deliverers) => { Array.prototype.push.apply(Notification.users, deliverers) };
    Notification.orderWon = (order, bid, deliverer) => { Notification.orders.push(order); Notification.bids.push(bid); Notification.users.push(deliverer) };
    Notification.orderCancelled = (order, receiver) => { Notification.orders.push(order); Notification.users.push(receiver) };
    Notification.orderCancelledAutomatically = (order, deliverer) => { Notification.orders.push(order); Notification.users.push(deliverer) };
    Notification.orderStarted = (order, receiver) => { Notification.orders.push(order); Notification.users.push(receiver) };
    Notification.orderPickedUp = (order, receiver) => { Notification.orders.push(order); Notification.users.push(receiver) };
    Notification.orderDelivered = (order, receiver) => { Notification.orders.push(order); Notification.users.push(receiver) };
    Notification.orderDeliveredReminder = (order, receiver) => { Notification.orders.push(order); Notification.users.push(receiver) };
    Notification.orderReceived = (order, bid, deliverer) => { Notification.orders.push(order); Notification.bids.push(bid); Notification.users.push(deliverer) };

    const QuickPay = { orders: [], payments: [] };
	QuickPay.uploadCreditCard = (creditCard, callback) => { return callback(undefined) };
	QuickPay.authorisePayment = (orderId, deliveryPrice, creditCardId, callback) => { return callback(undefined) };
	QuickPay.loadCreditCard = (creditCardId, callback) => { return callback(undefined) };

	state.testMode = true;
	state.production = false;
	state.database = database;
	state.validator = validator;
	state.facebook = facebook;
	state.logger = logger;
	state.factory = factory;
	state.calendar = Calendar(state);
	state.imageLoader = imageLoader;
	state.mailer = mailer;
	state.Notification = Notification;
	state.QuickPay = QuickPay;
};

module.exports.infuse = infuseTestState;