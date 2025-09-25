const express = require('express')
const usersRouter = new express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const auth = require('../middleware/auth')
usersRouter.use(express.json())//parses incoming object from a request to be used using (req.body)
const multer = require('multer')
const sharp = require('sharp')
const { sendWelcomeEmail, sendEmailCancellation } = require('../emails/account')

const upload = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/(\.jpg|jpeg|png)$/)) {
            return cb(new Error('please provide jpg or jpeg or png'))
        }
        cb(undefined, true)
    }
})
usersRouter.post('/users', async (req, res) => {
    try {
        const newUser = new User(req.body)
        await newUser.save()

        sendWelcomeEmail(newUser.email, newUser.name)
        const token = await newUser.generateAuthToken()

        res.status(201).send({ newUser, token })
    } catch (e) {
        console.error("Signup error:", e) // log full error in server console

        if (e.code === 11000) {
            return res.status(400).send({ error: "Email already exists" })
        }

        res.status(400).send({ error: e.message }) // send error message instead of {}
    }
})


// const newUser = new User(req.body)
// sendWelcomeEmail(newUser.email, newUser.name)
// const token = await newUser.generateAuthToken()
// try {
//     await newUser.save()
//     res.status(201).send({ newUser, token })
// } catch (e) {
//     res.status(400).send(e)
// }



usersRouter.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user: user, token })
    } catch (e) {
        res.status(400).send()
    }
})

usersRouter.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save() //saves the user without this token
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

usersRouter.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send('All users are logged out')
    }
})

usersRouter.get('/users', async (req, res) => {
    try {
        const users = await User.find({})
        res.send({ users })
    } catch (error) {
        res.status(500).send(error)
    }
})

usersRouter.get('/users/me', auth, async (req, res) => {
    try {
        res.send({
            user: req.user
        })
    } catch (error) {
        res.status(500).send(error)
    }
})


usersRouter.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["name", "age", "email", "password"];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: "Invalid updates" });
    }

    try {
        const user = req.user

        for (const update of updates) {
            if (update === "password") {
                const isSame = await bcrypt.compare(req.body.password, user.password);
                if (!isSame) {
                    user.password = req.body.password; //updates password if they`re different
                }
            } else {
                user[update] = req.body[update]; //what did we do here
            }
        }

        await user.save(); // triggers pre('save') middleware
        res.send(user);
    } catch (e) {
        res.status(400).send(e);
    }
});


usersRouter.delete('/users/me', auth, async (req, res) => {
    try {
        sendEmailCancellation(req.user.email, req.user.name)
        await req.user.remove()
        res.send(req.user) //req.user is removed from DB not from memory
    } catch (e) {
        res.status(500).send()
    }
})

//save photo to db
usersRouter.post('/users/me/avatar', auth, upload.single('upload-profile-pic'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer //couldn't be done if we saved the pic locally in the (multer fun)
    console.log(req.file);
    await req.user.save() //save the binary image to the db
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: 'please provide a picture' })
})

//delete photo
usersRouter.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    req.status(400).send({ error: 'cannot be deleted' })
})

usersRouter.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user || !user.avatar) {
            throw new Error()
        }
        res.set('Content-Type', 'image/png')
        res.set('Content-Disposition', 'inline; filename="avatar.png"')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send()
    }
})

module.exports = usersRouter