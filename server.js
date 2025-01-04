const { Server } = require('socket.io');
const http = require('http');

// Create an HTTP server
const server = http.createServer();

const io = new Server(server, {
    cors: {
        origin: '*',  // Allow all origins or specify the front-end URL
        methods: ['GET', 'POST']
    }
});

const PORT = 8080;


server.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
});


io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    
    socket.on('message', (data) => {
        console.log(`Message from ${socket.id}:`, data);

        
        if (data.target) {
            io.to(data.target).emit('message', data);
        } else {
            socket.broadcast.emit('message', data);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
