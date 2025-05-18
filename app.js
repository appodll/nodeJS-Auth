const express = require("express")
const mysql = require("mysql")
const multer = require('multer')
const useragent = require('express-useragent');
const { sendOTP, generateToken, isInvalidEmail, isInvalidPassword } = require("./helpers")

const upload = multer();
const app = express();

app.use(useragent.express());



var db = mysql.createConnection({
    "host": "localhost",
    "user": "root",
    "database": "flicksy",
    "password": ""
})

function getTokenInfo(token, callback) {
    db.query("SELECT * FROM tokens WHERE token = ?", [token], (err, result) => {
        const user_id = result[0]['user_id'];
        db.query('SELECT * FROM users WHERE user_id = ?', [user_id], (err, result) => {
            result[0]['token'] = token;
            callback(result[0]);
        });
    });
}


app.get("/", upload.any(), (req, res) => {
    getTokenInfo("mtlUcf4NCUKa5NsQot9HqCzYjYiiihXH", (user_info) => {
        res.send(user_info)
    })
    console.log('salam');
})


app.post("/auth", upload.any(), (req, res) => {
    var body = req.body;
    if (body['request_type'] === "register") {
        if (body['email'].trim() != "" && body['password'].trim() != "" && body['username'].trim() != "") {
            if (!isInvalidEmail(body['email'])) {
                return res.send({
                    status: "error",
                    message: "E-poçt formatı yanlışdır"
                });
            }
            if (!isInvalidPassword(body['password'])) {
                return res.send({
                    status: "error",
                    message: "Şifrə ən az 8 simvol, hərf və rəqəm içerməlidir"
                });
            }
            var query = "SELECT * FROM users WHERE email = ? OR username = ?"
            db.query(query, [body['email'], body['username']], async (err, result) => {
                if (result.length == 0) {
                    var query = "INSERT INTO users (username,email,password, created_at,otp_code,is_verified) VALUES (?, ?, ?, ?,?,?)";
                    db.query(query, [body['username'], body['email'], body['password'], new Date(), sendOTP(body['email']), 0], (err, result) => {
                        const token = generateToken(32);
                        var query = "SELECT * FROM users WHERE email = ?";
                        db.query(query, [body['email']], (err, result) => {
                            const user_id = result[0]['user_id'];
                            const userInfo = result[0];
                            var query = "INSERT INTO tokens (user_id, token) VALUES (?,?)";
                            db.query(query, [user_id, token], (err, result) => {
                                var query = "INSERT INTO device_info (user_id, device_type, os, os_version, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)";
                                const device = req.useragent;
                                let device_type = 'Unknown';
                                if (device['isWindows'] == true) {
                                    device_type = 'Windows'
                                } else if (device['isLinux'] == true) {
                                    device_type = 'Linux'
                                } else if (device['isMac'] == true) {
                                    device_type = 'Mac'
                                } else if (device['isMobile'] == true) {
                                    device_type = 'Mobile'
                                }
                                db.query(query, [user_id, device_type, device['os'], device['version'], req.ip, new Date()], (err, result) => {
                                    res.send({
                                        "status": "success",
                                        "message": "Zəhmət olmasa doğrulama kodunu yoxlayın",
                                        "page": "otp",
                                        "data": userInfo
                                    })
                                })
                            })

                        })

                    })
                } else {
                    res.send({
                        "status": "warning",
                        "message": "Qeyd etdiyiniz məlumatlar bazada var"
                    })
                }
            })
        } else {
            res.send({
                "status": "error",
                "message": "Məlumatları düzgün əlavə edin"
            })
        }

    } else if (body['request_type'] === "login") {
        if (body['username/email'].trim() != "" && body['password'].trim() != "") {
            if (body['username/email'].includes("@")) {
                if (!isInvalidEmail(body['username/email'])) {
                    return res.send({
                        status: "error",
                        message: "E-poçt formatı yanlışdır"
                    });
                }
                if (!isInvalidPassword(body['password'])) {
                    return res.send({
                        status: "error",
                        message: "Şifrə ən az 8 simvol, hərf və rəqəm içerməlidir"
                    });
                }
                var query = "SELECT * FROM users WHERE email = ? AND password = ?"
            } else {
                if (!isInvalidPassword(body['password'])) {
                    return res.send({
                        status: "error",
                        message: "Şifrə ən az 8 simvol, hərf və rəqəm içerməlidir"
                    });
                }
                var query = "SELECT * FROM users WHERE username = ? AND password = ?"
            }
            db.query(query, [body['username/email'], body['password']], (err, result) => {
                if (result.length === 0) {
                    return res.send({
                        "status": "error",
                        "message": "Zəhmət olmasa məlumatları düzgün yazın",
                    })
                }
                if (result[0]['is_verified'] == 0) {
                    sendOTP(result[0]['email'])
                    res.send({
                        "status": "success",
                        "message": "Zəhmət olmasa doğrulama kodunu yoxlayın",
                        "page": "otp",
                        "data": result[0]
                    })
                } else {
                    res.send({
                        "status": "success",
                        "message": "Xoş gəldiniz",
                        "page": "",
                        "data": result[0]
                    })
                }

            })
        }
    } else if (body['request_type'] === "check_pin_code") {
        var query = "SELECT * FROM users WHERE user_id = ?"
        db.query(query, [body['user_id']], (err, result) => {
            var user_info = result[0]
            if (result[0]["otp_code"] == body['pin_code']) {
                var query = "UPDATE users SET is_verified = 1 WHERE user_id = ?";
                db.query(query, [body['user_id']], (err, result) => {
                    db.query("SELECT * FROM tokens WHERE user_id = ?", [user_info['user_id']], async (err, result) => {
                        user_info['token'] = result[0]['token']

                        return res.send({
                            status: "success",
                            message: "Doğrulama uğurla tamamlandı",
                            data: user_info
                        });
                    })

                })
            } else {
                return res.send({
                    status: "warning",
                    message: "Doğrulama kodu sehvdir"
                });
            }
        })
    } else if (body['request_type'] === "resend_pin_code") {
        db.query("SELECT * FROM users WHERE user_id = ?", [body['user_id']], (err, result) => {
            db.query("UPDATE users SET otp_code = ? WHERE user_id = ?", [sendOTP(result[0]['email']), result[0]['user_id']], (err, result) => {
                res.send({
                    status: "success",
                    message: "Doğrulama kodu yeniden gonderildi"
                });
            })
        })
    }

})


app.listen(8000)
