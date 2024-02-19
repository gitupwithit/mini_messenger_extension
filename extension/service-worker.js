console.log("service-worker.js loaded")

const socket = new WebSocket('ws://localhost:8000');
let userID = null
let partner = null

chrome.runtime.onMessage.addListener((message, event, sender, sendResponse) => {
    if (message.action === "userSignIn") {
        console.log("user signing in");
        initiateOAuthFlow();
    }
    if (message.action === "userChoosePartner") {
        // console.log("user chose partner: ", message.event);
        const chosenPartner = message.event;
        checkPartner(chosenPartner);
    }
    if (message.action === "sendMessage") {
        console.log("send this message: ", message.event);
        const messageToSend = message.event;
        sendMessage(messageToSend);
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
    chrome.runtime.sendMessage({ action: "showChoosePartner"});
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

function checkPartner(partnerID) {
    if (partnerID === null) {
        console.log("no chosen partner, exiting")
    } else {
        console.log("check this partner: ", partnerID);
        const messageToSend = {"userID": userID, "partnerID": partnerID}
        socket.send(JSON.stringify(messageToSend));
        socket.onopen = function(event) {
            console.log("open socket")
        };
        socket.onmessage = function(event) {
            console.log(`Message from server: ${event.data}`);
        };
    }
}

function sendMessage(message) {
    if (userID === null) {
        console.log("no userID, exiting")
    } else {
        const messageToSend = {"userID": userID, "message": message}
        console.log("messageToSend; ", messageToSend)
        socket.send(JSON.stringify(messageToSend));
        socket.onopen = function(event) {
            console.log("open socket")
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
    } catch(error) {
        console.error("Error parsing message:", error);
    }
};

// Connection opened
socket.onopen = function(event) {
    console.log("Connected to the server.");
    // You can send a message to the server once the connection is open
    const helloMsg = {"userID": userID, "message": "test"};
    socket.send(JSON.stringify(helloMsg));
};

// Listen for possible errors
socket.onerror = function(error) {
    console.error("WebSocket error:", error);
};

// Handle connection close
socket.onclose = function(event) {
    console.log("Disconnected from the server.");
};
