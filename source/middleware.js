module.exports = (system) => {

	const prepareOrder = (request, response, next, id) => {
		system.database.collection("Orders").findOne({ _id: id }, (error, order) => {
			if ( error ) return response.status(404).end("Error loading order: " + error.message);
			if ( !order ) return response.status(404).end("Order could not be found");

			request.order = order;
			next();
		});
	};

	const prepareBid = (request, response, next, id) => {
		system.database.collection("Bids").findOne({ _id: id }, (error, bid) => {
			if ( error ) return response.status(404).end("Error loading bid: " + error.message);
			if ( !bid ) return response.status(404).end("Bid could not be found");

			system.database.collection("Users").findOne({ bids: { $in: [bid._id] } }, (error, user) => {
	            if ( error ) return response.status(500).end("Error loading deliverer: " + error.message);
	            if ( !user ) return response.status(500).end("Deliverer could not be found");

	            bid.deliverer = system.factory.createDeliverer(user);

				request.bid = bid;
				next();
			});
		});
	};

	const module = {};
	module.prepareOrder = prepareOrder;
	module.prepareBid = prepareBid;
	return module;
};