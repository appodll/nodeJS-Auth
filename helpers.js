const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    port: 587,
    auth: {
        user: "flicksy293@gmail.com",
        pass: "irra ogwy weow cjum"
    }
});

function generateOTP() {
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

function sendOTP(email) {
    const otp = generateOTP();

    const mailOptions = {
        from: "flicksy293@gmail.com",
        to: email,
        subject: "OTP Şifrən",
        text: `Sizin OTP şifrəniz: ${otp}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(`Error sending email: ${err}`);
        } else {
            console.log('OTP sent: ' + info.response);
        }
    });
    return otp;
}

function generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function isInvalidEmail(email) {
    const pattern = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return pattern.test(email);
}

function isInvalidPassword(password) {
    return (
        password.length >= 8 &&
        /[a-zA-Z]/.test(password) &&
        /[0-9]/.test(password)
    );
}



module.exports = { sendOTP, generateToken, isInvalidEmail, isInvalidPassword };
