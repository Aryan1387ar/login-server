const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
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

        // وضعیت سه دکمه
        enabled: {
            set1: {
                type: Boolean,
                default: false
            },

            set2: {
                type: Boolean,
                default: false
            },

            set3: {
                type: Boolean,
                default: false
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
