module.exports = (state) => {



    const parse = (string) => {
        try {
            return JSON.parse(string);
        } catch (e) {
            return undefined;
        }
    };



    const userLoginFilter = (request, response, next) => {
        const header = request.get("Authorization");

        state.validator.validate.userCredentialHeader(header, (error, credential) => {
            if ( error ) return response.status(401).end(error.message);

            response.locals.credential = credential;
            next();
        });
    };

    

    const filter = {};
    filter.User = userLoginFilter;
    return filter;
};