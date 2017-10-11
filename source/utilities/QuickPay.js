const agent = require("superagent");
const Configuration = require("../Configuration");

module.exports = (state) => {



	const postRequest = (options) => {
		agent
			.post("https://api.quickpay.net" + options.relative)
			.send(options.body)
			.set("Accept-Version", Configuration.payment.version)
			.set("Authorization", `Basic ${Configuration.payment.apiKey}`)
			.end(options.callback);
	};

	const getRequest = (options) => {
		agent
			.get("https://api.quickpay.net" + options.relative)
			.set("Accept-Version", Configuration.payment.version)
			.set("Authorization", `Basic ${Configuration.payment.apiKey}`)
			.end(options.callback);
	};

	const uploadCreditCard = (creditCard, callback) => {
		
		const createCard = (callback) => {
			postRequest({ relative: "/cards", callback: (error, response) => {
				console.log(error);
				if ( error ) return callback(error);
				if ( response.status != "201" ) return callback({ message: "Error creating card: Expected status 201 but was " + response.status });
				
				if ( !response.body ) return callback({ message: "Error creating card: Found no data" });
				if ( !response.body.id ) return callback({ message: "Error creating card: Found no id" });
				const id = response.body.id.toString();

				callback(undefined, id);
			}});
		};

		const authoriseCard = (id, callback) => {
			const body = { card: { number: creditCard.cardNumber, expiration: `${creditCard.year}${creditCard.month}`, cvd: creditCard.cvc } };

			postRequest({ relative: `/cards/${id}/authorize`, body: body, callback: (error, response) => {
				console.log(error);
				if ( error ) return callback({ message: "Error authorising card: " + error.response.text });
				if ( response.status != "202" ) return callback({ message: "Error authorising card: Expected status 202 but was " + response.status });

				const failedOperation = response.body.operations.find((operation) => { return !operation.pending && operation.qp_status_code != 20000 ? operation : false });
				if ( failedOperation ) return callback({ message: "Error authorising card: " + failedOperation.qp_status_msg });

				if ( response.body.operations.some((operation) => { return !operation.pending && operation.qp_status_code != 20000  }) ) return callback({ message: "Error authorising card: " + response.body.operations })
				if ( !state.testMode && response.body.test_mode  ) return callback({ message: "Error authorising card: Required test mode" });
				if ( !state.testMode && !response.body.accepted ) return callback({ message: "Error authorising card: Was not accepted" });

				callback(undefined, id);
			}});
		};

		createCard((createError, id) => {
			authoriseCard(id, callback);
		});
	};


	const authorisePayment = (orderId, deliveryCut, creditCardId, callback) => {
		const createPayment = (callback) => {
			const body = { currency: "DKK", order_id: orderId, basket: [{ qty: 1, item_no: orderId, item_name: "EpsilonApi - Levering", item_price: deliveryCut, vat_rate: 0.25 }] };

			state.database.collection("Payments").findOne({ order: orderId }, (error, payment) => {
				if ( error ) return callback("Error checking existing payments: " + error);
				if ( payment ) return callback(undefined, payment._id);

				postRequest({ relative: "/payments", body: body, callback: (error, response) => {
					console.log(error);
					if ( error ) return callback(error);
					if ( response.status != "201" ) return callback({ message: "Error creating payment: Expected status 201 but was " + response.status });
					if ( !response.body ) return callback({ message: "Error creating payment: Found no data" });
					if ( !response.body.id ) return callback({ message: "Error creating payment: Found no id" });
					const id = response.body.id;
					state.database.collection("Payments").insert({ _id: id, order: orderId });

					callback(undefined, id);
				}});
			});
		};

		const createCardToken = (callback) => {
			postRequest({ relative: `/cards/${creditCardId}/tokens`, callback: (error, response) => {
				console.log(error);
				if ( error ) return callback(error);
				if ( response.status != "201" ) return callback({ message: "Error creating card token: Expected status 201 but was " + response.status });
				if ( !response.body ) return callback({ message: "Error creating card token: Found no data" });
				if ( !response.body.token ) return callback({ message: "Error creating card token: Found no token" });
				const token = response.body.token;

				callback(undefined, token);
			}});
		};

		const authorisePayment = (paymentId, cardToken, callback) => {
			const body = { amount: deliveryCut * 100, card: { token: cardToken } };
			
			postRequest({ relative: `/payments/${paymentId}/authorize`, body: body, callback: (error, response) => {
				console.log(error);
				if ( error ) return callback(error);
				if ( response.status != "202" ) return callback({ message: "Error authorising payment: Expected status 202 but was " + response.status });
				if ( !response.body ) return callback({ message: "Error authorising payment: Found no data" });
				if ( !state.testMode && response.body.test_mode  ) return callback({ message: "Error authorising payment: Required test mode" });
				if ( !state.testMode && !response.body.accepted ) return callback({ message: "Error authorising payment: Was not accepted" });
				callback(undefined);
			}});
		};

		createPayment((paymentError, paymentId) => {
			if ( paymentError ) return callback(paymentError);

			createCardToken((cardTokenError, cardToken) => {
				if ( cardTokenError ) return callback(cardTokenError);

				authorisePayment(paymentId, cardToken, callback);
			});
		});
	};

	const loadCreditCard = (creditCardId, callback) => {
		getRequest({ relative: `/cards/${creditCardId}`, callback: (error, response) => {
			if ( error ) return callback(error);
			if ( response.status != "200" ) return callback({ message: "Error loading credit card: Expected status 200 but was " + response.status });

			const suffix = response.body.metadata.last4;
			callback(undefined, suffix);
		}});
	};
	

	const QuickPay = {};
	QuickPay.uploadCreditCard = uploadCreditCard;
	QuickPay.authorisePayment = authorisePayment;
	QuickPay.loadCreditCard = loadCreditCard;
	return QuickPay;
};