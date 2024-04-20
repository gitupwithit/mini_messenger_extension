// just for testing replit ws connectivity (it works)

const WebSocket = require('ws');

const ws = new WebSocket('wss://ba6337cd-61d4-46d5-82b2-765bd32699a3-00-22j5p6xpiquon.spock.replit.dev/');

ws.on('open', function open() {
  console.log('Connected!');
  ws.send('Hello Server!');
});

ws.on('message', function incoming(data) {
  console.log('Received:', data);
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});
    