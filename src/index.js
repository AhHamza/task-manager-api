const express = require('express')
const app = express()
const port = process.env.PORT

require('./db/mongoose') //to make mongoose connect to the db
const mongoose = require('mongoose')
const usersRouter = require('./routers/users')
const tasksRouter = require('./routers/tasks')

app.use(express.json())
app.use(usersRouter)
app.use(tasksRouter)


mongoose.connection.once('open', () => {
    console.log("Connected to DB:", mongoose.connection.name);
});

app.listen(port, () => {
    console.log(`server is on port  :  ${port}`)
})

