function graphiqlAuthenticate(req) {
    if (!req) {
        const err = new Error('Not authenticated');
        err.code = 401;
        throw err;
    }

    console.log('User authenticated');
}

module.exports = graphiqlAuthenticate;