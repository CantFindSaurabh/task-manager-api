const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const Task = require('../db/models/Task');

const router = new express.Router();

router.post('/tasks', authMiddleware, async (req, res) => {
    try {
        if (!areFieldsValid(Task, req.body)) {
            return res.status(400).send("Invalid Fields");
        }

        const newTask = new Task({ ...req.body, owner: req.user._id });
        await newTask.save();

        res.status(201).send("Task Created: " + newTask);

    } catch (e) {
        res.status(400).send(e.message);
    }
})

router.get('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        if (!isIdValid(req.params.id)) {
            return res.status(400).send("ID is invalid");
        }

        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
        if (!task) {
            return res.status(404).send("Task not found");
        }

        await res.send(task);

    } catch (e) {
        res.status(500).send();
    }
})

router.get('/tasks', authMiddleware, async (req, res) => {
    try {

        const queryParams = { owner: req.user._id };
        if (req.query.completed === 'true') {
            queryParams.completed = true;
        }
        else if (req.query.completed === 'false') {
            queryParams.completed = false;
        }

        const sortParams = {};
        if (req.query.sortBy) {
            sortParams[req.query.sortBy] = req.query.sortOrder === "descending" ? -1 : 1,
            sortParams["description"] = 1;
        }

        const tasks = await Task.find(queryParams).sort(sortParams).skip(Number(req.query.skip)).limit(Number(req.query.limit));
        console.log(tasks);
        await res.send(tasks);

    } catch (e) {
        console.log(e);
        res.status(500).send();
    }
})

router.patch('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        if (!isIdValid(req.params.id)) {
            return res.status(400).send("ID is invalid");
        }
        if (!areFieldsValid(Task, req.body)) {
            return res.status(400).send("Invalid Updates")
        }

        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
        if (!task) {
            return res.status(404).send("Task not found");
        }
        Object.keys(req.body).forEach(update => {
            task[update] = req.body[update];
        })

        await task.save();
        await res.send("Task updated: " + task);

    } catch (e) {
        res.status(500).send();
    }
})

router.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        if (!isIdValid(req.params.id)) {
            return res.status(400).send("ID is invalid");
        }

        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
        if (!task) {
            return res.status(404).send("Task not found");
        }

        await task.deleteOne();
        await res.send("Task deleted: " + task);

    } catch (e) {
        res.status(500).send();
    }
})

const areFieldsValid = (model, body) => {
    const validUpdates = Object.keys(model.schema.paths);
    validUpdates.splice(validUpdates.indexOf('_id'), 1);
    validUpdates.splice(validUpdates.indexOf('__v', 1));

    const invalidUpdates = Object.keys(body).filter(update => {
        return validUpdates.indexOf(update) == -1;
    })
    if (invalidUpdates.length > 0) {
        return false;
    }
    return true;
}
const isIdValid = id => {
    if (mongoose.Types.ObjectId.isValid(id)) return true;
    return false;
}

module.exports = router;
