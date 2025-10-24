const express = require('express')
const tasksRouter = new express.Router()
const Task = require('../models/task')
const auth = require('../middleware/auth')

tasksRouter.use(express.json())

// Create a task
tasksRouter.post('/tasks', auth, async (req, res) => {
    const myTask = new Task({
        ...req.body,
        owner: req.user._id
    })
    try {
        await myTask.save()
        res.send(myTask)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

// Get tasks with optional filters, sorting, and due reminders
tasksRouter.get('/tasks', auth, async (req, res) => {
    const match = {};
    const sort = {};

    // Filter by completion
    if (req.query.completed !== undefined) {
        match.completed = req.query.completed === 'true';
    }

    // Sorting
    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        if (parts.length === 2) {
            sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
        }
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const skip = req.query.skip ? parseInt(req.query.skip) : undefined;

    try {
        if (req.query.dueReminders === 'true') {
            const now = new Date();
            const reminders = await Task.find({
                owner: req.user._id,
                reminder: { $lte: now }
            });

            return res.send(reminders);
        }

        await req.user.populate({
            path: 'tasks',
            match,
            options: { limit, skip, sort }
        });

        res.send(req.user.tasks);
    } catch (e) {
        console.error("Get tasks error:", e);
        res.status(500).send({ error: e.message });
    }
})

// Set or update reminder
tasksRouter.patch('/tasks/:id/reminder', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
        if (!task) return res.status(404).send({ error: 'Task not found' });

        task.reminder = req.body.reminder ? new Date(req.body.reminder) : null;
        await task.save();
        res.status(200).send(task);
    } catch (e) {
        res.status(500).send({ error: 'Failed to set reminder' });
    }
})

// Other task routes (PATCH /tasks/:id, DELETE, etc.) stay the same

module.exports = tasksRouter
