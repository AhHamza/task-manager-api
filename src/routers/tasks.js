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
    const match = {};
    const sort = {};

    // Filter by completion status
    if (req.query.completed !== undefined) {
        match.completed = req.query.completed === 'true'; // req.query is always string
    }

    // Sorting
    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':'); // e.g. ?sortBy=createdAt:desc
        if (parts.length === 2) {
            sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
        }
    }

    // Pagination
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const skip = req.query.skip ? parseInt(req.query.skip) : undefined;

    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit,
                skip,
                sort
            }
        });
        res.send(req.user.tasks);
    } catch (e) {
        console.error("Get tasks error:", e); // log full error
        res.status(500).send({ error: e.message });
    }
});


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