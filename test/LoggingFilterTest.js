require("chai").should();
const agent = require("superagent");
const TestState = require("../source/TestState");

const state = {};
const app = require("../source/Server")(state);
var server = undefined;

describe("LoggingFilter", () => {

	before((done) => {
		server = app.listen(4000, done);
	})

	beforeEach(() => {
		TestState.infuse(state);
	});

	after((done) => {
		server.close();
		done();
	});


	it("Should log method and url", (done) => {
		agent
			.post("localhost:4000/some-url")
			.end((error, response) => {
				state.logger.hasLogged("POST /some-url:\n->").should.be.true;
				state.logger.hasLogged("Cannot POST /some-url").should.be.true;
				done();
			});
	});


});