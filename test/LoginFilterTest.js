const should = require("chai").should();
const express = require("express");
const agent = require("superagent");
const TestState = require("../source/TestState");

const state = {};
const LoginFilter = require("../source/filters/LoginFilter")(state);

const app = express();
app.get("/user-filter", LoginFilter.User, (request, response) => { response.status(200).json(response.locals.credential) });

var server = undefined;

describe("LoginFilter", () => {

	before((done) => {
		server = app.listen(4000, done);
	});

	beforeEach(() => {
		TestState.infuse(state);
	});

	after((done) => {
		server.close();
		done();
	});



	describe("User", () => {


		it("Should reject if invalid user credential", (done) => {
			state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Credential was invalid" }) };
			agent
				.get("localhost:4000/user-filter")
				.end((error, response) => {
					response.status.should.equal(401);
					response.text.should.equal("Credential was invalid");
					done();
				});
		});


		it("Should accept if valid user credential", (done) => {
			agent
				.get("localhost:4000/user-filter")
				.end((error, response) => {
					response.status.should.equal(200);
					done();
				});
		});


		it("Should pass credential to request if it accepts", (done) => {
			state.validator.validate.userCredentialHeader = (header, callback) => { return callback(undefined, "credential") };
			agent
				.get("localhost:4000/user-filter")
				.end((error, response) => {
					const requestScopedCredential = response.body;
					requestScopedCredential.should.equal("credential");
					done();
				});
		});


	});



});