module.exports = (system) => {

	const automaticCancellation = (orderId, bidId, delivererId, done) => {
	    system.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
    		system.database.collection("Users").findOne({ _id: delivererId }, (userError, deliverer) => {
    			if ( orderError ) return done(orderError);
    			if ( userError ) return done(userError);

    			if ( !order ) return done({ message: "Order could not be found" });
    			if ( !deliverer ) return done({ message: "Deliverer could not be found" });

		        if ( order.state !== "Accepted" ) return done();

		        system.database.collection("Users").update({ _id: delivererId }, { $pull: { bids: [bidId] } }, (updateUserError) => {
		        	if ( updateUserError ) return done(updateUserError);

		        	system.database.collection("Orders").update({ _id: orderId }, { $set: { state: "Pending", acceptedBid: undefined }, $pull: { bids: [bidId] } }, (updateOrderError) => {
		        		if ( updateOrderError ) return done(updateOrderError);

		        		system.database.collection("Bids").remove({ _id: bidId }, (deleteBidError) => {
		        			if ( deleteBidError ) return done(deleteBidError);

		        			system.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
					    		system.database.collection("Users").findOne({ _id: delivererId }, (userError, deliverer) => {
					    			if ( orderError ) return done(orderError);
					    			if ( userError ) return done(userError);

		        					system.Notification.orderCancelledAutomatically(order, deliverer);
		        					done();
		        				});
		        			});
		        		});
		        	});
		        });
    		});
	    });
	};

	const sendDeliveryReminder = (orderId, receiverId, done) => {
	    system.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
	    	system.database.collection("Users").findOne({ _id: receiverId }, (userError, receiver) => {
	    		if ( orderError ) return done(error);
	    		if ( userError ) return done(userError);

		        if ( !order ) return done({ message: "Order could not be found" });
		        if ( !receiver ) return done({ message: "Receiver could not be found" });

		        if ( order.state !== "Received" )
		            system.Notification.orderDeliveredReminder(order, receiver);

		        done();
	    	});
	    });
	};

	const jobs = {};
	jobs.automaticCancellation = automaticCancellation;
	jobs.sendDeliveryReminder = sendDeliveryReminder;
	return jobs;
};