<<<<<<< HEAD
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
        console.log("user chose partner: ", message.event);
        const partnerID = message.event;
        checkPartner(partnerID);
    }
    if (message.action === "sendMessageToOtherUser") {
        console.log("send this message: ", message.event);
        const messageToSend = message.event;
        sendMessageToOtherUser(messageToSend);
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
    checkUser()
}

function checkUser() {
    console.log("server to check this user:", userID)
    const messageToSend = {"userID": userID}
    socket.send(JSON.stringify(messageToSend));
    socket.onopen = function(event) {
        console.log("open socket")
    };
    socket.onmessage = function(wsEvent) {
        console.log(`Message from server: ${wsEvent.data}`);
        if (wsEvent.data === "userAdded") {
            chrome.runtime.sendMessage({ action: "showChoosePartner"});
        }
        if (wsEvent.data === "welcomeUserBack") {
            chrome.runtime.sendMessage({ action: "welcomeUserBack", event: wsEvent});
        }
    };
}

function checkPartner(partnerID) {
    if (partnerID === null) {
        console.log("no chosen partner, exiting")
    } else {
        console.log("check this partner: ", partnerID + "@gmail.com");
        const checkUserAndPartner = {"userID": userID, "toID": partnerID + "@gmail.com"}
        socket.send(JSON.stringify(checkUserAndPartner));
        socket.onopen = function(wsEvent) {
            console.log("open socket")
        };
        socket.onmessage = function(wsEvent) { 
            console.log(`Message from server: ${wsEvent.data}`);
            if (wsEvent.data === "partnerAdded") {
                chrome.runtime.sendMessage({ action: "showMessages"});
                return;
            }
            if (wsEvent.data === "partnerIsInDb") {
                chrome.runtime.sendMessage({ action: "partnerIsInDb"});
                return;
            }
            if (wsEvent.data === "partnerIsNotInDb") {
                chrome.runtime.sendMessage({ action: "partnerIsNotInDb"});
                return;
            }
            if (wsEvent.data === "messageSent") {
                chrome.runtime.sendMessage({ action: "messageSent"});
                return;
            }
            const receivedData = JSON.parse(wsEvent.data);
            console.log("received data", receivedData)
            if (receivedData) {
                console.log("valid data")
            } else {
                console.log("invalid data")
            }
            if (receivedData.instruction === "messageForUser") {
                const messageData = {"messageText": receivedData.message, "sender":receivedData.sender }
                chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
            }
            if (receivedData.instruction === "welcomeBack") {
                const messageData = {"messageText": receivedData.message}
                chrome.runtime.sendMessage({ action: "welcomeBack", event: messageData});
            }
        };
    }
}

function receiveMessageFromOtherUser() {

}

function sendMessageToOtherUser(message) {
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
    // send message to the server once connection is open
    const helloMsg = {"userID": userID, "message": "is connecting to server"};
    socket.send(JSON.stringify(helloMsg));
};

// Listen for possible errors
socket.onerror = function(error) {
    console.error("WebSocket error:", error);
};

// Handle connection close
socket.onclose = function(event) {
    console.log("Disconnected from the server.");
=======
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
        console.log("user chose partner: ", message.event);
        const partnerID = message.event;
        checkPartner(partnerID);
    }
    if (message.action === "sendMessageToOtherUser") {
        console.log("send this message: ", message.event);
        const messageToSend = message.event;
        sendMessageToOtherUser(messageToSend);
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
    checkUser()
}

function checkUser() {
    console.log("server to check this user:", userID)
    const messageToSend = {"userID": userID}
    socket.send(JSON.stringify(messageToSend));
    socket.onopen = function(event) {
        console.log("open socket")
    };
    socket.onmessage = function(event) {
        console.log(`Message from server: ${event.data}`);
        if (event.data === "userAdded") {
            chrome.runtime.sendMessage({ action: "showChoosePartner"});
        }
        if (event.data === "welcomeUserBack") {
            chrome.runtime.sendMessage({ action: "welcomeUserBack"});
        }
    };
}

function checkPartner(partnerID) {
    if (partnerID === null) {
        console.log("no chosen partner, exiting")
    } else {
        console.log("check this partner: ", partnerID + "@gmail.com");
        const checkUserAndPartner = {"userID": userID, "toID": partnerID + "@gmail.com"}
        socket.send(JSON.stringify(checkUserAndPartner));
        socket.onopen = function(event) {
            console.log("open socket")
        };
        socket.onmessage = function(event) { 
            
            console.log(`Message from server: ${event.data}`);
            if (event.data === "partnerAdded") {
                chrome.runtime.sendMessage({ action: "showMessages"});
                return;
            }
            if (event.data === "partnerIsInDb") {
                chrome.runtime.sendMessage({ action: "partnerIsInDb"});
                return;
            }
            if (event.data === "partnerIsNotInDb") {
                chrome.runtime.sendMessage({ action: "partnerIsNotInDb"});
                return;
            }
            if (event.data === "messageSent") {
                chrome.runtime.sendMessage({ action: "messageSent"});
                return;
            }
            const receivedData = JSON.parse(event.data);
            console.log("received data", receivedData)
            if (receivedData) {
                console.log("valid data")
            } else {
                console.log("invalid data")
            }
            if (receivedData.instruction === "messageForUser") {
                const messageData = {"messageText": receivedData.message, "sender":receivedData.sender }
                chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
            }
        };
    }
}

function receiveMessageFromOtherUser() {

}

function sendMessageToOtherUser(message) {
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
    // send message to the server once connection is open
    const helloMsg = {"userID": userID, "message": "is connecting to server"};
    socket.send(JSON.stringify(helloMsg));
};

// Listen for possible errors
socket.onerror = function(error) {
    console.error("WebSocket error:", error);
};

// Handle connection close
socket.onclose = function(event) {
    console.log("Disconnected from the server.");
>>>>>>> 5ccecd8d88ec9b841b77d6d1c1ff86a3cb06dc56
};