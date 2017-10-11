const nodemailer = require("nodemailer");
const mailAccount = require("../Configuration").mail;

const transporter = nodemailer.createTransport({
	service: "zoho",
	auth: { user: mailAccount.username, pass: mailAccount.password },
	secure: true
});


module.exports = function (state) {



	const sendChallengeMail = (receiver, secret, callback) => {
		const mail = state.factory.createChallengeMail(receiver, secret);
		transporter.sendMail(mail, callback);
	};



	const sendReceiptMailForReceiver = (receiver, sender, order, bid, callback) => {
		const mail = state.factory.createReceiptMailForReceiver(receiver, sender, order, bid);
		transporter.sendMail(mail, callback);
	};



	const sendReceiptMailForDeliverer = (receiver, sender, order, bid, callback) => {
		const mail = state.factory.createReceiptMailForDeliverer(receiver, sender, order, bid);
		transporter.sendMail(mail, callback);
	};



	const sendReceiptMailForEpsilonApi = (receiver, sender, order, bid, callback) => {
		const mail = state.factory.createReceiptMailForEpsilonApi(receiver, sender, order, bid);
		transporter.sendMail(mail, callback);
	};



	const mailer = {};
	mailer.sendChallengeMail = sendChallengeMail;
	mailer.sendReceiptMailForReceiver = sendReceiptMailForReceiver;
	mailer.sendReceiptMailForDeliverer = sendReceiptMailForDeliverer;
	mailer.sendReceiptMailForEpsilonApi = sendReceiptMailForEpsilonApi;
	return mailer;
};