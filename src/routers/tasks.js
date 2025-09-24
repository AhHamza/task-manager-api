const express = require('express')
const tasksRouter = new express.Router()
const Task = require('../models/task')
const db = require('mongodb')
const auth = require('../middleware/auth')
tasksRouter.use(express.json())//parses incoming object from a request to be used using (req.body)



tasksRouter.post('/tasks', auth, async (req, res) => {
    // const myTask = new Task(req.body)

    const myTask = new Task({
        ...req.body,
        owner: req.user._id
    })
    try {
        await myTask.save()
        res.send(myTask)
    } catch (e) {
        res.status(400).status(e)
    }
})

//GET /tasks?completed =true
//GET /tasks?limit =10&skip =20
//GET /tasks?sortBy = createdAt:desc

tasksRouter.get('/tasks', auth, async (req, res) => {
    const match = {}
    const sort = {}
    if (req.query.completed) {
        match.completed = req.query.completed === true
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }
    console.log(req.query.sortBy.split(':'));

    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip), //if limit = skip-> page completed
                sort
            }
        }) //gets the tasks that that user made
        res.send(req.user.tasks)
    } catch (e) {
        res.status(500).send(e)
    }
})

tasksRouter.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id
    try {
        const task = await Task.findOne({ _id, owner: req.user._id })
        if (!task) {
            return res.status(404).send()
        }
        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }


})


tasksRouter.patch('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id
    const updates = Object.keys(req.body)
    const validUpdates = ["description", "completed"]
    const isValidOperation = updates.every((update) => validUpdates.includes(update))
    if (!isValidOperation) {
        return res.send({ error: "invalid update" })
    }

    const task = await Task.findOne({ _id, owner: req.user._id })

    try {
        if (!task) {
            return res.status(404).send()
        }
    } catch (e) {
        res.status(400).send(e)
    }

    updates.forEach((update) => {
        task[update] = req.body[update]
    })
    await task.save()
    res.send(task)


})


tasksRouter.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })

        if (!task) {
            res.status(404).send()
        }

        res.send(task)
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = tasksRouter