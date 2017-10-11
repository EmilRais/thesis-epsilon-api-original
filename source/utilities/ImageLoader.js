const agent = require("superagent");



module.exports = (state) => {



	const loadImage = (url, callback) => {
		agent
			.get(url)
			.end((error, response) => {
				if ( error ) return callback(error);

				const image = response.body;
				if ( !image ) return callback({ message: "No image" });
				callback(undefined, image.toString("base64"));
			});
	};



	const ImageLoader = {};
	ImageLoader.loadImage = loadImage;
	return ImageLoader;
};