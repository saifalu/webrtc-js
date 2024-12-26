const WebSocket = require('ws');

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });
let clients = [];

server.on('connection', (socket) => {
    clients.push(socket);

    socket.on('message', (message) => {
        clients.forEach((client) => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    socket.on('close', () => {
        clients = clients.filter((client) => client !== socket);
    });
});

console.log(`Signaling server is running on ws://106.201.9.98:${PORT}`);
