require("chai").should();

const moment = require("moment");
const TestState = require("../source/TestState");

const state = {};
const calendar = require("../source/utilities/Calendar")(state);



describe("Calendar", () => {


	beforeEach(() => {
		TestState.infuse(state);
	});


	describe("now", () => {


		it("Should be a later date if invoked later", (done) => {
			const firstDate = calendar.now();
			const secondDate = calendar.now();

			(firstDate <= secondDate).should.be.true;
			done();
		});


	});



	describe("minutesFromNow", () => {


		it("Should be x minutes away from now", (done) => {
			state.calendar.now = () => { return moment("18/04-2010 07:00:00", "DD/MM-YYYY HH:mm:ss").toDate() };
			const date = calendar.minutesFromNow(300);

			const expectedDate = moment("18/04-2010 12:00:00", "DD/MM-YYYY HH:mm:ss");
			moment(date).isSame(expectedDate).should.be.true;
			done();
		});


	});



	describe("hoursFromNow", () => {


		it("Should be x hours away from now", (done) => {
			state.calendar.now = () => { return moment("18/04-2010 07:00:00", "DD/MM-YYYY HH:mm:ss").toDate() };
			const date = calendar.hoursFromNow(12);

			const expectedDate = moment("18/04-2010 19:00:00", "DD/MM-YYYY HH:mm:ss");
			moment(date).isSame(expectedDate).should.be.true;
			done();
		});


	});



});