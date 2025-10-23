const app = require('./app');
const http = require('http');
const cron = require('node-cron');
const Task = require('./models/task');
const io = require('socket.io'); // just require it directly

const server = http.createServer(app);

// Create Socket.io instance
const socketServer = io(server, { // <- directly call io()
    cors: {
        origin: '*', // change to your frontend URL in production
        methods: ['GET', 'POST']
    }
});

// Handle connections
socketServer.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
});

// Cron job
cron.schedule('* * * * *', async () => { // every minute
    const now = new Date();
    const tasks = await Task.find({ reminder: { $lte: now } });
    for (const task of tasks) {
        socketServer.to(task.owner.toString()).emit('reminder', task);
        task.reminder = null;
        await task.save();
    }
});

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));
