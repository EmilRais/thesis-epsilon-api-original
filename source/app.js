#!/usr/bin/env node
const State = require("./State");
  
const mode = process.env.NODE_ENV || "development";
const createState = mode == "production" ? State.createProductionState : State.createDevelopmentState;

createState((state) => {
	const app = require("./Server")(state);
	var server = app.listen(3000, function () {
		var port = this.address().port;
		state.logger.info(`Started server in ${mode}`);
		state.logger.info(`Listening to port ${port}`);
	});
});
