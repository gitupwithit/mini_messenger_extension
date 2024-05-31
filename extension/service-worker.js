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
            //console.log("valid data")
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
                    //console.log('partnerID saved successfully');
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
                    //console.log('partnerID saved successfully');
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

async function validateToken(accessToken) {
    //console.log("accesstoken:", accessToken)
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
        //console.log("access token valid response", response)
        return response.status === 200;
      } catch (error) {
        console.error('Error validating token:', error);
        return false;
      }
}

async function getPartnerPublicKey(userID, partnerID) {
    const messageForServer = { "instruction": "getPartnerPublicKey" , "data": { "partnerID" : partnerID } }
    console.log("messageForServer: ", messageForServer)
    socket.send(JSON.stringify(messageForServer));
}

async function generateKeyPair(data) {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: "SHA-256" },
            },
            true,
            ["encrypt", "decrypt"]
        );

        // Export and store the private key
        const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        const privateKeyBase64 = arrayBufferToBase64(exportedPrivateKey);
        console.log("Exported Private Key (base64):", privateKeyBase64);
        await chrome.storage.local.set({ 'myPrivateKey': privateKeyBase64 });

        // Verify private key storage
        const storedPrivateKey = await getFromStorage('myPrivateKey');
        if (storedPrivateKey !== privateKeyBase64) {
            console.error('Failed to verify private key storage.');
            return false;
        }

        // Similar verification for public key
        const exportedPublicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKeyBase64 = arrayBufferToBase64(exportedPublicKey);
        console.log("Exported Public Key (base64):", publicKeyBase64);
        await chrome.storage.local.set({ 'myPublicKey': publicKeyBase64 });

        const storedPublicKey = await getFromStorage('myPublicKey');
        if (storedPublicKey !== publicKeyBase64) {
            console.error('Failed to verify public key storage.');
            return false;
        }

        console.log('Key pair generated and verified successfully.');

        const messageForServer = { "instruction": "sendUserDataToServer", "data": {"userID": data.userID, "partnerID": data.partnerID, "myPublicKey": publicKeyBase64} };
        socket.send(JSON.stringify(messageForServer));
        return true;

    } catch (err) {
        console.error("Error generating key pair:", err);
        return false;
    }
}

async function decryptMessage(encryptedMessage) {
    return new Promise(async (resolve, reject) => {
        console.log("ArrayBuffer message:", encryptedMessage);
        // const buffer = base64ToArrayBuffer(encryptedMessage);
        // console.log("ArrayBuffer message:", buffer);

        chrome.storage.local.get(['myPrivateKey'], async function(result) {
            let myPrivateKey = result.myPrivateKey;
            if (!myPrivateKey) {
                console.log('No private key found.');
                reject('No private key found.');
                return;
            }

            try {
                const binaryDer = base64ToArrayBuffer(myPrivateKey);
                console.log("Binary DER:", binaryDer);
                const importedPrivateKey = await crypto.subtle.importKey(
                    'pkcs8',
                    binaryDer,
                    { name: "RSA-OAEP", hash: { name: "SHA-256" }},
                    true,
                    ["decrypt"]
                );

                console.log("Imported private key:", importedPrivateKey);

                const decrypted = await crypto.subtle.decrypt(
                    { name: "RSA-OAEP" },
                    importedPrivateKey,
                    encryptedMessage
                );
                const decodedMessage = new TextDecoder().decode(decrypted);
                console.log("Decrypted message:", decodedMessage);
                resolve(decodedMessage);
            } catch (err) {
                console.error('Decryption error:', err);
                if (err instanceof DOMException) {
                    console.log('DOMException error:', err.name, err.message);
                } else if (err instanceof Error) {
                    console.log('Error:', err.name, err.message, err.stack);
                }
                reject(err);
            }
        });
    });
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const binaryString = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    return btoa(binaryString);
}

async function encryptMessage(unencryptedMessage, userID, partnerID, partnerPublicKey) {
    const data = new TextEncoder().encode(unencryptedMessage);
    try {
        // partnerPublicKey = stripPublicKeyHeaders(partnerPublicKey);
        const binaryDer = Uint8Array.from(atob(partnerPublicKey), c => c.charCodeAt(0));

        const importedPublicKey = await crypto.subtle.importKey(
            'spki',
            binaryDer,
            { name: "RSA-OAEP", hash: { name: "SHA-256" }},
            true,
            ["encrypt"]
        );

        const encrypted = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            importedPublicKey,
            data
        );

        const encryptedMessage = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        const messageForServer = {"instruction": "newMessageForPartner", "data": {"userID": userID, "message": encryptedMessage, "partnerID": partnerID} }; 
        console.log("original message", unencryptedMessage, "successfully encrypted to:", encryptedMessage)
        socket.send(JSON.stringify(messageForServer));
    } catch (err) {
        console.error('Encryption error:', err);
    }
}

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
                //console.log('User ID:', data.email);
                userID = data.email
                console.log("clear user data")
                const messageForServer = {"instruction": "clearUser", "data":{ "userID": userID} }
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
                //console.log('Token revoked successfully');
                chrome.storage.local.get(['token'], function(items) {
                    var oldToken = items.token; // Retrieve the stored token
                    if (oldToken) {
                        // Remove the cached token using the retrieved value
                        chrome.identity.removeCachedAuthToken({ 'token': oldToken }, function() {
                            //console.log('Cached token removed successfully.');
                            // After successfully removing the cached token, clear it from local storage
                            chrome.storage.local.remove(['token', 'refresh_token' ], function() {
                                //console.log('Tokens removed successfully from local storage.');
                                chrome.runtime.sendMessage({ action: "confirmSignOut"});
                            });
                        });
                    } else {
                        //console.log('No token found or already removed.');
                    }
                });
            } else {
                //console.log('Failed to revoke token');
                chrome.storage.local.get(['token'], function(items) {
                    var oldToken = items.token; // Retrieve the stored token
                    if (oldToken) {
                        // Remove the cached token using the retrieved value
                        chrome.identity.removeCachedAuthToken({ 'token': oldToken }, function() {
                            console.log('Cached token removed successfully.');
                            // After successfully removing the cached token, clear it from local storage
                            chrome.storage.local.remove(['token', 'refresh_token'], function() {
                                //console.log('Tokens removed successfully from local storage.');
                            });
                        });
                    } else {
                        //console.log('No token found or already removed.');
                    }
                });
            }
        })
        .catch(error => console.error('Error revoking token:', error));
    } else {
        //console.log("no token found")
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
                //console.log('User ID:', data.email);
                userID = data.email
                console.log("check for partners public key")
                chrome.storage.local.get(['partnerPublicKey'], function(result) {
                    console.log("partnerPublicKey search result: ", result.partnerPublicKey)
                    if (result.partnerPublicKey) {
                        console.log("partner's public key found, check server for new message")
                        const messageForServer = {"instruction": "checkNewMessage", "data": {"userID": userID} }
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
    //console.log("saved user:", userID)
    const messageForServer = {"instruction": "deleteMessage", "data": {"user": userID, "sender": sender} }
    //console.log("messageForServer: ", messageForServer)
    socket.send(JSON.stringify(messageForServer));
}

function initiateOAuthFlow(sendResponse) {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        console.log("Token:", token);
        if (!token) {
            //console.log("Token error, exiting");
            sendResponse({ isValid: false });
        } else {
            chrome.storage.local.set({ 'token': token }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error setting access_token:', chrome.runtime.lastError);
                    sendResponse({ isValid: false });
                } else {
                    //console.log('Access token saved successfully');
                    sendResponse({ isValid: true });  // Send a successful response back
                }
            });
        }
    });
}

function getUserId(token) {
    //console.log("token to check:", token)
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
        'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
        .then(data => {
            //console.log("response", data)
            //console.log('User ID:', data.email);
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
    //console.log(userEmail)
    if (userEmail != undefined && userEmail != null) {
        userID = userEmail;
    }
    //console.log("server to check this user:", userID)
    // fix this, can't check for messages before verifying user has partner public key
    const messageToSend = {"instruction":"checkNewMessage", "userID": userID} // this also checks user first
    socket.send(JSON.stringify(messageToSend));
    // socket.onopen = function(event) {
    //     console.log("open socket")
    // };
    socket.onmessage = function(wsEvent) {
        //console.log(`Message from server: ${wsEvent.data}`);
    }
}

function addPartner(partnerID) {
    if (partnerID === null) {
        //console.log("no chosen partner, exiting")
    } else {
        //console.log("user to add this partner: ", partnerID);
        const instructionForServer = {"instruction": "addPartner", "userID": userID, "partnerID": partnerID }
        socket.send(JSON.stringify(instructionForServer));
        // socket.onopen = function(wsEvent) {
        //     console.log("open socket")
        // };
        // socket.onmessage = function(wsEvent) { 
        //     console.log(`Message from server: ${wsEvent.data}`);
        // }
    }
}

// function stripPublicKeyHeaders(key) {
//     return key.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
// }

// function stripPrivateKeyHeaders(key) {
//     return key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
// }



async function sendMessageToPartner(unencryptedMessage) {
    console.log("send this unencrypted message to partner:", unencryptedMessage)
    let userID
    let partnerID
    let partnerPublicKey
    chrome.storage.local.get(['userID'], function(result) {
        //console.log("userID fetched from storage:", result.userID);
        userID = result.userID;
        if (!userID) {
            console.log("error retreiving userID");
            return;
        }
        chrome.storage.local.get(['partnerID'], function(result) {
            //console.log("partnerID fetched from storage:", result.partnerID);
            partnerID = result.partnerID;
            if (!partnerID) {
                console.log("error retreiving partnerID");
                return;
            }
            chrome.storage.local.get(['partnerPublicKey'], async function(items) {
                partnerPublicKey = items.partnerPublicKey;
                if (!partnerPublicKey) {
                    console.log('No public key found, getting');
                    await getPartnerPublicKey(userID, partnerID);
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
        //console.log('Icon updated successfully.');
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
        //console.log('Obtained OAuth token:', token);
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        //console.log('User ID:', data.email);
        const messageForServer = { "instruction": "checkNewMessageExtClosed", "data": {"userID": data.email } };
        socket.send(JSON.stringify(messageForServer));
    } catch (error) {
        console.error('Error in checkNewMessageExtClosed:', error);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    connectWebSocket() // overkill?
    console.log("message:", message)
    if (message.action === "clearUserDataFromServer") {
        const messageForServer = { "instruction": "clearUserDataFromServer" , "data": {"userID": message.userID} }
        console.log("messageForServer: ", messageForServer)
        socket.send(JSON.stringify(messageForServer));
    }

    if (message.action === "validateToken") {
        //console.log("validate token ", message.token);
        validateToken(message.token).then(isValid => {
            sendResponse({ isValid: isValid });
          });
        return true;
    }
    if (message.action === "generateKeyPair"){
        generateKeyPair(message.data);
    }
    if (message.action === "getUserID"){
        getUserId(message.token);
    }
    if (message.action === "getPartnerPublicKey") {
        console.log("request", message.data.partnerID, "'s public key");
        getPartnerPublicKey(message.data.userID, message.data.partnerID);
    }
    if (message.action === "userSignOut") {
        //console.log("user signing out");
        userSignOut(message.token);
    }
    if (message.action === "userSignIn") {
        // console.log("user signing in");
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

// check for new messages on loop
// setInterval(checkNewMessageExtClosed, 20000)