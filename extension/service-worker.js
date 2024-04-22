console.log("service-worker.js loaded")

const crypto = require('crypto');

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
        };
        socket.onmessage = function(event) {
            console.log("Message from server:", event.data);
            handleIncomingServerMessage(event);
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

function handleIncomingServerMessage(event) {
    try {
        const receivedData = JSON.parse(event.data);
        if (receivedData) {
            console.log("valid data")
        } else {
            console.log("ERROR - server invalid data")
            return
        }
        console.log("Parsed message from server:", receivedData);

        // server messages:

        if (receivedData.instruction === "sendPrivateKey") {
            chrome.runtime.sendMessage({ action: "privateKeyRec"});
            chrome.storage.local.set({'privateKey': receivedData.msg }, function() {
                if (chrome.runtime.lastError) {
                  console.error('Error setting private_key:', chrome.runtime.lastError);
                } else {
                  console.log('Private Key saved successfully: ', receivedData.msg)
                }
            })
            return
        }

        sendPrivateKey

        if (receivedData.instruction === "choosePartner") {
            chrome.runtime.sendMessage({ action: "showChoosePartner"});
            return
        }
        if (receivedData.instruction === "messageSent") {
            chrome.runtime.sendMessage({ action: "messageSent"});
        }
        if (receivedData.instruction === "messageForOnlineUser") {
            const messageData = {"messageText": receivedData.message, "sender":receivedData.sender }
            if (receivedData.data != " " && receivedData.data != null && receivedData.data != undefined) { 
                const newMessageTorF = true;
                updateIcon(newMessageTorF);
            }
            const unencryptedMessage = decryptMessage(receivedData.message);
            if (!unencryptedMessage) {
                console.log("message not decrypted")
                return
            }
            chrome.runtime.sendMessage({ action: "messageForOnlineUser", event: unencryptedMessage});
            const newMessageTorF = true;
            updateIcon(newMessageTorF);
        }
        if (receivedData.instruction === "newMessageExtClosed") {
            const newMessageTorF = true;
            updateIcon(newMessageTorF);
        }
        if (receivedData.instruction === "newMessageForUser") {
            const messageData = {"messageText": receivedData.message, "sender":receivedData.sender }
            if (receivedData.data != " " && receivedData.data != null && receivedData.data != undefined) { 
                const newMessageTorF = true;
                updateIcon(newMessageTorF);
            }
            const unencryptedMessage = decryptMessage(receivedData.message);
            if (!unencryptedMessage) {
                console.log("message not decrypted")
                return
            }
            chrome.runtime.sendMessage({ action: "messageForUser", event: unencryptedMessage});
        }
        if (receivedData.instruction === "partnerAddedIsInDb") {
            chrome.runtime.sendMessage({ action: "partnerAddedIsInDb"});
            generateKeyPair()
            return;
        }
        if (receivedData.instruction === "partnerAddedIsNotInDb") {
            chrome.runtime.sendMessage({ action: "partnerAddedIsNotInDb"});
            generateKeyPair()
            return;
        }
        if (receivedData.instruction === "userHasExistingPartner") {
            chrome.runtime.sendMessage({ action: "userHasExistingPartner"});
            return;
        }
        if (receivedData.instruction === "welcomeBack") {
            chrome.runtime.sendMessage({ action: "welcomeBack", event: receivedData.message}); 
        }
    } catch(error) {
        console.error("Error parsing message:", error);
    }
}

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
    if (message.action === "userAddPartner") {
        console.log("user wants to add partner: ", message.event);
        const partnerID = message.event;
        addPartner(partnerID);
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

async function encryptMessage(unencryptedMessage) {
    //check for public key
    chrome.storage.local.get(['publicKey'], function(items) {
        var publicKey = items.publicKey;
        if (!publicKey) {
            console.log('No public key found.');
            return
        }
        const encryptedBuffer = crypto.publicEncrypt(
            {
              key: publicKey,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: "sha256",
            },
            Buffer.from(unencryptedMessage),
          );
          const encryptedMessage = encryptedBuffer.toString("base64");
          console.log("message encrypted")
          return encryptMessage
    });
}

async function decryptMessage(encryptedMessage) {
    // check for private Key
    chrome.storage.local.get(['privateKey'], function(items) {
        var privateKey = items.privateKey;
        if (!privateKey) {
            console.log('No private key found.');
            return
        }
        const decryptedBuffer = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            Buffer.from(encryptedMessage, 'base64')
        );
        const decryptedMessage = encryptedBuffer.toString("base64");
        console.log("message decrypted");
        return decryptMessage;
    });
}

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

function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
    });
    chrome.storage.local.set({'publicKey': publicKey.pem }, function() {
        if (chrome.runtime.lastError) {
          console.error('Error setting public_key:', chrome.runtime.lastError);
        } else {
          console.log('Public Key saved successfully: ', publicKey.pem)
        }
    })
    const messageForServer = {"instruction": "sendPrivateKey", "userID": userID, "privateKey": privateKey.pem}
    console.log("messageForServer", messageForServer)
    socket.send(JSON.stringify(messageForServer));
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
                const messageForServer = {"instruction": "clearUser", "userID": userID}
                console.log("messageForServer", messageForServer)
                socket.send(JSON.stringify(messageForServer));
        })
        .catch(error => {
            console.error('Error signing out:', error);
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
                const messageForServer = {"instruction": "checkNewMessage", "userID": userID}
                socket.send(JSON.stringify(messageForServer));
            })
        .catch(error => {
            console.error('Error checking new messages:', error);
        })
}

function deleteMessage(sender) {
    console.log("saved user:", userID)
    const messageForServer = {"instruction": "deleteMessage", "user": userID, "sender": sender}
    console.log("messageForServer: ", messageForServer)
    socket.send(JSON.stringify(messageForServer));
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
        console.error('Error fetching user ID:', error);
    });
}

function checkUser(userEmail) {
    console.log(userEmail)
    if (userEmail != undefined && userEmail != null) {
        userID = userEmail;
    }
    console.log("server to check this user:", userID)
    const messageToSend = {"instruction":"checkNewMessages", "userID": userID} // this also checks user first
    socket.send(JSON.stringify(messageToSend));
    // socket.onopen = function(event) {
    //     console.log("open socket")
    // };
    socket.onmessage = function(wsEvent) {
        console.log(`Message from server: ${wsEvent.data}`);
    }
    //     const dataObject = JSON.parse(wsEvent.data);
    //     console.log(`dataobject: ${dataObject}`);
    //     // if (dataObject.instruction === "userAdded") {
            
    //     // }
    //     if (dataObject.instruction === "choosePartner") {
    //         chrome.runtime.sendMessage({ action: "showChoosePartner"});
    //     }
    //     if (dataObject.instruction === "partnerIsInDb") {
    //         chrome.runtime.sendMessage({ action: "partnerIsInDb"});
    //         return;
    //     }
    //     if (dataObject.instruction === "partnerAdded") {
    //         chrome.runtime.sendMessage({ action: "partnerAdded", event: dataObject.message});
    //         return;
    //     }
    //     if (dataObject.instruction === "newMessageForUser") {
    //         console.log("new message")
    //         const messageData = {"messageText": dataObject.message, "sender":dataObject.sender }
    //         chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
    //     }
    // };
}

function addPartner(partnerID) {
    if (partnerID === null) {
        console.log("no chosen partner, exiting")
    } else {
        console.log("user to add this partner: ", partnerID + "@gmail.com");
        const instructionForServer = {"instruction": "addPartner", "userID": userID, "toID": partnerID + "@gmail.com"}
        socket.send(JSON.stringify(instructionForServer));
        // socket.onopen = function(wsEvent) {
        //     console.log("open socket")
        // };
        socket.onmessage = function(wsEvent) { 
            console.log(`Message from server: ${wsEvent.data}`);
        }
        //     const receivedData = JSON.parse(wsEvent.data);
        //     if (receivedData) {
        //         console.log("valid data")
        //     } else {
        //         console.log("invalid data")
        //     }
        //     if (receivedData.instruction === "userHasExistingPartner") {
        //         chrome.runtime.sendMessage({ action: "userHasExistingPartner"});
        //         return;
        //     }
        //     if (receivedData.instruction === "partnerAddedIsInDb") {
        //         chrome.runtime.sendMessage({ action: "partnerAddedIsInDb"});
        //         return;
        //     }
        //     if (receivedData.instruction === "partnerAddedIsNotInDb") {
        //         chrome.runtime.sendMessage({ action: "partnerAddedIsNotInDb"});
        //         return;
        //     }
        //     if (receivedData.instruction === "welcomeBack") {
        //         chrome.runtime.sendMessage({ action: "welcomeBack", event: receivedData.message}); 
        //     }
        //     if (receivedData.instruction === "newMessageForUser") {
        //         console.log("new message")
        //         const messageData = {"messageText": receivedData.message, "sender": receivedData.sender }
        //         chrome.runtime.sendMessage({ action: "messageForUser", event: messageData});
        //     }
        //     if (receivedData.instruction === "messageSent") {
        //         chrome.runtime.sendMessage({ action: "messageSent"});
        //     }
        //     if (receivedData.instruction === "messageForOnlineUser") {
        //         const messageData = {"messageText": receivedData.data, "sender":receivedData.sender }
        //         if (receivedData.data != " " && receivedData.data != null && receivedData.data != undefined) { 
        //             const newMessageTorF = true;
        //             updateIcon(newMessageTorF);
        //         }
        //         chrome.runtime.sendMessage({ action: "messageForOnlineUser", event: messageData});
        //     }
        // };
    }
}

function sendMessageToPartner(unecryptedMessage) {
    if (userID === null) {
        console.log("no userID, exiting")
        return 
    }
    const encryptedMessage = encryptMessage(unecryptedMessage)
    if (!encryptedMessage) {
        console.log("message not encrypted")
    }
    const messageForServer = {"userID": userID, "message": encryptedMessage}
    console.log("messageForServer; ", messageForServer)
    socket.send(JSON.stringify(messageForServer));
}

function updateIcon(newMessageTorF) {
    if (newMessageTorF === false) {
        return;
    }
    chrome.action.setIcon({
        path: {
            "16": "images/images2/icon-16.png",
            "48": "images/images2/icon-48.png",
            "128": "images/images2/icon-128.png"
        }
    }, () => {
        console.log('Icon updated successfully.');
    });
}

async function checkNewMessageExtClosed() {
    try {
        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({interactive: true}, token => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(token);
                }
            });
        });
        console.log('Obtained OAuth token:', token);
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log('User ID:', data.email);
        const messageForServer = { "instruction": "checkNewMessageExtClosed", "userID": data.email };
        socket.send(JSON.stringify(messageForServer));
    } catch (error) {
        console.error('Error in checkNewMessageExtClosed:', error);
    }
}

// check for new messages on loop
// setInterval(checkNewMessageExtClosed, 20000)