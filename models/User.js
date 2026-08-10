const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    active: {
        type: Boolean,
        default: true
    },

    expiresAt: {
        type: Date,
        required: true
    },

    files: {
        "2.127": {
            type: Boolean,
            default: false
        },

        "CDNICON": {
            type: Boolean,
            default: false
        },

        "files": {
            type: Boolean,
            default: false
        }
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
