const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        default: 0,
        validate: (value) => {
            if (value < 0) {
                throw new Error("Age cannot be negative");
            }
        }
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        validate: value => {
            if (!validator.isEmail(value)) {
                throw new Error("Email is invalid");
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 6,
        validate: value => {
            value = value.toLowerCase();
            if (value.indexOf("password") > -1) {
                throw new Error("Password cannot contain the 'password' keyword")
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar:{
        type:Buffer
    }
}, {
    timestamps:true
});

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: "_id",
    foreignField: "owner"
})

userSchema.methods.createToken = async function () {
    const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7 days" });

    this.tokens.push({ token });
    await this.save();

    return token;
}

userSchema.methods.toJSON = function () {

    const userObject = this.toObject();

    delete userObject.tokens;
    delete userObject.password;
    delete userObject.avatar;

    return userObject;
}

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const hashedPassword = await bcrypt.hash(this.password, 8);
        this.password = hashedPassword;
    }
    next();
})

userSchema.pre('deleteOne', { document: true }, async function (next) {

    await this.populate('tasks').execPopulate();

    this.tasks.forEach(async task => {
        await task.deleteOne();
    })
    next();
})

const User = mongoose.model('User', userSchema);
module.exports = User;