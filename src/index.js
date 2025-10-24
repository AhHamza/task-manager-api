const app = require('./app');
const http = require('http');
const cron = require('node-cron');
const Task = require('./models/task');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const server = http.createServer(app);
const port = process.env.PORT || 3000;

server.listen(port, () => console.log(`Server running on port ${port}`));

/* ------------------ CRON REMINDERS ------------------ */
cron.schedule('* * * * *', async () => {  // runs every minute
    const now = new Date();
    const tasks = await Task.find({ reminder: { $lte: now } }).populate('owner');

    for (const task of tasks) {
        if (task.owner && task.owner.email) {
            // Send email
            const msg = {
                to: task.owner.email,
                from: process.env.FROM_EMAIL,
                subject: '⏰ Task Reminder',
                text: `Reminder: "${task.description}" scheduled at ${task.reminder}`,
                html: `<p>Reminder: <strong>${task.description}</strong></p>
                       <p>Scheduled at: ${task.reminder}</p>`
            };

            try {
                await sgMail.send(msg);
                console.log(`Email sent for task: ${task.description} -> ${task.owner.email}`);
            } catch (err) {
                console.error('SendGrid error:', err);
            }
        }

        // Clear reminder after sending
        task.reminder = null;
        await task.save();
    }
});
