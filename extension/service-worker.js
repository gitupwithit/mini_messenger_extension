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

        if (receivedData.instruction === "sendPublicKeyToUser") {
            chrome.runtime.sendMessage({ action: "publicKeyRec"});
            chrome.storage.local.set({'partnerPublicKey': receivedData.msg }, function() {
                if (chrome.runtime.lastError) {
                  console.error('Error setting public_key:', chrome.runtime.lastError);
                } else {
                  console.log('Public Key saved successfully: ', receivedData.msg)
                }
            })
            return
        }
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
            // add partner value to local storage
            chrome.storage.local.set({partnerID: receivedData.toID}, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error setting partnerID:', chrome.runtime.lastError);
                } else {
                    console.log('partnerID saved successfully');
                }
            });
            // generateKeyPair()
            return;
        }
        if (receivedData.instruction === "partnerAddedIsNotInDb") {
            chrome.runtime.sendMessage({ action: "partnerAddedIsNotInDb"});
            chrome.storage.local.set({partnerID: receivedData.toID}, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error setting partnerID:', chrome.runtime.lastError);
                } else {
                    console.log('partnerID saved successfully');
                }
            });
            // generateKeyPair() // don't do this until partner is in server DB
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
    if (message.action === "generateKeyPair"){
        generateKeyPair();
    }
    if (message.action === "getUserID"){
        getUserId(message.token);
    }
    if (message.action === "getPartnerPublicKey") {
        console.log("request partner's public key");
        getPartnerPublicKey();
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

async function getPartnerPublicKey() {
    const messageForServer = { "instruction": "getPartnerPublicKey" }
    console.log("messageForServer: ", messageForServer)
    socket.send(JSON.stringify(messageForServer));
}

async function encryptMessage(unencryptedMessage) {
    const data = new TextEncoder().encode("Data to encrypt");
     //check for partner public key
     chrome.storage.local.get(['partnerPublicKey'], function(items) {
        var partnerPublicKey = items.partnerPublicKey;
        if (!partnerPublicKey) {
            console.log('No public key found, getting');
            getPartnerPublicKey();
        }
        window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            publicKey, // from generateKey or importKey
            data // ArrayBuffer of data you want to encrypt
        )
        .then((encrypted) => {
            // Returns an ArrayBuffer containing the encrypted data
            console.log(new Uint8Array(encrypted));
        })
        .catch((err) => {
            console.error(err);
        });
    })
}

async function decryptMessage(encryptedMessage) {
    // check for my private Key
    chrome.storage.local.get(['myPrivateKey'], function(items) {
        var myPrivateKey = items.myPrivateKey;
        if (!myPrivateKey) {
            console.log('No private key found.');
            return
        }
        window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
            },
            privateKey, // from generateKey or importKey
            encryptedData // ArrayBuffer of the data to be decrypted
        )
        .then((decrypted) => {
            // Returns an ArrayBuffer containing the decrypted data
            console.log(new TextDecoder().decode(decrypted));
        })
        .catch((err) => {
            console.error(err);
        });
    });
}

async function validateToken(accessToken) {
    console.log("accesstoken:", accessToken)
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
        console.log("access token valid response", response)
        return response.status === 200;
      } catch (error) {
        console.error('Error validating token:', error);
        return false;
      }
}

async function getPartnerPublicKey() {
    chrome.storage.local.get(['partnerPublicKey'], function(result) {
        console.log("partner public key search result:", result)
        if (result.partnerPublicKey) {
            // token found and partner's public key found, get messages now
            // showMessages();
        } else {
            // fetch partner's public token
            console.log("no public key for partner found, fetching")
            chrome.runtime.sendMessage({ action: "getPartnerPublicKey" } )
        }
    })
}

// generate public and private key, send public to server, store private
async function generateKeyPair() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: "SHA-256" },
            },
            true, // Keys are extractable
            ["encrypt", "decrypt"]
        );

        // Export and store the private key
        const privateKey = await exportPrivateKey(keyPair.privateKey);
        chrome.storage.local.set({'myPrivateKey': privateKey}, function() {
            if (chrome.runtime.lastError) {
                console.error('Error setting private_key:', chrome.runtime.lastError);
            } else {
                console.log('Private Key saved successfully');
                
            }
        });

        // Export public key and send to server
        const publicKey = await exportPublicKey(keyPair.publicKey);
        const messageForServer = {"instruction": "sendPublicKeyToPartner", "message": publicKey};
        console.log("messageForServer", messageForServer);
        socket.send(JSON.stringify(messageForServer));
    } catch (err) {
        console.error("Error generating key pair:", err);
    }
}

async function exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
}

async function exportPrivateKey(key) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
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
                            chrome.storage.local.remove(['token', 'refresh_token', 'userID', 'partnerID', 'myPrivateKey', 'partnerPublicKey'], function() {
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
                console.log("check for partners public key")
                chrome.storage.local.get(['partnerPublicKey'], function(items) {
                    var partnerPublicKey = items.partnerPublicKey;
                    if (!partnerPublicKey) {
                        console.log('No public key found, getting');
                        getPartnerPublicKey();
                        return
                    }
                })

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
            return false
        } else {
            chrome.storage.local.set({'token': token }, function() {
                if (chrome.runtime.lastError) {
                  console.error('Error setting access_token:', chrome.runtime.lastError);
                  resolve(false)
                } else {
                  console.log('Access token saved successfully. Token: ', token)
                  return token
                }
            })
            // console.log("get id now")
            // getUserId(token)
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
            // chrome.runtime.sendMessage({ action: "updateUserIDInLocalStorage", data: userID } )

            // checkUser(userEmail)
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
    // fix this, can't check for messages before verifying user has partner public key
    const messageToSend = {"instruction":"checkNewMessage", "userID": userID} // this also checks user first
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