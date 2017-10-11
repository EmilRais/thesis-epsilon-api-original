const TestEngine = require("tingodb")({ memStore: true });
const MongoClient = require("mongodb").MongoClient
const Configuration = require("./Configuration");
const Random = require("randomstring");
const Validator = require("./utilities/Validator");
const Factory = require("./utilities/Factory");
const Calendar = require("./utilities/Calendar");
const ImageLoader = require("./utilities/ImageLoader");
const Mailer = require("./utilities/Mailer");
const Notification = require("./utilities/Notification");
const Logger = require("./utilities/Logger");
const QuickPay = require("./utilities/QuickPay");
const Facebook = require("./utilities/Facebook")(Configuration.facebook);

const createDevelopmentState = (callback) => {
	const database = new TestEngine.Db(`database/${Random.generate(7)}`, {});
	console.log("Using TingoDB database");

	const state = { testMode: true, production: true };
	state.database = database;
	state.validator = Validator(state);
	state.facebook = Facebook(state);
	state.logger = Logger(state);
	state.factory = Factory(state);
	state.calendar = Calendar(state);
	state.imageLoader = ImageLoader(state);
	state.mailer = Mailer(state);
	state.Notification = Notification(state);
	state.QuickPay = QuickPay(state);
	
	callback(state);
};

const createProductionState = (callback) => {
	var url = "mongodb://127.0.0.1/database";
	MongoClient.connect(url, function(error, database) {
		if ( error ) return console.log(error.message);
	  	console.log("Using MongoDB database");
	 
	 	const state = { testMode: true, production: true };
		state.database = database;
		state.validator = Validator(state);
		state.facebook = Facebook(state);
		state.logger = Logger(state);
		state.factory = Factory(state);
		state.calendar = Calendar(state);
		state.imageLoader = ImageLoader(state);
		state.mailer = Mailer(state);
		state.Notification = Notification(state);
		state.QuickPay = QuickPay(state);
		
	  	callback(state);
	});
};

module.exports.createDevelopmentState = createDevelopmentState;
module.exports.createProductionState = createProductionState;