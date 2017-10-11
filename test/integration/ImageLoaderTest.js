const should = require("chai").should();
const agent = require("superagent");
const TestState = require("../../source/TestState");
const ImageLoader = require("../../source/utilities/ImageLoader");

const state = {};
const imageLoader = ImageLoader(state);



describe("ImageLoader", () => {

	beforeEach(() => {
        TestState.infuse(state);
    });


	describe("loadImage", () => {


		it("Should load image", (done) => {
            imageLoader.loadImage("http://via.placeholder.com/15x15", (error, image) => {
                const expectedImage = "iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPBAMAAADJ+Ih5AAAAG1BMVEXMzMyWlpaqqqq3t7ejo6OcnJyxsbG+vr7FxcXPXVcRAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAN0lEQVQImWNgIAswKTMwcAQoGTAwAznMAgYMDCxhbOYMAq4JDOyFHA4MAuUCDGxqIJGkBGLMAwAMYQT0Tdpz9wAAAABJRU5ErkJggg==";
                image.should.equal(expectedImage);
                done();
            });
		});


    });



});
