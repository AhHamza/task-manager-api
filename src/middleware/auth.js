const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
    try {
        console.log('inside auth middleware');
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })//user that hasn't expired
        // -> user is not just an object, but its a mongoose document that is an object+ functions added to it
        if (!user) {
            throw new Error('')
        }
        req.user = user
        req.token = token
        next() //runs the route handler
    } catch (e) {
        res.status(401).send({ error: 'please autheticate' })
    }
}

module.exports = auth