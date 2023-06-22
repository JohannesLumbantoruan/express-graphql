const authenticate = require('./authenticate');

function isAuthenticate(req, res, next) {
    const token = req.get('Authorization')?.split(' ')[1];

    const authenticated = authenticate(token);

    if (authenticated instanceof Error) {
        req.isAuthenticated = false;
        next()
    } else {
        req.isAuthenticated = true;
        req.user = authenticated;
        next();
    }
}

module.exports = isAuthenticate;