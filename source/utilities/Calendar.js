module.exports = (state) => {



	const now = () => {
		return new Date();
	};



	const minutesFromNow = (minutes) => {
		const date = state.calendar.now();
		date.setTime(date.getTime() + 1000 * 60 * minutes);
		return date;
	};



	const hoursFromNow = (hours) => {
		const date = state.calendar.now();
		date.setTime(date.getTime() + 1000 * 60 * 60 * hours);
		return date;
	};



	this.now = now;
	this.minutesFromNow = minutesFromNow;
	this.hoursFromNow = hoursFromNow;
	return this;
};