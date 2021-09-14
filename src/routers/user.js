const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');

const User = require('../db/models/User');
const authMiddleware = require('../middleware/auth');
const email = require('../email/account');

const router = new express.Router();

const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter: (req, file, cb) => {
        const name = file.originalname;
        if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
            return cb(undefined, true);
        }
        cb(new Error('File must be a jpg/jpeg/png'));
    }
})


router.post('/users', async (req, res) => {
    try {
        if (!areFieldsValid(User, req.body)) {
            return res.status(400).send("Invalid Fields");
        }

        const newUser = new User(req.body);
        await newUser.save();

        const token = await newUser.createToken();

        await res.status(201).send({ user: newUser, token });
        email.welcome(req.body.name, req.body.email);
    } catch (e) {
        res.status(400).send(e.message);
    }
})

router.post('/users/login', async (req, res) => {
    try {

        if (!(req.body.email && req.body.password)) {
            return res.status(400).send();
        }

        const user = await User.findOne({ email: req.body.email })
        if (!user) {
            return res.status(400).send("Email or Password is wrong.");
        }

        const passwordMatched = await bcrypt.compare(req.body.password, user.password);
        if (!passwordMatched) {
            return res.status(400).send("Email or Password is wrong.");
        }
        const token = await user.createToken();

        await res.send({ user, token });

    } catch (e) {
        res.status(500).send();
    }
})
router.post('/users/logout', authMiddleware, async (req, res) => {
    try {

        const indexOfToken = req.user.tokens.findIndex(tokenObject => {
            return tokenObject.token === req.token
        })
        req.user.tokens.splice(indexOfToken, 1);

        await req.user.save();
        await res.send("Logged Out");

    } catch (e) {
        res.status(500).send();
    }
})

router.post('/users/logout-all', authMiddleware, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        await res.send("Logged Out from Everywhere.");

    } catch (e) {
        res.status(500).send();
    }
})

router.get('/users/me', authMiddleware, async (req, res) => {
    try {
        res.send(req.user);
    } catch (e) {
        res.send(500).send();
    }
})

router.patch('/users/me', authMiddleware, async (req, res) => {
    try {

        if (!areFieldsValid(User, req.body)) {
            return res.status(400).send("Invalid Updates")
        }

        Object.keys(req.body).forEach(update => { req.user[update] = req.body[update] });

        await req.user.save();
        await res.send({ user: req.user });

    } catch (e) {
        res.status(500).send();
    }
})

router.delete('/users/me', authMiddleware, async (req, res) => {
    try {
        await req.user.deleteOne();
        await res.send({ user: req.user });

        await email.cancel(req.user.name,req.user.email);
    } catch (e) {
        res.status(500).send();
    }
})

router.get('/users/me/avatar', authMiddleware, (req, res) => {

    if (!req.user.avatar) {
        return res.status(404).send();
    }
    res.set('Content-Type', 'image/png');
    res.send(req.user.avatar);
})

router.post('/users/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    const imageBuffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
    req.user.avatar = imageBuffer;
    await req.user.save();
    res.send();
}, (error, req, res, next) => {
    res.status(400).send(error.message);
})

router.delete('/users/me/avatar', authMiddleware, async (req, res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
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

module.exports = router;