const sgMail = require('@sendgrid/mail')
const sendGridApiKey = process.env.SEND_GRID_API_KEY;

sgMail.setApiKey(sendGridApiKey);

const sendWelcomeEmail =  (name, email) => {
     sgMail.send({
        to: email,
        from: "hackitsaurabh@gmail.com",
        subject: "Welcome",
        html: `<strong>Hi ${name}, welcome to our application.</strong>`
    });
}
const sendCancelEmail =  (name, email) => {
     sgMail.send({
        to: email,
        from: "hackitsaurabh@gmail.com",
        subject: "We are sorry",
        html: `<strong>Hi ${name}, sorry to see you go.</strong>`
    });
}

module.exports = {
    welcome:sendWelcomeEmail,
    cancel:sendCancelEmail
};