console.log("service-worker.js loaded")

const socket = new WebSocket('ws://localhost:8000');
let userID = null

chrome.runtime.onMessage.addListener((message, event, sender, sendResponse) => {
    if (message.action === "userSignIn") {
        console.log("user signing in")
        initiateOAuthFlow();
    }
    if (message.action === "sendMessage") {
        console.log("send this message: ", message.event)
        const messageToSend = message.event
        sendMessage(messageToSend)
    }
})

function initiateOAuthFlow() {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        console.log("token: ", token)
        if (token === undefined) {
        console.log("token error, exiting")
        } else {
            getUserId(token)
        }
    })
}

function getUserId(token) {
    chrome.runtime.sendMessage({ action: "showMessages"});
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
        'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
    console.log('User ID:', data.email);
    userID = data.email
    })
    .catch(error => {
        console.error('Error fetching user info:', error);
    });
}

function sendMessage(message) {
    if (userID === null) {
        console.log("no userID, exiting")
    } else {
        const messageToSend = {"userID": userID, "message": message}
        console.log("messageToSend; ", messageToSend)
        socket.onopen = function(event) {
            socket.send(JSON.stringify(messageToSend));
        };
        socket.onmessage = function(event) {
            console.log(`Message from server: ${event.data}`);
        };
    }
}


socket.onmessage = function(event) {
    console.log("Message from server:", event.data);

    // You can parse the message if it's in JSON format
    try {
        const message = JSON.parse(event.data);
        console.log("Parsed message:", message);
    } catch(e) {
        console.error("Error parsing message:", e);
    }
};

// Connection opened
socket.onopen = function(event) {
    console.log("Connected to the server.");
    // You can send a message to the server once the connection is open
    // socket.send("Hello Server!");
};

// Listen for possible errors
socket.onerror = function(error) {
    console.error("WebSocket error:", error);
};

// Handle connection close
socket.onclose = function(event) {
    console.log("Disconnected from the server.");
};
