const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

const userOneId = new mongoose.Types.ObjectId()
const userTwoId = new mongoose.Types.ObjectId()
const userOneToken = jwt.sign({ _id: userOneId }, process.env.JWT_SECRET)
const userTwoToken = jwt.sign({ _id: userTwoId }, process.env.JWT_SECRET)
const User = require('../../src/models/user')
const Task = require('../../src/models/task')

const userOne = {
    _id: userOneId,
    name: 'yassin',
    email: 'yassin@gmail.com',
    password: 'Hamza_123',
    tokens: [{
        token: userOneToken
    }]
}

const userTwo = {
    _id: userTwoId,
    name: 'ahmed',
    email: 'ahmed@gmail.com',
    password: 'Hamza_123',
    tokens: [{
        token: userTwoToken
    }]
}

const taskOne = {
    _id: new mongoose.Types.ObjectId(),
    description: 'first task',
    completed: false,
    owner: userOne._id
}
const taskTwo = {
    _id: new mongoose.Types.ObjectId(),
    description: 'Second task',
    completed: true,
    owner: userOne._id
}

const taskThree = {
    _id: new mongoose.Types.ObjectId(),
    description: 'third task',
    completed: true,
    owner: userTwo._id
}


const setUpDatabase = async () => {
    await User.deleteMany()
    await Task.deleteMany()
    await new User(userOne).save()
    await new User(userTwo).save()
    await new Task(taskOne).save()
    await new Task(taskTwo).save()
    await new Task(taskThree).save()
}

module.exports = {
    userOneId, userOne, userTwoId, userTwo, taskOne, setUpDatabase
}