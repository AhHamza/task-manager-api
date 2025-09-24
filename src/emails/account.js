const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'ahmed7okka@gmail.com',
        subject: 'welcome to the app!',
        text: `Hi ${name},how is the app ?`
    })
}

const sendEmailCancellation = (email, name) => {
    sgMail.send({
        to: email,
        from: 'ahmed7okka@gmail.com',
        subject: 'Email deletion Inquiry',
        text: `Hi ${name}, why did you leave the app ?`
    })
}

module.exports = {
    sendWelcomeEmail, sendEmailCancellation
}