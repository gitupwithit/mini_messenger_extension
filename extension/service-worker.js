console.log("service-worker.js loaded")

let socket;

let userID = null
let partner = null

function connectWebSocket() {
    // Initialize WebSocket only if it is not already open
    // console.log("socket ready:", socket.readyState)
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket('ws://localhost:8000');
        
        socket.onopen = function(event) {
            console.log("Connected to the server.");
            // Optionally, authenticate or send an initial message here
        };

        socket.onmessage = function(event) {
            console.log("Message from server:", event.data);
            // Handle incoming messages
            handleIncomingMessage(event.data);
        };

        socket.onerror = function(error) {
            console.error("WebSocket error:", error);
        };

        socket.onclose = function(event) {
            console.log("Disconnected from the server. Attempting to reconnect...");
            // Attempt to reconnect after a delay
            // setTimeout(connectWebSocket, 5000); // 5 seconds delay
        };
    }
}

connectWebSocket()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("message:", message)
    if (message.action === "validateToken") {
        console.log("validate token ", message.token);
        validateToken(message.token).then(isValid => {
            sendResponse({ isValid: isValid });
          });
        return true;
    }
    if (message.action === "userSignOut") {
        console.log("user signing out");
        userSignOut(message.token);
    }
    if (message.action === "userSignIn") {
        console.log("user signing in");
        initiateOAuthFlow();
    }
    if (message.action === "checkNewMessage") {
        checkNewMessage(message.token);
    }
    if (message.action === "userChoosePartner") {
        console.log("user chose partner: ", message.event);
        const partnerID = message.event;
        checkPartner(partnerID);
    }
    if (message.action === "sendMessageToParter") {
        console.log("send this message: ", message.event);
        const messageToSend = message.event;
        sendMessageToPartner(messageToSend);
    }
    if (message.action === "deleteMessage") {
        console.log("delete last message from: ", message.data);
        deleteMessage(message.data);
    }
    
})

// Validate the token
async function validateToken(accessToken) {
    console.log("accesstoken:", accessToken)
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
        console.log("response", response)
        return response.status === 200;
      } catch (error) {
        console.error('Error validating token:', error);
        return false;
      }
  }

function userSignOut(token) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
        'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
    console.log('User ID:', data.email);
    userID = data.email
    console.log("clear user data")
    const messageToSend = {"instruction": "clearUser", "userID": userID}
    console.log("msg", messageToSend)
    socket.send(JSON.stringify(messageToSend));
    })
    if (token) {
        fetch('https://oauth2.googleapis.com/revoke?token=' + token, {
            method: 'POST'
        })
        .then(response => {
            if(response.ok) {
                console.log('Token revoked successfully');
                chrome.storage.local.get(['token'], function(items) {
                    var oldToken = items.token; // Retrieve the stored token
                    if (oldToken) {
                        // Remove the cached token using the retrieved value
                        chrome.identity.removeCachedAuthToken({ 'token': oldToken }, function() {
                            console.log('Cached token removed successfully.');
                            // After successfully removing the cached token, clear it from local storage
                            chrome.storage.local.remove(['token', 'refresh_token'], function() {
                                console.log('Tokens removed successfully from local storage.');
                                chrome.runtime.sendMessage({ action: "confirmSignOut"});
                            });
                        });
                    } else {
                        console.log('No token found or already removed.');
                    }
                });
            } else {
                console.log('Failed to revoke token');
                chrome.storage.local.get(['token'], function(items) {
                    var oldToken = items.token; // Retrieve the stored token
                    if (oldToken) {
                        // Remove the cached token using the retrieved value
                        chrome.identity.removeCachedAuthToken({ 'token': oldToken }, function() {
                            console.log('Cached token removed successfully.');
                            // After successfully removing the cached token, clear it from local storage
                            chrome.storage.local.remove(['token', 'refresh_token'], function() {
                                console.log('Tokens removed successfully from local storage.');
                            });
                        });
                    } else {
                        console.log('No token found or already removed.');
                    }
                });
                  
            }
        })
        .catch(error => console.error('Error revoking token:', error));
    } else {
        console.log("no token found")
    }
    
}

function checkNewMessage(token) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
        'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
    console.log('User ID:', data.email);
    userID = data.email
    console.log("check for new message")
    const messageToSend = {"instruction": "checkNewMessage", "userID": userID}
    socket.send(JSON.stringify(messageToSend));
    })
}

function deleteMessage(sender) {
    console.log("saved user:", userID)
    const messageToSend = {"instruction": "deleteMessage", "user": userID, "sender": sender}
    console.log("message to server: ", messageToSend)
    socket.send(JSON.stringify(messageToSend));
}

function initiateOAuthFlow() {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        console.log("token: ", token)
        if (token === undefined) {
            console.log("token error, exiting")
            return
        } else {
            chrome.storage.local.set({'token': token }, function() {
                if (chrome.runtime.lastError) {
                  console.error('Error setting access_token:', chrome.runtime.lastError);
                } else {
                  console.log('Access token saved successfully. Token: ', token)
                }
            })
            console.log("get id now")
            getUserId(token)
        }
    })
}

function getUserId(token) {
    console.log("token to check:", token)
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
        'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("response", data)
    console.log('User ID:', data.email);
    userID = data.email
    const userEmail = userID
    checkUser(userEmail)
    })
    .catch(error => {
        console.error('Error fetching user info:', error);
    });
}

function checkUser(userEmail) {
    console.log(userEmail)
    if (userEmail != undefined && userEmail != null) {
        userID = userEmail;
    }
    console.log("server to check this user:", userID)
    const messageToSend = {"userID": userID}
    socket.send(JSON.stringify(messageToSend));
    // socket.onopen = function(event) {
    //     console.log("open socket")
    // };
    socket.onmessage = function(wsEvent) {
        console.log(`Message from server: ${wsEvent.data}`);
        const dataObject = JSON.parse(wsEvent.data);
        console.log(`dataobject: ${dataObject}`);
        // if (dataObject.instruction === "userAdded") {
            
        // }
        if (dataObject.instruction === "choosePartner") {
            chrome.runtime.sendMessage({ action: "showChoosePartner"});
        }
        if (dataObject.instruction === "partnerIsInDb") {
            chrome.runtime.sendMessage({ action: "partnerIsInDb"});
            return;
        }
        if (dataObject.instruction === "partnerAdded") {
            chrome.runtime.sendMessage({ action: "partnerAdded", event: dataObject.message});
            return;
        }
        if (dataObject.instruction === "newMessageForUser") {
            console.log("new message")
            const messageData = {"messageText": dataObject.message, "sender":dataObject.sender }
            chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
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
        // socket.onopen = function(wsEvent) {
        //     console.log("open socket")
        // };
        socket.onmessage = function(wsEvent) { 
            console.log(`Message from server: ${wsEvent.data}`);
            
            if (wsEvent.data === "partnerIsNotInDb") {
                chrome.runtime.sendMessage({ action: "partnerIsNotInDb"});
                return;
            }
            const receivedData = JSON.parse(wsEvent.data);
            if (receivedData) {
                console.log("valid data")
            } else {
                console.log("invalid data")
            }
            if (receivedData.instruction === "partnerAdded") {
                chrome.runtime.sendMessage({ action: "partnerAdded", event: receivedData.message});
                return;
            }
            if (receivedData.instruction === "welcomeBack") {
                chrome.runtime.sendMessage({ action: "welcomeBack", event: receivedData.message}); 
            }
            if (receivedData.instruction === "newMessageForUser") {
                console.log("new message")
                const messageData = {"messageText": dataObject.message, "sender":dataObject.sender }
                chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
            }
        };
    }
}

function sendMessageToPartner(message) {
    if (userID === null) {
        console.log("no userID, exiting")
    } else {
        const messageToSend = {"userID": userID, "message": message}
        console.log("messageToSend; ", messageToSend)
        socket.send(JSON.stringify(messageToSend));
        // socket.onopen = function(event) {
        //     console.log("open socket")
        // };
        // socket.onmessage = function(wsEvent) {
        //     console.log(`Message from server: `, wsEvent);
        //     const dataObject = JSON.parse(wsEvent.data);
        //     if (dataObject.instruction === "newMessageForUser") {
        //         console.log("new message")
        //         const messageData = {"messageText": dataObject.message, "sender":dataObject.sender }
        //         chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
        //     }
        //     if (wsEvent.data === "messageSent") {
        //         chrome.runtime.sendMessage({ action: "messageSent"});
        //         return;
        //     }
        //     if (dataObject.instruction === "messageForOnlineUser") {
        //         chrome.runtime.sendMessage({ action: "messageForOnlineUser", event: dataObject.data});
        //     }
        // };
    }
}

function handleIncomingMessage(event) {
    console.log("Message from server:", event.data);
    
    if (event.data === "messageSent") {
        chrome.runtime.sendMessage({ action: "messageSent"});
        return;
    }
    try {
        const message = JSON.parse(event.data);
        console.log("Parsed message:", message);
        if (message.instruction === "newMessageForUser") {
            const messageData = {"messageText": message.message, "sender":message.sender }
            chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
        }
        if (message.instruction === "messageForOnlineUser") {
            const messageData = {"messageText": message.data, "sender":message.sender }
            chrome.runtime.sendMessage({ action: "messageForOnlineUser", event: messageData});
        }
        if (message.instruction === "choosePartner") {
            chrome.runtime.sendMessage({ action: "showChoosePartner"});
            return
        }
        if (message.instruction === "messageForOnlineUser") {
            const messageData = {"messageText": message.data, "sender":message.sender }
            chrome.runtime.sendMessage({ action: "messageForOnlineUser", event: messageData});
        }

    } catch(error) {
        console.error("Error parsing message:", error);
    }

}


// // Connection opened
// socket.onopen = function(event) {
//     console.log("Connected to the server.");
//     // send message to the server once connection is open
//     // const helloMsg = {"message": "Connection to server open"};
//     // socket.send(JSON.stringify(helloMsg));
// };

// // Listen for possible errors
// socket.onerror = function(error) {
//     console.error("WebSocket error:", error);
// };

// // Handle connection close
// socket.onclose = function(event) {
//     console.log("Disconnected from the server.");
// }

function pollForNewMessages() {
    connectWebSocket()
    console.log("checking for new messages")
    chrome.storage.local.get(['token'], function(result) {
        console.log("result: ", result)
        if (result.token) {
        checkNewMessage(result.token);
        } else {
            console.log("error - token not found")
        }
    })
}

// check for new messages every minute
setInterval(pollForNewMessages, 10000);



// console.log("loaded")