const should = require("chai").should();

const TestState = require("../../source/TestState");

const state = {};
const mailer = require("../../source/utilities/Mailer")(state);

describe("Mailer", function () {
	this.timeout(0);

	beforeEach(() => {
		TestState.infuse(state);
	});
		
	
	xit("Should be able to send challenge mail", (done) => {
		const user = { name: "Peter Hansen", email: "support@developer.dk" };
		mailer.sendChallengeMail(user, "some-secret", (error, info) => {
			should.not.exist(error);
			should.exist(info);
			done();
		});
	});


	xit("Should be able to send receipt mail for receiver", (done) => {
		const receiver = { name: "Peter Hansen", email: "support@developer.dk" };
		const deliverer = { name: "Anders Madsen" };
		const order = { description: "Jeg skal have indkøbt æg og det skal gå stærkt!", deliveryAddress: { name: "Ryesgade 32, 8000 Aarhus" }, scheduledDeliveryTime: 7000000 };
		const bid = { deliveryPrice: 1234.5678 };
		mailer.sendReceiptMailForReceiver(receiver, deliverer, order, bid, (error, info) => {
			should.not.exist(error);
			should.exist(info);
			done();
		});
	});


	xit("Should be able to send receipt mail for deliverer", (done) => {
		const receiver = { name: "Peter Hansen" };
		const deliverer = { name: "Anders Madsen", email: "support@developer.dk" };
		const order = { description: "Jeg skal have indkøbt æg og det skal gå stærkt!", deliveryAddress: { name: "Ryesgade 32, 8000 Aarhus" }, scheduledDeliveryTime: 700000 };
		const bid = { deliveryPrice: 3100.909 };
		mailer.sendReceiptMailForDeliverer(receiver, deliverer, order, bid, (error, info) => {
			should.not.exist(error);
			should.exist(info);
			done();
		});
	});


	xit("Should be able to send receipt mail for epsilon-api", (done) => {
		const receiver = { name: "Peter Hansen", email: "support@developer.dk", mobile: "12345678" };
		const deliverer = { name: "Anders Madsen", email: "support@developer.dk", mobile: "12124444" };
		const order = { description: "Jeg skal have indkøbt æg og det skal gå stærkt!", pickupAddress: { name: "Føtex i Storcenter Nord" }, deliveryAddress: { name: "Ryesgade 32, 8000 Aarhus" }, scheduledDeliveryTime: 7000000 };
		mailer.sendReceiptMailForEpsilonApi(receiver, deliverer, order, undefined, (error, info) => {
			should.not.exist(error);
			should.exist(info);
			done();
		});
	});


});