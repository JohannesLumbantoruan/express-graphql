const jwt = require('jsonwebtoken');

function authenticate(token) {
    // const token = req.get('Authorization')?.split(' ')[1];

    const result = jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            const error = new Error(err.name);
            error.code = 401;
            // return next(error)
            return error;
        }

        // req.user = decoded;
        // next();

        return decoded;
    });

    return result;
}

module.exports = authenticate;