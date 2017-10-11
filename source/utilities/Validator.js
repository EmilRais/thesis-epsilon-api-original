const isValidEmail = require("email-validator").validate;

module.exports = function (state) {
	

	const hasAll = (options) => {
		const input = options.in;

		for (var i = 0; i < options.fields.length; i++) {
			var field = options.fields[i];

			if ( !input.hasOwnProperty(field) )
				return false;
		}
		
		return true;
	};



	const hasOnly = (options) => {
		const input = options.in;

		for ( var field in input ) {
			if ( options.fields.indexOf(field) == -1 )
				return false;
		}

		return true;
	};



	const hasExactly = (options) => {
		return hasAll(options) && hasOnly(options);
	};



	const validateColor = (color, callback) => {
		const requiredFields = ["r", "g", "b", "a"];
		if ( !color ) return callback({ message: "No color" });
		if ( !hasExactly({ fields: requiredFields, in: color }) ) return callback({ message: "Does not specify exactly the required fields" });

		if ( typeof color.r != "number" ) return callback({ message: "Red was not a number" });
		if ( color.r < 0 || color.r > 255 ) return callback({ message: "Red was invalid" });

		if ( typeof color.g != "number" ) return callback({ message: "Green was not a number" });
		if ( color.g < 0 || color.g > 255 ) return callback({ message: "Green was invalid" });

		if ( typeof color.b != "number" ) return callback({ message: "Blue was not a number" });
		if ( color.b < 0 || color.b > 255 ) return callback({ message: "Blue was invalid" });

		if ( typeof color.a != "number" ) return callback({ message: "Alpha was not a number" });
		if ( color.a < 0 || color.a > 1 ) return callback({ message: "Alpha was invalid" });

		return callback(undefined);
	};



	const validatePassword = (password, callback) => {
		if ( typeof password != "string" )
			return callback(false);

		if ( password.length < 5 || password.length > 32 )
			return callback(false);

		callback(true);
	};



	const validateEmail = (email, callback) => {
		const valid = isValidEmail(email);
		callback(valid);
	};



	const validateImage = (image, callback) => {
		if ( typeof image != "string" )
			return callback(false);

		if ( !image )
			return callback(false);

		callback(true);
	};



	const validatePhoneNumber = (phone, callback) => {
		if ( typeof phone != "string" ) return callback({ message: "Phone number was not a string" });
		if ( phone.length != "8" ) return callback({ message: "Phone number was not 8 characters long" });
		if ( phone.match(/[^$,.\d]/) ) return callback({ message: "Phone number contains invalid characters" });
		return callback(undefined);
	};



	const validateUserExists = (id, callback) => {
		if ( !id ) return callback({ message: "No id" });

		state.database.collection("Users").findOne({ _id: id }, (error, user) => {
			if ( error ) return callback(error);
			if ( !user ) return callback({ message: "User could not be found" });

			callback(undefined);
		});
	};



	const validateAdminExists = (id, callback) => {
		if ( !id )
			return callback(false);

		state.database.collection("Administrators").findOne({ _id: id }, (error, admin) => {
			if ( error )
				return callback(false);

			const adminExists = !!admin;
			callback(adminExists);
		});
	};



	const validateNotPastDeadline = (date, deadline, callback) => {
		if ( !date || !deadline ) return callback(false);
		if ( !(date instanceof Date) || !(deadline instanceof Date) ) return callback(false);
		if ( date > deadline ) return callback(false);

		callback(true);
	};
	


	const validatePasswordLogin = (login, callback) => {
		const requiredFields = ["email", "password", "device"];

		if ( !login ) return callback({ message: "No login" });
		if ( !hasExactly({ fields: requiredFields, in: login }) ) return callback({ message: "Did not specify exactly the required fields" });

		if ( typeof login.email != "string" ) return callback({ message: "'email' was not a string" });
		if ( typeof login.password != "string" ) return callback({ message: "'password' was not a string" });

		const validateDevice = (device, callback) => {
			const deviceFields = ["token", "type"];
			if ( !device ) return callback(undefined);
			if ( !hasExactly({ fields: deviceFields, in: device }) ) return callback({ message: "'device' did not specify exactly the required fields" });

			if ( typeof device.token != "string" ) return callback({ message: "'device.token' was not a string" });
			if ( device.type != "Development" && device.type != "Production" ) return callback({ message: "'device.type' was not recognised" });
			callback(undefined);
		};

		validateDevice(login.device, (deviceError) => {
			if ( deviceError ) return callback(deviceError);

			state.database.collection("Users").findOne({ email: login.email}, (error, user) => {
				if ( error ) return callback(error);
				if ( !user ) return callback({ message: "'email' was not in use" });
				if ( login.password !== user.password ) return callback({ message: "Passwords do not match" });

				return callback(undefined);
			});
		});
	};



	const validateFacebookLogin = (login, requiredPermissions, callback) => {
		const requiredFields = ["facebookUserId", "facebookToken", "device"];

		if ( !login ) return callback({ message: "No login" });
		if ( !hasExactly({ fields: requiredFields, in: login }) ) return callback({ message: "Did not specify exactly the required fields" });
		if ( !(requiredPermissions instanceof Array) ) return callback({ message: "Permissions were not specified in an array" });

		const validateDevice = (device, callback) => {
			const deviceFields = ["token", "type"];
			if ( !device ) return callback(undefined);
			if ( !hasExactly({ fields: deviceFields, in: device }) ) return callback({ message: "'device' did not specify exactly the required fields" });

			if ( typeof device.token != "string" ) return callback({ message: "'device.token' was not a string" });
			if ( device.type != "Development" && device.type != "Production" ) return callback({ message: "'device.type' was not recognised" });
			callback(undefined);
		};

		validateDevice(login.device, (deviceError) => {
			if ( deviceError ) return callback(deviceError);

			state.facebook.loadData(login, (error, data) => {
				if ( error ) return callback(error);

				const validLogin = state.facebook.validateData(login, requiredPermissions, data);
				if ( !validLogin ) return callback({ message: "Invalid login" });

				callback(undefined);
			});
		});
	};



	const validateAdminLogin = (login, callback) => {
		const requiredFields = ["username", "password"];

		if ( !login ) return callback(false);
		if ( !hasExactly({ fields: requiredFields, in: login }) ) return callback(false);
		
		state.database.collection("Administrators").findOne({ username: login.username }, (error, administrator) => {
			if ( error ) return callback(false);
			if ( !administrator ) return callback(false);

			const passwordMatches = login.password === administrator.password;
			return callback(passwordMatches);
		});
	};



	const parse = (string) => {
		try {
			return JSON.parse(string);
		} catch (e) {
			return undefined;
		}
	};



	const validateAdminLoginHeader = (header, callback) => {
		if ( !header ) return callback(false);
		const login = parse(header);
		state.validator.validate.adminLogin(login, callback);
	};



	const validateUserCredentialHeader = (header, callback) => {
		const requiredFields = ["token"];
		if ( !header ) return callback({ message: "No header" });
		
		const strippedCredential = parse(header);
		if ( !strippedCredential ) return callback({ message: "Malformed header" });
		if ( !hasExactly({ fields: requiredFields, in: strippedCredential }) ) return callback({ message: "Did not specify exactly the required fields" });

		state.database.collection("Credentials").findOne({ _id: strippedCredential.token }, (error, credential) => {
            if ( error ) return callback({ message: "Error loading credential: " + error.message });

            state.validator.validate.userCredential(credential, (credentialError) => {
                if ( credentialError ) return callback(credentialError);

                return callback(undefined, credential);
            });
        });
	};



	const validateUserCredential = (credential, callback) => {
		const requiredFields = ["_id", "role", "userId", "expires"];

		if ( !credential ) return callback({ message: "No credential" });
		if ( !hasExactly({ fields: requiredFields, in: credential }) ) return callback({ message: "Did not specify exactly the required fields" });
		if ( typeof credential.expires != "number" ) return callback({ message: "'expires' was not a number" });
		if ( credential.role != "User" ) return callback({ message: "Credential was not a user credential" });

		const currentDate = state.calendar.now();
		const expirationDate = new Date(credential.expires);
		state.validator.validate.notPastDeadline(currentDate, expirationDate, (validDate) => {
			if ( !validDate ) return callback({ message: "Credential was past its deadline" });

			state.validator.validate.userExists(credential.userId, (userError) => {
				if ( userError ) return callback(userError);

				callback(undefined);
			});
		});
	};



	const validateAdminCredential = (credential, callback) => {
		const requiredFields = ["_id", "role", "adminId", "expires"];

		if ( !credential ) return callback(false);
		if ( !hasExactly({ fields: requiredFields, in: credential }) ) return callback(false);
		if ( typeof credential.expires != "number" ) return callback(false);
		if ( credential.role != "Admin" ) return callback(false);

		const currentDate = state.calendar.now();
		const expirationDate = new Date(credential.expires);
		state.validator.validate.notPastDeadline(currentDate, expirationDate, (validDate) => {
			if ( !validDate ) return callback(false);

			state.validator.validate.adminExists(credential.adminId, (adminExists) => {
				if ( !adminExists ) return callback(false);

				callback(true);
			});
		});
	};



	const validateUserCreationInput = (input, callback) => {
		const requiredFields = ["name", "email", "mobile", "password"];
		const optionalFields = ["creditCard"];
		const possibleFields = requiredFields.concat(optionalFields);

		if ( !input ) return callback({ message: "No input" });
		if ( !hasAll({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });
		if ( !hasOnly({ fields: possibleFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });	
		
		if ( typeof input.name != "string" ) return callback({ message: "'name' was not a string" });
		if ( !input.name ) return callback({ message: "'name' was the empty string" });
		if ( input.name.length > 32 ) return callback({ message: "'name' was too long" });

		state.validator.validate.email(input.email, (validEmail) => {
			state.validator.validate.phoneNumber(input.mobile, (mobileError) => {
				state.validator.validate.password(input.password, (validPassword) => {
					if ( !validEmail ) return callback({ message: "'email' was invalid" });
					if ( mobileError ) return callback({ message: "'mobile' was invalid" });
					if ( !validPassword ) return callback({ message: "'password' was invalid" });

					if ( input.creditCard === undefined || input.creditCard === null ) return callback(undefined);
					if ( typeof input.creditCard != "string" ) return callback({ message: "'creditCard' was not a string" });
					state.database.collection("CreditCards").findOne({ link: input.creditCard }, (creditCardError, creditCard) => {
						if ( creditCardError ) return callback({ message: "Error checking credit card: " + creditCardError.message });
						if ( !creditCard ) return callback({ message: "Credit card could not be found"});
						return callback(undefined);
					});
				});
			});
		});
	};



	const validateFacebookUserCreationInput = (input, callback) => {

		const validateUser = (input, callback) => {
			const requiredUserFields = ["name", "mobile", "password", "creditCard"];

			if ( !input ) return callback({ message: "'user' had no value" });
			if ( !hasExactly({ fields: requiredUserFields, in: input }) ) return callback({ message: "'user' did not specify exactly the required fields" });
			
			if ( typeof input.name != "string" ) return callback({ message: "'user.name' was not a string" });
			if ( !input.name ) return callback({ message: "'user.name' was the empty string" });
			if ( input.name.length > 32 ) return callback({ message: "'user.name' was too long" });

			state.validator.validate.phoneNumber(input.mobile, (mobileError) => {
				state.validator.validate.password(input.password, (validPassword) => {
					if ( mobileError ) return callback({ message: "'user.mobile' was invalid" });
					if ( !validPassword ) return callback({ message: "'user.password' was invalid" });

					if ( input.creditCard === undefined || input.creditCard === null ) return callback(undefined);
					if ( typeof input.creditCard != "string" ) return callback({ message: "'user.creditCard' was not a string" });
					state.database.collection("CreditCards").findOne({ link: input.creditCard }, (creditCardError, creditCard) => {
						if ( creditCardError ) return callback({ message: "Error checking credit card: " + creditCardError.message });
						if ( !creditCard ) return callback({ message: "Credit card could not be found" });
						return callback(undefined);
					});
				});
			});
		};

		const validateFacebook = (input, callback) => {
			const requiredFacebookFields = ["facebookUserId", "facebookToken"];

			if ( !input ) return callback({ message: "'facebook' had no value" });
			if ( !hasExactly({ fields: requiredFacebookFields, in: input }) ) return callback({ message: "'facebook' did not specify exactly the required fields" });	

			if ( typeof input.facebookUserId != "string" ) return callback({ message: "'facebook.facebookUserId' was not a string" });
			if ( !input.facebookUserId ) return callback({ message: "'facebook.facebookUserId' was the empty string" });

			if ( typeof input.facebookToken != "string" ) return callback({ message: "'facebook.facebookToken' was not a string" });
			if ( !input.facebookToken ) return callback({ message: "'facebook.facebookToken' was the empty string" });

			return callback(undefined);
		};

		const requiredFields = ["user", "facebook"];
		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });	

		validateUser(input.user, (userError) => {
			if ( userError ) return callback(userError);

			validateFacebook(input.facebook, (facebookError) => {
				if ( facebookError ) return callback(facebookError);

				return callback(undefined);
			});
		});
	};



	const validateOrderCreationInput = (input, callback) => {
		const requiredFields = ["expensive", "description", "paymentType", "cost", "deliveryPrice", "deliveryTime", "deliveryAddress", "pickupAddress"];

		const validateCost = (cost, callback) => {
			if ( !cost ) return callback(undefined);
			if ( typeof cost != "number"  ) return callback({ message: "'cost' was not a number" });
			if ( cost < 0 ) return callback({ message: "'cost' was negative" })
			callback(undefined);
		};

		const validateDeliveryPrice = (deliveryPrice, callback) => {
			if ( typeof deliveryPrice != "number" ) return callback({ message: "'deliveryPrice' was not a number" });
			if ( deliveryPrice < 0 ) return callback({ message: "'deliveryPrice' was negative" });
			callback(undefined);
		};

		const validateDeliveryTime = (deliveryTime, callback) => {
			const requiredDeliveryTimeFields = ["earliest", "latest"];
			if ( !deliveryTime  ) return callback(undefined);
			if ( !hasExactly({ fields: requiredDeliveryTimeFields, in: deliveryTime }) ) return callback({ message: "'deliveryTime' did not specify exactly the required fields" });

			if ( typeof deliveryTime.earliest != "number" ) return callback({ message: "'deliveryTime.earliest' was not a number" });
			if ( typeof deliveryTime.latest != "number" ) return callback({ message: "'deliveryTime.latest' was not a number" });
			if ( deliveryTime.earliest > deliveryTime.latest ) return callback({ message: "'deliveryTime.earliest' was later than 'deliveryTime.latest'" });
			if ( deliveryTime.latest - deliveryTime.earliest < 1000 * 60 * 15 ) return callback({ message: "'deliveryTime' was less than a 15 minute interval" });
			return callback(undefined);
		};

		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });

		if ( typeof input.expensive != "boolean" ) return callback({ message: "'expensive' was not a boolean" });

		if ( typeof input.description != "string" ) return callback({ message: "'description' was not a string" });
		if ( !input.description ) return callback({ message: "'description' was the empty string" });
		if ( input.description.length > 500 ) return callback({ message: "'description' was too long" });

		if ( typeof input.paymentType != "string" ) return callback({ message: "'paymentType' was not a string" });
				if ( input.paymentType !== "Cash" && input.paymentType !== "MobilePay" ) return callback({ message: "'paymentType' was not recognised" });

		validateCost(input.cost, (costError) => {
			validateDeliveryPrice(input.deliveryPrice, (deliveryPriceError) => {
				validateDeliveryTime(input.deliveryTime, (deliveryTimeError) => {
					state.validator.validate.address(input.deliveryAddress, (deliveryAddressError) => {
						state.validator.validate.address(input.pickupAddress, (pickupAddressError) => {
							if ( costError ) return callback(costError);
							if ( deliveryPriceError ) return callback(deliveryPriceError);
							if ( deliveryTimeError ) return callback(deliveryTimeError);
							if ( deliveryAddressError ) return callback({ message: "'deliveryAddress' was invalid" });
							if ( pickupAddressError ) return callback({ message: "'pickupAddress' was invalid" });

							return callback(undefined);
						});
					})
				});
			});
		});
	};



	const validateAddress = (address, callback) => {
		const requiredAddressFields = ["name", "coordinate"];
		if ( !address ) return callback({ message: "No address" });
		if ( !hasExactly({ fields: requiredAddressFields, in: address }) ) return callback({ message: "Did not specify exactly the required fields" });

		if ( typeof address.name != "string" ) return callback({ message: "'name' was not a string" });
		if ( !address.name ) return callback({ message: "'name' was the empty string" });

		if ( !address.coordinate ) return callback({ message: "'coordinate' had no value" });
		
		if ( typeof address.coordinate.latitude != "number" ) return callback({ message: "'coordinate.latitude' was not a number" });
		if ( address.coordinate.latitude < -90 || address.coordinate.latitude > 90 ) return callback({ message: "'coordinate.latitude' was invalid" });

		if ( typeof address.coordinate.longitude != "number" ) return callback({ message: "'coordinate.longitude' was not a number" });
		if ( address.coordinate.longitude < -180 || address.coordinate.longitude > 180 ) return callback({ message: "'coordinate.longitude' was invalid" });
		return callback(undefined);
	};



	const validateBidCreationInput = (orderId, userId, input, callback) => {
		const requiredFields = ["deliveryPrice", "deliveryTime"];

		const validateDeliveryTime = (order, deliveryTime, callback) => {
			if ( typeof deliveryTime != "number" ) return callback({ message: "'deliveryTime' was not a number" });
			if ( !order.deliveryTime ) return callback(undefined);

			if ( deliveryTime < order.deliveryTime.earliest ) return callback({ message: "'deliveryTime' is too early" });
			if ( deliveryTime > order.deliveryTime.latest ) return callback({ message: "'deliveryTime' is too late" });
			return callback(undefined);
		};

		if ( !orderId ) return callback({ message: "No order id" });
		if ( !userId ) return callback({ message: "No user id" });
		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });

		if ( typeof input.deliveryPrice != "number" ) return callback({ message: "'deliveryPrice' was not a number" });
		if ( input.deliveryPrice < 0 ) return callback({ message: "'deliveryPrice' was negative" });

		state.database.collection("Bids").findOne({ userId: userId, orderId: orderId,  }, (bidError, existingBid) => {
    		if ( bidError ) return callback({ message: "Error checking bid: " + bidError.message});
    		if ( existingBid ) return callback({ message: "User had already bid on order" });

    		state.database.collection("Bids").find({ userId: userId }).toArray((bidError, bids) => {
    			if ( bidError ) return callback({ message: "Error checking bids: " + bidError.message });
    			const activeBids = bids.filter((bid) => { return state.calendar.now() <= bid.scheduledDeliveryTime });
    			if ( activeBids.length >= 2 ) return callback({ message: "User has already got two active bids" });

	    		state.database.collection("Users").findOne({ _id: userId }, (userError, user) => {
					if ( userError ) return callback({ message: "Error checking user: " + userError.message });
					if ( !user ) return callback({ message: "User could not be found" });
					if ( user.orders.indexOf(orderId) !== -1 ) return callback({ message: "Users cannot bid on their own orders" });

					state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
						if ( orderError ) return callback({ message: "Error loading order: " + orderError.message });
						if ( !order ) return callback({ message: "Order could not be found" });
						if ( order.state != "Pending" ) return callback({ message: "Order was not in a pending state" });

						validateDeliveryTime(order, input.deliveryTime, (deliveryTimeError) => {
							if ( deliveryTimeError ) return callback(deliveryTimeError);

							return callback(undefined);
						});
					});
				});
    		});
		});
	};



	const validateOrderChangeInput = (orderId, userId, input, callback) => {
		const actions = ["Accept", "Cancel", "Start", "PickUp", "Deliver", "Receive"];
		if ( !orderId ) return callback({ message: "No order id" });
		if ( !userId ) return callback({ message: "No user id" });
		if ( !input ) return callback({ message: "No input" });
		if ( actions.indexOf(input.action) === -1 ) return callback({ message: "'action' was not recognised" });

		const validateAccept = (callback) => {
			const requiredAcceptFields = ["action", "bidId"];
			if ( input.action !== "Accept" ) return callback(undefined);
			if ( !hasExactly({ fields: requiredAcceptFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields to accept" });
			if ( typeof input.bidId != "string" ) return callback({ message: "'bidId' was not a string" });

			state.database.collection("Users").findOne({ _id: userId, orders: { $in: [orderId] } }, (userError, user) => {
				if ( userError ) return callback({ message: "Error checking user: " + userError.message });
				if ( !user ) return callback({ message: "User was not the owner of the order" });

				state.database.collection("Orders").findOne({ _id: orderId, bids: { $in: [input.bidId] } }, (orderError, order) => {
					if ( orderError ) return callback({ message: "Error checking order: " + orderError.message });
					if ( !order ) return callback({ message: "Order did not contain bid" });
					if ( order.state !== "Pending" ) return callback({ message: "Order was not in the pending state" });

					callback(undefined);
				});
			});
		};

		const validateCancel = (callback) => {
			const requiredCancelFields = ["action"];
			if ( input.action !== "Cancel" ) return callback(undefined);
			if ( !hasExactly({ fields: requiredCancelFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields to cancel" });

			state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
				if ( orderError ) return callback({ message: "Error checking order: " + orderError.message });
				if ( !order ) return callback({ message: "Order could not be found" });
				if ( order.state !== "Accepted" ) return callback({ message: "Order was not in the accepted state" });

				state.database.collection("Users").findOne({ _id: userId, bids: { $in: [order.acceptedBid] } }, (userError, user) => {
					if ( userError ) return callback({ message: "Error checking user: " + userError.message });
					if ( !user ) return callback({ message: "User was not the winner of the order" });

					callback(undefined);
				});
			});
		};

		const validateStart = (callback) => {
			const requiredStartFields = ["action"];
			if ( input.action !== "Start" ) return callback(undefined);
			if ( !hasExactly({ fields: requiredStartFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields to start" });

			state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
				if ( orderError ) return callback({ message: "Error checking order: " + orderError.message });
				if ( !order ) return callback({ message: "Order could not be found" });
				if ( order.state !== "Accepted" ) return callback({ message: "Order was not in the accepted state" });

				state.database.collection("Users").findOne({ _id: userId, bids: { $in: [order.acceptedBid] } }, (userError, user) => {
					if ( userError ) return callback({ message: "Error checking user: " + userError.message });
					if ( !user ) return callback({ message: "User was not the winner of the order" });

					callback(undefined);
				});
			});
		};

		const validateReceive = (callback) => {
			const requiredReceiveFields = ["action", "rating"];
			const validRatings = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
			if ( input.action !== "Receive" ) return callback(undefined);
			if ( !hasExactly({ fields: requiredReceiveFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields to receive" });

			const validateRating = (rating, callback) => {
				if ( rating == undefined ) return callback(undefined);
				if ( validRatings.indexOf(rating) === -1 ) return callback({ message: "'rating' was invalid" });
				callback(undefined);
			};

			validateRating(input.rating, (ratingError) => {
				if ( ratingError ) return callback(ratingError);

				state.database.collection("Orders").findOne({ _id: orderId }, (orderError, order) => {
					if ( orderError ) return callback({ message: "Error checking order: " + orderError.message });
					if ( !order ) return callback({ message: "Order could not be found" });
					if ( order.state !== "Started" && order.state !== "PickedUp" && order.state !== "Delivered" ) return callback({ message: "Order was in neither the started, picked up, or delivered state" });

					state.database.collection("Users").findOne({ _id: userId, orders: { $in: [orderId] } }, (userError, user) => {
						if ( userError ) return callback({ message: "Error checking user: " + userError.message });
						if ( !user ) return callback({ message: "User was not the owner of the order" });

						callback(undefined);
					});
				});
			});
		};

		validateAccept((acceptError) => {
			validateCancel((cancelError) => {
				validateStart((startError) => {
					validateReceive((receiveError) => {
						if ( acceptError ) return callback({ message: "Error accepting order: " + acceptError.message });
						if ( cancelError ) return callback({ message: "Error cancelling order: " + cancelError.message });
						if ( startError ) return callback({ message: "Error starting order: " + startError.message });
						if ( receiveError ) return callback({ message: "Error receiving order: " + receiveError.message });
						callback(undefined);
					});
				});
			});
		});
	};



	const validateUserChangeInput = (input, callback) => {
		const possibleFields = ["name", "mobile", "description", "activeDeliverer"];

		const validateName = (name, callback) => {
			if ( !input.hasOwnProperty("name") ) return callback(undefined);

			if ( typeof name != "string" ) return callback({ message: "'name' was not a string" });
			if ( name.length > 32 ) return callback({ message: "'name' was too long" });
			return callback(undefined);
		};

		const validateMobile = (mobile, callback) => {
			if ( !input.hasOwnProperty("mobile") ) return callback(undefined);
			state.validator.validate.phoneNumber(mobile, (error) => {
				if ( error ) return callback({ message: "'mobile' was invalid" });
				callback(undefined);
			});
		}

		const validateDescription = (description, callback) => {
			if ( !input.hasOwnProperty("description") ) return callback(undefined);

			if ( typeof description != "string" ) return callback({ message: "'description' was not a string" });
			if ( description.length > 1000 ) return callback({ message: "'description' was too long" });
			return callback(undefined);
		};

		const validateActiveDeliverer = (activeDeliverer, callback) => {
			if ( !input.hasOwnProperty("activeDeliverer") ) return callback(undefined);

			if ( typeof activeDeliverer != "boolean" ) return callback({ message: "'activeDeliverer' was not a boolean" });
			return callback(undefined);
		};

		if ( !input ) return callback({ message: "No input" });
		if ( Object.getOwnPropertyNames(input).length === 0 ) return callback({ message: "No fields specified" });
		if ( !hasOnly({ fields: possibleFields, in: input }) ) return callback({ message: "Unknown fields specified" });

		validateName(input.name, (nameError) => {
			validateMobile(input.mobile, (mobileError) => {
				validateDescription(input.description, (descriptionError) => {
					validateActiveDeliverer(input.activeDeliverer, (activeDelivererError) => {
						if ( nameError ) return callback(nameError);
						if ( mobileError ) return callback(mobileError);
						if ( descriptionError ) return callback(descriptionError);
						if ( activeDelivererError ) return callback(activeDelivererError);
						return callback(undefined);
					});
				});
			});
		});
	};



	const validateUserAvatarChangeInput = (input, callback) => {
		const requiredFields = ["image"];
		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });
			
		state.validator.validate.image(input.image, (validImage) => {
			if ( !validImage ) return callback({ message: "'image' was invalid" });
			return callback(undefined);
		});
	};



	const validateLoginChallengeCreationInput = (input, callback) => {
		const requiredFields = ["email"];
		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });

		state.validator.validate.email(input.email, (validEmail) => {
			if ( !validEmail ) return callback({ message: "'email' was invalid" });
			
			return callback(undefined);
		});
	};



	const validateLoginChallengeVerificationInput = (input, callback) => {
		const requiredFields = ["secret"];
		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });

		state.validator.validate.secret(input.secret, (secretError) => {
			if ( secretError ) return callback(secretError);
			callback(undefined);
		});
	};



	const validateSecret = (secret, callback) => {
		if ( typeof secret != "string" ) return callback({ message: "Secret was not a string" });
		if ( secret.length != 6 ) return callback({ message: "Secret was not 6 characters long" });

		state.database.collection("Challenges").findOne({ secret: secret }, (error, challenge) => {
			if ( error ) return callback({ message: "Error verifying challenge: " + error.message });
			if ( !challenge ) return callback({ message: "Challenge failed" });

			const now = state.calendar.now();
			const expirationDate = new Date(challenge.expires);
			state.validator.validate.notPastDeadline(now, expirationDate, (validDate) => {
				if ( !validDate ) return callback({ message: "Challenge has expired" });
				return callback(undefined);
			});
		});
	};



	const validateLoginChangeInput = (input, callback) => {
		const requiredFields = ["secret", "password"];
		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });

		state.validator.validate.secret(input.secret, (secretError) => {
			state.validator.validate.password(input.password, (validPassword) => {
				if ( secretError ) return callback(secretError);
				if ( !validPassword ) return callback({ message: "Password was invalid" });
				return callback(undefined);
			});
		});
	};



	const validateCreditCardCreationInput = (input, callback) => {
		const requiredFields = ["cardNumber", "month", "year", "cvc"];
		if ( !input ) return callback({ message: "No input" });
		if ( !hasExactly({ fields: requiredFields, in: input }) ) return callback({ message: "Did not specify exactly the required fields" });

		if ( typeof input.cardNumber != "string" ) return callback({ message: "'cardNumber' was not a string" });
		if ( input.cardNumber.length != 16 ) return callback({ message: "'cardNumber' was not 16 characters long" });
		if ( input.cardNumber.match(/[^$,.\d]/) ) return callback({ message: "'cardNumber' contained invalid characters" });

		if ( typeof input.month != "string" ) return callback({ message: "'month' was not a string" });
		if ( input.month.length != 2 ) return callback({ message: "'month' was not 2 characters long" });
		if ( input.month.match(/[^$,.\d]/) ) return callback({ message: "'month' contained invalid characters" });

		const monthNumber = parseInt(input.month);
		if ( monthNumber < 1 || monthNumber > 12 ) return callback({ message: "'month' was invalid" });

		if ( typeof input.year != "string" ) return callback({ message: "'year' was not a string" });
		if ( input.year.length != 2 ) return callback({ message: "'year' was not 2 characters long" });
		if ( input.year.match(/[^$,.\d]/) ) return callback({ message: "'year' contained invalid characters" });

		if ( typeof input.cvc != "string" ) return callback({ message: "'cvc' was not a string" });
		if ( input.cvc.length != 3 ) return callback({ message: "'cvc' was not 3 characters long" });
		if ( input.cvc.match(/[^$,.\d]/) ) return callback({ message: "'cvc' contained invalid characters" });

		const yearNumber = 2000 + parseInt(input.year);

		const currentDate = state.calendar.now();
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1;

		if ( currentYear > yearNumber ) return callback({ message: "Credit card expired" });
		if ( currentYear == yearNumber && currentMonth > monthNumber ) return callback({ message: "Credit card expired recently" });

		callback();
	};



	this.validate = {};
	
	this.validate.color = validateColor;
	this.validate.password = validatePassword;
	this.validate.secret = validateSecret;
	this.validate.phoneNumber = validatePhoneNumber;
	this.validate.email = validateEmail;
	this.validate.image = validateImage;
	this.validate.userExists = validateUserExists;
	this.validate.notPastDeadline = validateNotPastDeadline;
	this.validate.address = validateAddress;

	this.validate.userCreationInput = validateUserCreationInput;
	this.validate.facebookUserCreationInput = validateFacebookUserCreationInput;
	this.validate.passwordLogin = validatePasswordLogin;
	this.validate.facebookLogin = validateFacebookLogin;
	this.validate.userCredential = validateUserCredential;
	this.validate.userCredentialHeader = validateUserCredentialHeader;
	this.validate.userChangeInput = validateUserChangeInput;
	this.validate.userAvatarChangeInput = validateUserAvatarChangeInput;
	this.validate.loginChallengeCreationInput = validateLoginChallengeCreationInput;
	this.validate.loginChallengeVerificationInput = validateLoginChallengeVerificationInput;
	this.validate.loginChangeInput = validateLoginChangeInput;
	this.validate.creditCardCreationInput = validateCreditCardCreationInput;

	this.validate.orderCreationInput = validateOrderCreationInput;
	this.validate.bidCreationInput = validateBidCreationInput;
	this.validate.orderChangeInput = validateOrderChangeInput;
	return this;
};