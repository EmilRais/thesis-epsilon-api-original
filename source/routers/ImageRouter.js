const express = require("express");
const async = require("async");
const LoginFilter = require("../filters/LoginFilter");



module.exports = (state) => {
    const router = express.Router();
    const Login = LoginFilter(state);



    router.get("/:imageId", Login.User, (request, response) => {
        const imageId = request.params.imageId;
        state.database.collection("Images").findOne({ _id: imageId }, (error, image) => {
            if ( error ) return response.status(500).end("Error loading image: " + error.message);
            if ( !image ) return response.status(400).end("Image could not be found");

            return response.status(200).end(image.image);
        });
    });



    return router;
};