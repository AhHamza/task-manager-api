
const express = require('express')
const cors = require('cors')
const path = require('path');
const mongoose = require('mongoose')

require('./db/mongoose') //to make mongoose connect to the db
const usersRouter = require('./routers/users')
const tasksRouter = require('./routers/tasks')
const app = express()
app.use(express.static(path.join(__dirname, '../public')));
app.use(cors())
app.use(express.json())
app.use(usersRouter)
app.use(tasksRouter)





mongoose.connection.once('open', () => {
    console.log("Connected to DB:", mongoose.connection.name);
});

module.exports = app


