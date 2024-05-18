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

        if (receivedData.instruction === "messageForPartnerSavedPartnerNotRegistered") {
            chrome.runtime.sendMessage({ action: "messageForPartnerSavedPartnerNotRegistered"});
        }
        

        if (receivedData.instruction === "userAddedSuccessfully") {
            chrome.runtime.sendMessage({ action: "userAddedSuccessfully"});
        }

        if (receivedData.instruction === "publicKeyForUser") {
            console.log("recevied partner's public key:", receivedData.data)
            chrome.runtime.sendMessage({ action: "storePartnerPublicKey", data: receivedData.data});
        } 

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
            console.log("messagedata:",messageData)
            if (receivedData.data != " " && receivedData.data != null && receivedData.data != undefined) { 
                const newMessageTorF = true;
                updateIcon(newMessageTorF);
            }
            const unencryptedMessage = decryptMessage(receivedData.message);
            if (!unencryptedMessage) {
                console.log("message not decrypted")
                return
            }
            // chrome.runtime.sendMessage({ action: "messageForUser", event: unencryptedMessage});
        }
        if (receivedData.instruction === "partnerAddedIsInDb") {
            chrome.runtime.sendMessage({ action: "partnerAddedIsInDb"});
            // add partner value to local storage
            chrome.storage.local.set({partnerID: receivedData.partnerID}, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error setting partnerID:', chrome.runtime.lastError);
                } else {
                    console.log('partnerID saved successfully');
                }
            });
            // generateKeyPair()
            return;
        }
        if (receivedData.instruction === "noPartnerPublicKeyOnServer") {
            chrome.runtime.sendMessage({ action: "noPartnerPublicKeyOnServer"});
        }
        
        if (receivedData.instruction === "partnerAddedIsNotInDb") {
            chrome.runtime.sendMessage({ action: "partnerAddedIsNotInDb"});
            chrome.storage.local.set({partnerID: receivedData.partnerID}, function() {
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
        console.log("request", message.partnerID, "'s public key");
        getPartnerPublicKey(message.partnerID);
    }
    if (message.action === "userSignOut") {
        console.log("user signing out");
        userSignOut(message.token);
    }
    if (message.action === "userSignIn") {
        console.log("user signing in");
        initiateOAuthFlow(sendResponse);
        return true;
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

async function getPartnerPublicKey(partnerID) {
    chrome.storage.local.get(['partnerPublicKey'], function(result) {
        console.log("partner public key search result:", result)
        if (result.partnerPublicKey) {
            // write partnerPublicKey to local storage
            chrome.storage.local.set({ 'partnerPublicKey': result.partnerPublicKey })
            // token found and partner's public key found, inform client
            chrome.runtime.sendMessage({ action: "partnerIsInDb"});

            // showMessages();
        } else {
            // fetch partner's public token
            console.log("no public key for partner found, fetching from server")
            chrome.storage.local.get(['partnerID'], function(result) {
                console.log("result: ", result)
                if (result.partnerID) {
                    const messageForServer = { "instruction": "getPartnerPublicKey" , "partnerID" : result.partnerID + "@gmail.com"}
                    console.log("messageForServer: ", messageForServer)
                    socket.send(JSON.stringify(messageForServer));
                }
            })
        }
    })
}

// Generate public and private key, send public to server, store private
async function generateKeyPair() {
    console.log("Generating key pair");
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: "SHA-256" },
            },
            true,  // Keys are extractable
            ["encrypt", "decrypt"]
        );

        // Export and store the private key
        const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPrivateKey)));
        const myPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
        await chrome.storage.local.set({ 'myPrivateKey': myPrivateKey });
        console.log('Private Key saved to local storage successfully');

        // Export and store public key
        const exportedPublicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublicKey)));
        const myPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
        await chrome.storage.local.set({ 'myPublicKey': myPublicKey });
        console.log('Public Key saved to local storage successfully');

        const partnerID = (await getFromStorage('partnerID')) + '@gmail.com';
        const userID = await getFromStorage('userID');
        const myPublicKeyInStorage = await getFromStorage('myPublicKey');

        if (!partnerID || !userID || !myPublicKeyInStorage) {
            console.log('Error retrieving IDs or Public Key from storage.');
            return;
        }
        // Send userID, partnerID, and myPublicKey to server
        console.log("Should send user data to server");
        const messageForServer = {
            "instruction": "sendUserDataToServer", 
            "data": {
                "userID": userID, 
                "partnerID": partnerID, 
                "publicKey": myPublicKeyInStorage
            }
        };
        console.log("Message for Server", messageForServer);
        socket.send(JSON.stringify(messageForServer));
        
    } catch (err) {
        console.error("Error generating key pair:", err);
    }
}

chrome.storage.local.get(['partnerPublicKey'], function(result) {
    console.log(result.partnerPublicKey)
});

async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function(result) {
            if (result[key]) {
                resolve(result[key]);
            } else {
                reject(`No value found for ${key}`);
            }
        });
    });
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
                            chrome.storage.local.remove(['token', 'refresh_token' ], function() {
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
    console.log("check server for new message")
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
                chrome.storage.local.get(['partnerPublicKey'], function(result) {
                    console.log("partnerPublicKey search result: ", result)
                    if (result.partnerPublicKey) {
                        console.log("partner's public key found, check server for new message")
                        const messageForServer = {"instruction": "checkNewMessage", "userID": userID}
                        socket.send(JSON.stringify(messageForServer));
                        } else {
                            console.log('No public key found, getting');
                            getPartnerPublicKey();
                            return
                        }
                    }
                )
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

function initiateOAuthFlow(sendResponse) {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        console.log("Token:", token);
        if (!token) {
            console.log("Token error, exiting");
            sendResponse({ isValid: false });
        } else {
            chrome.storage.local.set({ 'token': token }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error setting access_token:', chrome.runtime.lastError);
                    sendResponse({ isValid: false });
                } else {
                    console.log('Access token saved successfully');
                    sendResponse({ isValid: true });  // Send a successful response back
                }
            });
        }
    });
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
}

function addPartner(partnerID) {
    if (partnerID === null) {
        console.log("no chosen partner, exiting")
    } else {
        console.log("user to add this partner: ", partnerID + "@gmail.com");
        const instructionForServer = {"instruction": "addPartner", "userID": userID, "partnerID": partnerID + "@gmail.com"}
        socket.send(JSON.stringify(instructionForServer));
        // socket.onopen = function(wsEvent) {
        //     console.log("open socket")
        // };
        // socket.onmessage = function(wsEvent) { 
        //     console.log(`Message from server: ${wsEvent.data}`);
        // }
    }
}

function stripPublicKeyHeaders(key) {
    return key.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
}

function stripPrivateKeyHeaders(key) {
    return key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
}

async function decryptMessage(encryptedMessage) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['myPrivateKey'], async function(result) {
            let myPrivateKey = result.myPrivateKey;
            if (!myPrivateKey) {
                console.log('No private key found.');
                reject('No private key found.');
                return;
            }

            try {
                // Strip headers and decode key
                myPrivateKey = stripPrivateKeyHeaders(myPrivateKey);
                const binaryDer = Uint8Array.from(atob(myPrivateKey), c => c.charCodeAt(0));
                // Import the private key
                const importedPrivateKey = await crypto.subtle.importKey(
                    'pkcs8',
                    binaryDer,
                    {
                        name: "RSA-OAEP",
                        hash: { name: "SHA-256" }
                    },
                    true,
                    ["decrypt"]
                );

                // Convert base64 encoded encryptedMessage to ArrayBuffer
                const buffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0)).buffer;
                // Decrypt the message with the imported key
                const decrypted = await crypto.subtle.decrypt(
                    { name: "RSA-OAEP" },
                    importedPrivateKey,
                    buffer
                );

                // Decode and log the decrypted message
                const decodedMessage = new TextDecoder().decode(decrypted);
                console.log(decodedMessage);
                resolve(decodedMessage);
            } catch (err) {
                console.error('Decryption error:', err);
                reject(err);
            }
        });
    });
}


async function encryptMessage(unencryptedMessage, userID, partnerID, partnerPublicKey) {
    const data = new TextEncoder().encode(unencryptedMessage);
        try {
            // Strip headers and decode key
            partnerPublicKey = stripPublicKeyHeaders(partnerPublicKey);
            const binaryDer = Uint8Array.from(atob(partnerPublicKey), c => c.charCodeAt(0));

            // Import the public key
            const importedPublicKey = await crypto.subtle.importKey(
                'spki',
                binaryDer,
                {
                    name: "RSA-OAEP",
                    hash: { name: "SHA-256" }
                },
                true,
                ["encrypt"]
            );

            // Now encrypt the message with the imported key
            const encrypted = await crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                importedPublicKey,
                data
            );

            // console.log(new Uint8Array(encrypted));
            let encryptedMessage = new Uint8Array(encrypted)
            console.log("encrypted message:", encryptMessage)
            console.log("encrypted message 2:", JSON.stringify(encryptMessage))
            const messageForServer = {"instruction": "newMessageForPartner", "userID": userID, "message": encryptedMessage, "partnerID": partnerID}
            console.log("messageForServer; ", messageForServer);
            socket.send(JSON.stringify(messageForServer));
        } catch (err) {
            console.error('Encryption error:', err);
        }
}

async function sendMessageToPartner(unencryptedMessage) {
    let userID
    let partnerID
    chrome.storage.local.get(['userID'], function(result) {
        console.log("userID fetched from storage:", result.userID);
        userID = result.userID;
        if (!userID) {
            console.log("error retreiving userID");
            return;
        }
        chrome.storage.local.get(['partnerID'], function(result) {
            console.log("partnerID fetched from storage:", result.partnerID);
            partnerID = result.partnerID;
            if (!partnerID) {
                console.log("error retreiving partnerID");
                return;
            }
            chrome.storage.local.get(['partnerPublicKey'], async function(items) {
                let partnerPublicKey = items.partnerPublicKey;
                if (!partnerPublicKey) {
                    console.log('No public key found, getting');
                    await getPartnerPublicKey(); 
                    return;
                }
                encryptMessage(unencryptedMessage, userID, partnerID, partnerPublicKey)
            })
        })
    })
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