const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./task')
const { Binary } = require('mongodb')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        // default: 'anonymous user'

    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('invalid email')
            }
        },
    },
    password: {
        type: String,
        trim: true,
        validate(value) {
            if (value.length <= 6) {
                throw new Error('password must be greater than 6 charachters')
            }
            if (value.includes('password')) {
                throw new Error('password cannot contain the word (password)')

            }
        },

    }
    ,
    age: {
        type: Number,
        validate(value) {
            if (value < 0) {
                throw new Error('age cannot be -ve')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
})

/*relationship between tasks and users*/
//as if tasks is defined in the user schema
userSchema.virtual('tasks', {
    ref: 'Task',//schema name
    localField: '_id', //id of user
    foreignField: 'owner'//id of user in tasks
})

//statics methods

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })
    if (!user) {
        throw new Error("unable to login");
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        throw new Error("unable to login");
    }
    return user
}


//methods
userSchema.methods.toJSON = function () { // "toJSON"-> when we call res.send(user)  express
    const user = this                     // automatically calls toJSON behind the scenes

    const userObject = user.toObject()    // converts mongoose object to a normal object
    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar

    return userObject
}


userSchema.methods.generateAuthToken = async function () {
    const user = this

    const token = jwt.sign({ _id: user.id.toString() }, process.env.JSON_WEB_TOKEN)
    user.tokens = user.tokens.concat({ token })
    await user.save()

    return token
}




//activate by adding a user since it uses(save()), but with the user update
//we use (findbyidandupdate) which doesn't use (save()) and this skips the
//userSchema.pre() fn [middleware fun]
userSchema.pre('save', async function (next) { //hashes the password
    const user = this
    if (user.isModified('password')) { //if hashed without modification: rehashing it would make password unknown
        user.password = await bcrypt.hash(user.password, 8)
    }
    next()
})

//Delete user task when user is removed
userSchema.pre('remove', async function (next) {
    const user = this
    await Task.deleteMany({ owner: user._id })
    next()
})

const User = mongoose.model('User', userSchema)


module.exports = User