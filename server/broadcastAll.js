// send test message to all users

const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8000 });

function broadcastMessage() {
    let message = "test message"
    clients.forEach(client => {
        console.log("client readystate:", client.readyState)
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

broadcastMessage()