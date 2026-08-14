require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

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


// ================= Admin Login =================

app.post("/api/admin/login", (req, res) => {

    const { password } = req.body;

    if (
        password &&
        password === process.env.ADMIN_PASSWORD
    ) {

        return res.json({
            success: true,
            message: "ورود مدیر موفق"
        });

    }

    return res.status(401).json({
        success: false,
        message: "رمز مدیریت اشتباه است"
    });

});


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

        if (!user.expiresAt || new Date() > user.expiresAt) {

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
            username: user.username,
            expiresAt: user.expiresAt,
            enabled: user.enabled
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "خطای سرور"
        });

    }

});


// ==================================================
// ================= FILE LIST =======================
// ==================================================
//
// این API تمام فایل‌های داخل:
//
// files/2.127
// files/CDNICON
// files/files
//
// را پیدا می‌کند.
//
// APK ابتدا این لیست را می‌گیرد.
// سپس فایل‌ها را یکی‌یکی دانلود می‌کند.
//

function getFilesRecursive(directory, baseDirectory, result) {

    const items = fs.readdirSync(directory, {
        withFileTypes: true
    });

    for (const item of items) {

        const fullPath = path.join(
            directory,
            item.name
        );

        if (item.isDirectory()) {

            getFilesRecursive(
                fullPath,
                baseDirectory,
                result
            );

        } else {

            const relativePath = path.relative(
                baseDirectory,
                fullPath
            );

            result.push(
                relativePath.split(path.sep).join("/")
            );

        }

    }

}


app.get("/api/files/list", (req, res) => {

    try {

        const filesDirectory = path.join(
            __dirname,
            "files"
        );

        if (!fs.existsSync(filesDirectory)) {

            return res.status(404).json({
                success: false,
                message: "پوشه files روی سرور پیدا نشد"
            });

        }

        const files = [];

        getFilesRecursive(
            filesDirectory,
            filesDirectory,
            files
        );

        res.json({
            success: true,
            count: files.length,
            files: files
        });

    } catch (err) {

        console.log("File List Error:", err);

        res.status(500).json({
            success: false,
            message: "خطا در دریافت لیست فایل‌ها"
        });

    }

});


// ================= File Status =================
//
// set1 = مجموعه اول
// set2 = مجموعه دوم
// set3 = مجموعه سوم
//

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
            enabled: user.enabled
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "خطای سرور"
        });

    }

});


// ================= Change File Status =================
//
// file = set1 / set2 / set3
// enabled = true / false
//

app.post("/api/files/status", async (req, res) => {

    try {

        const {
            username,
            file,
            enabled
        } = req.body;

        const allowedSets = [
            "set1",
            "set2",
            "set3"
        ];

        if (!username || !allowedSets.includes(file)) {

            return res.status(400).json({
                success: false,
                message: "اطلاعات نامعتبر"
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

        user.enabled[file] = Boolean(enabled);

        await user.save();

        res.json({
            success: true,
            enabled: user.enabled
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

        const expires = new Date();

        expires.setDate(
            expires.getDate() + Number(days)
        );

        const user = new User({
            username,
            password: hash,
            expiresAt: expires,

            enabled: {
                set1: false,
                set2: false,
                set3: false
            }
        });

        await user.save();

        res.json({
            success: true,
            message: "کاربر ساخته شد"
        });

    } catch (err) {

        console.log(err);

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

            console.log(err);

            res.status(500).json({
                success: false,
                message: "خطای سرور"
            });

        }

    }
);


// ================= Admin Users List =================

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

            console.log(err);

            res.status(500).json({
                success: false,
                message: "خطای سرور"
            });

        }

    }
);


// ================= Activate / Deactivate User =================

app.post(
    "/api/admin/users/:username/active",
    checkAdmin,
    async (req, res) => {

        try {

            const { active } = req.body;

            const user = await User.findOne({
                username: req.params.username
            });

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "کاربر پیدا نشد"
                });

            }

            user.active = Boolean(active);

            await user.save();

            res.json({
                success: true,
                active: user.active
            });

        } catch (err) {

            console.log(err);

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
