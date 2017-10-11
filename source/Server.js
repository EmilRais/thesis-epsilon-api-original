const express = require("express");
const bodyParser = require("body-parser");
 
const LoggingFilter = require("./filters/LoggingFilter");
  
const LoginRouter = require("./routers/LoginRouter");
const UserRouter = require("./routers/UserRouter");
const OrderRouter = require("./routers/OrderRouter");
const BidRouter = require("./routers/BidRouter");
const ImageRouter = require("./routers/ImageRouter");
const CreditCardRouter = require("./routers/CreditCardRouter");

module.exports = (state) => {
	const app = express();
	app.use(bodyParser.json({ limit: "5mb" }));
	app.use(bodyParser.urlencoded({ extended: true }));

	app.use("/", LoggingFilter(state));
	app.use("/", express.static(__dirname + "/../public"));
	app.use("/login", LoginRouter(state));
	app.use("/users", UserRouter(state));
	app.use("/orders", OrderRouter(state));
	app.use("/bids", BidRouter(state));
	app.use("/images", ImageRouter(state));
	app.use("/credit-cards", CreditCardRouter(state));

	return app;
};
