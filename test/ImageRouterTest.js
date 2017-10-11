const should = require("chai").should();
const agent = require("superagent");

const TestState = require("../source/TestState");

const state = {};
const app = require("../source/Server")(state);
var server = undefined;

describe("ImageRouter", () => {

    before((done) => {
        server = app.listen(4000, done);
    });

    beforeEach(() => {
        TestState.infuse(state);
    });

    after((done) => {
        server.close(done);
    });



    describe("GET /images/:imageId", () => {
    	

    	it("Should fail if not logged in as user", (done) => {
    		state.validator.validate.userCredentialHeader = (header, callback) => { return callback({ message: "Invalid user credential" }) };
    		const imageId = "image-id";
    		agent
    			.get(`localhost:4000/images/${imageId}`)
    			.end((error, response) => {
    				response.status.should.equal(401);
    				response.text.should.equal("Invalid user credential");
    				done();
    			});
    	});


		it("Should fail if image does not exist", (done) => {
    		const imageId = "image-id";
    		agent
    			.get(`localhost:4000/images/${imageId}`)
    			.end((error, response) => {
    				response.status.should.equal(400);
    				response.text.should.equal("Image could not be found");
    				done();
    			});
		});


		it("Should return 200 when succesful", (done) => {
			state.database.collection("Images").insert({ _id: "image-id", image: "image" }, (error) => {
				should.not.exist(error);

				const imageId = "image-id";
	    		agent
	    			.get(`localhost:4000/images/${imageId}`)
	    			.end((error, response) => {
	    				response.status.should.equal(200);
	    				done();
	    			});
			});
		});


		it("Should return base64 encoded image", (done) => {
			state.database.collection("Images").insert({ _id: "image-id", image: "image" }, (error) => {
				should.not.exist(error);

				const imageId = "image-id";
	    		agent
	    			.get(`localhost:4000/images/${imageId}`)
	    			.buffer()
	    			.end((error, response) => {
	    				const expectedImage = "image";
	    				response.text.should.equal(expectedImage);
	    				done();
	    			});
			});
		});


    });



});