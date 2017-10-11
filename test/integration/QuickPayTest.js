const should = require("chai").should();
const Random = require("randomstring");

const TestState = require("../../source/TestState");

const state = {};
const QuickPay = require("../../source/utilities/QuickPay")(state);

const acceptedVisaCard = { cardNumber: "1000 0000 0000 0008".replace(/ /g, ""), month: "04", year: "20", cvc: "137" };
const rejectedVisaCard = { cardNumber: "1000 0000 0000 0016".replace(/ /g, ""), month: "05", year: "19", cvc: "370" };
const expiredVisaCard = { cardNumber: "1000 0000 0000 0024".replace(/ /g, ""), month: "06", year: "18", cvc: "793" };

const acceptedDankort = { cardNumber: "1000 0200 0000 0006".replace(/ /g, ""), month: "08", year: "19", cvc: "138" };
const rejectedDankort = { cardNumber: "1000 0200 0000 0014".replace(/ /g, ""), month: "07", year: "17", cvc: "837" };

describe("QuickPay", function () {
	this.timeout(0);

	beforeEach(() => {
		TestState.infuse(state);
	});

	describe("uploadCreditCard", () => {
		xit("Should fail if visa card is rejected", (done) => {
			QuickPay.uploadCreditCard(rejectedVisaCard, (error, creditCardId) => {
				should.exist(error);
				error.message.should.equal("Error authorising card: Rejected test operation");
				done();
			});
		});
		xit("Should fail if visa card is expired", (done) => {
			QuickPay.uploadCreditCard(expiredVisaCard, (error, creditCardId) => {
				should.exist(error);
				error.message.should.equal("Error authorising card: Rejected test operation");
				done();
			});
		});
		xit("Should upload visa card", (done) => {
			QuickPay.uploadCreditCard(acceptedVisaCard, (error, id) => {
				should.not.exist(error);
				should.exist(id);
				id.should.be.a.string;
				done();
			});
		});
	});
	describe("authorisePayment", () => {
		xit("Should authorise payment", (done) => {
			QuickPay.uploadCreditCard(acceptedVisaCard, (error, creditCardId) => {
				should.not.exist(error);

				const orderId = Random.generate(20);
				QuickPay.authorisePayment(orderId, 25, creditCardId, (error) => {
					should.not.exist(error);
					done();
				});
			});
		});
	});
	describe("loadCreditCardSuffix", () => {
		xit("Should fail if credit card does not exist", (done) => {
			QuickPay.loadCreditCard("wrong-id", (error) => {
				should.exist(error);
				error.message.should.equal("Not Found");
				done();
			});
		});
		xit("Should return suffix", (done) => {
			QuickPay.uploadCreditCard(acceptedVisaCard, (error, creditCardId) => {
				QuickPay.loadCreditCard(creditCardId, (error, suffix) => {
					suffix.should.equal("0008");
					done();
				});
			});
		});
	});



});