require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");

const User = require("./models/User");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


// ================= MongoDB =================

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log("MongoDB Error:", err));


// ================= Admin Check =================

function checkAdmin(req, res, next) {

    const key = req.header("x-admin-key");

    if (!key || key !== process.env.ADMIN_KEY) {

        return res.status(401).json({
            success: false,
            message: "دسترسی غیرمجاز"
        });

    }

    next();
}


// ================= Login =================

app.post("/api/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "اطلاعات ناقص"
            });

        }

        const user = await User.findOne({ username });

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "کاربر وجود ندارد"
            });

        }

        if (!user.active) {

            return res.status(403).json({
                success: false,
                message: "حساب غیرفعال است"
            });

        }

        if (new Date() > user.expiresAt) {

            return res.status(403).json({
                success: false,
                message: "اشتراک تمام شده"
            });

        }

        const match = await bcrypt.compare(
            password,
            user.password
        );

        if (!match) {

            return res.status(401).json({
                success: false,
                message: "رمز اشتباه است"
            });

        }

        res.json({
            success: true,
            message: "ورود موفق",
            expiresAt: user.expiresAt,
            files: user.files
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "خطای سرور"
        });

    }

});


// ================= User File Status =================

app.get("/api/files/status/:username", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.params.username
        });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "کاربر پیدا نشد"
            });

        }

        res.json({
            success: true,
            files: user.files
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: "خطای سرور"
        });

    }

});


// ================= Change File Status =================

app.post("/api/files/status", async (req, res) => {

    try {

        const {
            username,
            file,
            enabled
        } = req.body;

        const allowedFiles = [
            "2.127",
            "CDNICON",
            "files"
        ];

        if (!allowedFiles.includes(file)) {

            return res.status(400).json({
                success: false,
                message: "نام فایل نامعتبر است"
            });

        }

        const user = await User.findOne({
            username
        });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "کاربر پیدا نشد"
            });

        }

        user.files[file] = Boolean(enabled);

        await user.save();

        res.json({
            success: true,
            files: user.files
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "خطای سرور"
        });

    }

});


// ================= Admin Add User =================

app.post("/api/admin/users", checkAdmin, async (req, res) => {

    try {

        const {
            username,
            password,
            days
        } = req.body;

        if (!username || !password || !days) {

            return res.status(400).json({
                success: false,
                message: "اطلاعات ناقص"
            });

        }

        const exist = await User.findOne({
            username
        });

        if (exist) {

            return res.json({
                success: false,
                message: "کاربر وجود دارد"
            });

        }

        const hash = await bcrypt.hash(
            password,
            10
        );

        let expires = new Date();

        expires.setDate(
            expires.getDate() + Number(days)
        );

        const user = new User({
            username,
            password: hash,
            expiresAt: expires
        });

        await user.save();

        res.json({
            success: true,
            message: "کاربر ساخته شد"
        });

    } catch (e) {

        console.log(e);

        res.status(500).json({
            success: false,
            message: "خطای سرور"
        });

    }

});


// ================= Admin Delete User =================

app.delete(
    "/api/admin/users/:username",
    checkAdmin,
    async (req, res) => {

        try {

            await User.deleteOne({
                username: req.params.username
            });

            res.json({
                success: true,
                message: "حذف شد"
            });

        } catch (err) {

            res.status(500).json({
                success: false
            });

        }

    }
);


// ================= Admin Users =================

app.get(
    "/api/admin/users",
    checkAdmin,
    async (req, res) => {

        try {

            const users = await User.find(
                {},
                "-password"
            );

            res.json({
                success: true,
                users
            });

        } catch (err) {

            res.status(500).json({
                success: false
            });

        }

    }
);


// ================= Home =================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Login Server Online"
    });

});


// ================= Server Start =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});
