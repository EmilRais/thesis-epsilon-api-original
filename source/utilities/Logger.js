module.exports = (state) => {

	const logger = {};
	logger.info = (message) => { console.log(message) };
	logger.error = (message) => { console.log(message) };

	return logger;
};