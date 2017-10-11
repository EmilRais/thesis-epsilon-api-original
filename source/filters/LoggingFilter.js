module.exports = (state) => {



	const loggingFilter = (request, response, next) => {
		const oldWrite = response.write;
		const oldEnd = response.end;

		const chunks = [];

		response.write = function (chunk) {
			chunks.push(new Buffer(chunk));

		    oldWrite.apply(response, arguments);
		};

		response.end = function (chunk) {
			if (chunk)
		    	chunks.push(new Buffer(chunk));

		    const body = Buffer.concat(chunks).toString('utf8');
		    state.logger.info(`${request.method} ${request.originalUrl}:\n-> ${body}`);

		    oldEnd.apply(response, arguments);
		};

		next();
	};



	return loggingFilter;
};