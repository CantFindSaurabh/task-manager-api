const jwt = require('jsonwebtoken');
const User = require('../db/models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ _id: payload._id, "tokens.token": token });
        if (!user) {
            throw new Error();
        }

        req.user = user;
        req.token = token;
        next();

    } catch (e) {
        return res.status(401).send("User Unauthorized");
    }
}
module.exports = auth;