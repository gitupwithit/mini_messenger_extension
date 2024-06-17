/* TO DO:
better user set up when opening ext
Store locally: oauth token, user id, partner id, my private key, partner's public key
*/

// console.log("script.js loaded")

let messagesShown = false;
let clearUserNow = false;
let userSignOut = false;

// initialize icon
const newIcon = "images/icon-16.png";
chrome.action.setIcon({ path: newIcon }, () => {
    // console.log("Icon changed to indicate no messages.");
});

// When side panel opens
document.addEventListener('DOMContentLoaded', function() {
    checkStoredData()
    // console.log("dcom content loaded")
});


async function checkStoredData() {
    // console.log("==================== begin storage search ====================");

    let tokenInLocalStorage = await checkForAuthenticationToken();
    let userIDInStorage = await checkUserId();
    let partnerIDInStorage = await checkPartnerID();
    let myPrivateKeyInStorage = await checkMyPrivateKey();
    let myPublicKeyInStorage = await checkMyPublicKey();
    let partnerPublicKeyInStorage = await checkPartnerPublicKey(userIDInStorage, partnerIDInStorage, myPublicKeyInStorage);

    if (tokenInLocalStorage) {
        // console.log("Verifying token"); 
        let tokenInLocalStorageIsValid = await validateAuthentication(tokenInLocalStorage);
        // console.log("tokenInLocalStorageIsValid", tokenInLocalStorageIsValid);
        if (!tokenInLocalStorageIsValid) {
            // console.log("Token is not valid, show the sign in button"); 
            document.getElementById('signInButton').style.display = 'block';
            deleteInvalidToken();
            return;
        } else {
            // console.log("Token is valid");
        }
    } else {
        // console.log("Show sign in button");
        document.getElementById('signInButton').style.display = 'block';
        return;
    }

    if (userIDInStorage) {
        // console.log("userId found in storage", userIDInStorage);
    } else {
        // console.log("No userID found in storage, getting");
        userIDInStorage = await getUserIDFromGoogle(tokenInLocalStorage)
        // return;
    }

    if (partnerIDInStorage) {
        // console.log("partnerIDInStorage:", partnerIDInStorage);
    } else {
        // console.log("User to choose partner, show dialogue");
        document.getElementById('choosePartnerContainer').style.display = 'block';
        return;
    }

    if (myPrivateKeyInStorage) {
        console.log("myPrivateKey in storage", myPrivateKeyInStorage);
    } else {
        console.log("myPrivateKey not in storage, generating");
        let keyPairGenerated = await generateKeyPair(userIDInStorage, partnerIDInStorage);
        if (!keyPairGenerated) {
            console.log("Error - keypair not generated");
            return;
        }
    }

    if (partnerPublicKeyInStorage) {
        console.log("partnerPublicKeyInStorage in storage");
    } else {
        console.log("No partnerPublicKeyInStorage found in storage, getting from server");
        partnerPublicKeyInStorage = await getPartnerPublicKey(partnerIDInStorage);
    }

    showMessages();
}

async function getPartnerPublicKey(partnerID) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getPartnerPublicKey", data: {"partnerID": partnerID} }, function(response) {
            console.log("generate keypair response:", response)
            if (response && response.isValid) {
                    resolve(response.partnerPublicKey);
                } else {
                    resolve(false);
                }
            })
        })
}

async function generateKeyPair(userID, partnerID) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "generateKeyPair", data: {"userID": userID, "partnerID": partnerID} }, function(response) {
            console.log("generate keypair response:", response)
            if (response && response.isValid) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
        })
}

function deleteInvalidToken() {
    chrome.storage.local.remove(['token'], function() {
        chrome.storage.local.get(['token'], function(result) {
            if (result.token) {
                // console.log("Token still exists after delete:", result.token);
            } else {
                // console.log("Token has been deleted, storage is now empty.");
            }
        });
    });
}

async function checkForAuthenticationToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['token'], function(result) {
            // // console.log("getting authorization token")
            if (result.token) {
                // console.log("token found in local storage", result.token)
                resolve(result.token);
            } else {
                // console.log("token not found in local storage")
                resolve(false);
            }
        })
    })
}

async function validateAuthentication(token) {
    // console.log("checking authentication now")
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "validateToken", token: token }, function(response) {
            // console.log("validate token response:", response);
            if (response.isValid) {
                // console.log("token is valid");
                resolve(true);
            } else {
                resolve(false);
            };
        })
    })
}

async function getUserIDFromGoogle(token) {
    // console.log("token to check:", token)
    return new Promise((resolve, reject) => {
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
            'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
            .then(data => {
                // console.log("response", data)
                // console.log('User ID:', data.email);
                userID = data.email
                chrome.storage.local.set({ 'userID' : userID })
                resolve(true);
                
                // chrome.runtime.sendMessage({ action: "updateUserIDInLocalStorage", data: userID } )

                // checkUser(userEmail)
            })
            .catch(error => {
            console.error('Error fetching user ID:', error);
            resolve(false)

        });
    });
}

async function checkUserId() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['userID'], function(result) {
            // console.log("userID result: ", result);
            if (result.userID) {
                // console.log("found userID in local storage", result.userID);
                resolve(result.userID);
            } else {
                // console.log("user ID not found in local storage");
                resolve(false);
            }
        });
    });
}

async function checkPartnerID() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['partnerID'], function(result) {
            // console.log("partnerID result: ", result);
            if (result.partnerID) {
                // console.log("found partnerID in local storage", result.partnerID);
                document.getElementById('messageFrom').innerHTML = "Message from " + result.partnerID
                resolve(result.partnerID);
            } else {
                // console.log("partnerID not found in local storage");
                resolve(false);
            }
        });
    });
}

async function checkMyPrivateKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['myPrivateKey'], function(result) {
            console.log("myPrivateKey result: ", result);
            if (result.myPrivateKey) {
                console.log("found myPrivateKey in local storage", result.myPrivateKey); 
                resolve(result.myPrivateKey);
            } else {
                console.log("myPrivateKey not found in local storage");
                resolve(false);
            }
        });
    });
}

async function checkMyPublicKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['myPublicKey'], function(result) {
            console.log("myPublicKey result: ", result);
            if (result.myPublicKey) {
                console.log("found myPublicKey in local storage", result.myPublicKey); 
                resolve(result.myPublicKey);
            } else {
                console.log("myPublicKey not found in local storage");
                resolve(false);
            }
        });
    });
}

async function checkPartnerPublicKey(userIDInStorage, partnerIDInStorage, myPublicKeyInStorage) {
    // console.log("partnerIDInStorage:", partnerIDInStorage)
    if (!partnerIDInStorage) {// console.log("no partner ID in storage found, returning"); return false;
        
    }
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['partnerPublicKey'], function(result) {
            console.log("partnerPublicKey result: ", result);
            if (result.partnerPublicKey) {
                console.log("found partnerPublicKey in local storage", result.partnerPublicKey);
                resolve(result.partnerPublicKey);
            } else {
                resolve(false);

                // if (userIDInStorage === false || myPublicKeyInStorage === false) {
                //     // console.log("userID and or myPublicKey not available")
                //     return;
                // }

                // // console.log("partnerPublicKey for", partnerIDInStorage, "not found in local storage, getting");
                // let messageForServiceWorker = { action: "getPartnerPublicKey", data: {"userID": userIDInStorage, "partnerID": partnerIDInStorage, "myPublicKey": myPublicKeyInStorage }}
                // // console.log("message for service-worker:", messageForServiceWorker)
                // chrome.runtime.sendMessage(messageForServiceWorker)
                
                // resolve(false);
            }
        });
    });
}

function changeIcon(newUnreadMessage) {
    if (newUnreadMessage === true) {
        const newIcon = "images/images2/icon-16.png";
        chrome.action.setIcon({ path: newIcon }, () => {
        // console.log("New message icon.");
        });
    } else {
        const newIcon = "images/icon-16.png";
        chrome.action.setIcon({ path: newIcon }, () => {
        // console.log("No new message icon.");
        });
    }
}

function showInfo() {
    document.getElementById('infoContainer').style.display = 'block';
}

function showInfo2() {
    document.getElementById('infoContainer').style.display = 'block';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
    document.getElementById('statusMessage').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'none';
}

function checkNewMessage() {
    chrome.storage.local.get(['token'], function(result) {
        // console.log("token search result: ", result)
        if (result.token) {
            chrome.runtime.sendMessage({ action: "checkNewMessage", token: result.token  });
            } else {
                // console.log("error - token not found") // should this trigger new token creation?
                return
            }
        }
    )
}
function showChoosePartner() {
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('choosePartnerContainer').style.display = 'block';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
}

function showMessages() {
    messagesShown = true;
    userSignOut = false;
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'block';
    document.getElementById('outgoingMessageContainer').style.display = 'block';
    // document.getElementById('statusMessage').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'block';
}

function showStatusMessage(statusMessage) {
    document.getElementById('statusMessage').style.display = 'block';
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'none';
    if (statusMessage) {
        document.getElementById('responseMessage').innerHTML = statusMessage;
    }
}

function hideMessages() {
    document.getElementById('signIn').style.display = 'block';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'none';
}

function welcomeUserBack(text) {
    // console.log(text.partnerID);
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('statusMessage').style.display = 'block';
    document.getElementById('okButton').style.display = 'block';
    if (text === "") {
        document.getElementById('responseMessage').innerHTML = "Choose your partner!"
    } else {
        document.getElementById('responseMessage').innerHTML = "Welcome Back! Send message to " + text.partnerID + "?";
        document.getElementById('messageFrom').innerHTML = "Message from " + text.partnerID;
        document.getElementById('noButton').style.display = 'block';
    }
    if (text.message != " ") {
        document.getElementById('incomingMessageText').innerHTML = text.message;
        const newUnreadMessage = false;
        changeIcon(newUnreadMessage);
    } else {
        document.getElementById('incomingMessageText').innerHTML = "(waiting for message)"
    }
}

function confirmMessageReceipt(sender) {
    // console.log("sender: ", sender)
    const data =  document.getElementById('incomingMessageText').textContent
    // console.log("data:", data)
    if (data === " ... " || data === "Waiting for new message .. ") {
        // console.log("message is blank, nothing to delete")
    } else {
        // console.log("delete existing message")
        chrome.runtime.sendMessage({ action: "deleteMessage", data: sender} )
    }
}

function confirmUserSignOut() {
    messagesShown = false
    const statusMessage = "You are signed out, all data removed from this device and server."
    showStatusMessage(statusMessage)
}

async function userSignIn() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "userSignIn" }, function(response) {
            // console.log("Sign in response:", response);
            if (response && response.isValid) {
                // console.log("sign in worked")

                checkStoredData()
                resolve(true);
            } else {
                // console.log("sign in failed")
                resolve(false);
            }
        });
    });
}

function clearLocalData() {
    console.log("clear local data now");

    // Remove the specified items from local storage
    chrome.storage.local.remove(['userID', 'partnerID', 'myPrivateKey', 'myPublicKey', 'partnerPublicKey'], () => {
        if (chrome.runtime.lastError) {
            console.log("remove local data error:", chrome.runtime.lastError);
        } else {
            console.log("local data removed");

            // Verify data removal
            chrome.storage.local.get(['userID', 'partnerID', 'myPrivateKey', 'myPublicKey', 'partnerPublicKey', 'token'], (result) => {
                console.log("Verification of local storage after removal:");
                console.log("userID in storage:", result.userID); // should be undefined
                console.log("partnerID in storage:", result.partnerID); // should be undefined
                console.log("myPrivateKey in storage:", result.myPrivateKey); // should be undefined
                console.log("myPublicKey in storage:", result.myPublicKey); // should be undefined
                console.log("partnerPublicKey in storage:", result.partnerPublicKey); // should be undefined
                console.log("token in storage:", result.token); // token might be present or undefined based on your use case
            });
        }
    });
}

// messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("message:", message)
    if (message.action === "userAddedSuccessfully") {
        const statusMessage = "Server Updated"
        showStatusMessage(statusMessage)
        showMessages()
    }
    if (message.action === "storePartnerPublicKey") {
        chrome.storage.local.set({'partnerPublicKey' : message.data})
    }
    if (message.action === "noPartnerPublicKeyOnServer") {
        const statusMessage = "Can't send message to partner until they sign up."
        showStatusMessage(statusMessage)
        showMessages()
    }

    if (message.action === "messageForOnlineUser") {
        console.log("message for online user:", message.event.messageText)
        let newMessage
        document.getElementById('messageFrom').innerHTML = "Message from " + message.event.sender;
        if (message.event.messageText === " " || message.event.messageText === null || message.event.messageText === undefined) {
            newMessage = "Waiting for message ... "
            const newUnreadMessage = false;
            changeIcon(newUnreadMessage);
        } else {
            newMessage = message.event.messageText;
            const newUnreadMessage = true;
            changeIcon(newUnreadMessage);
        }
        document.getElementById('incomingMessageText').innerHTML = newMessage;
        showMessages()
    }

    if (message.action === "tokenSavedSuccessfully") {
        // console.log("token saved successfully")
        let token = chrome.storage.local.get(['token'])
        getUserIDFromGoogle(token)
    }
    if (message.action === "confirmSignOut") {
        // console.log("confirm user sign out");
        confirmUserSignOut();
    }
    if (message.action === "welcomeBack") {
        let text = message.event;
        // console.log("welcome user back");
        // console.log(text);
        welcomeUserBack(text);
    }
    if (message.action === "showChoosePartner") {
        // console.log("show choose partner now");
        showChoosePartner();
    }
    if (message.action === "partnerIsInDb") {
        // console.log("partner is in db")
        document.getElementById('responseMessage').innerHTML = "Your partner is using mini messenger.";
        showStatusMessage();
        showMessages()
    }
    if (message.action === "partnerAddedIsInDb") {
        console.log("partner is in db, checking for encryption keys");
        let myPrivateKeyInStorage = checkMyPrivateKey();
        if (myPrivateKeyInStorage) {
            console.log("myPrivateKey in storage", myPrivateKeyInStorage)
        } else {
            console.log("myPrivateKey generating error")
            return
        }
        document.getElementById('responseMessage').innerHTML = "Your partner is using mini messenger.";
        showStatusMessage();
    }
    if (message.action === "partnerAddedIsNotInDb") {
        console.log("partner is not in db, checking for encryption keys");
        let myPrivateKeyInStorage = checkMyPrivateKey();
        if (myPrivateKeyInStorage) {
            console.log("myPrivateKey in storage", myPrivateKeyInStorage)
        } else {
            console.log("myPrivateKey generating error")
            return
        }
        document.getElementById('responseMessage').innerHTML = "Your partner is not registered yet :/";
        showStatusMessage();
        showMessages();
    }

    if (message.action === "messageForPartnerSavedPartnerNotRegistered") {
        // console.log("message for partner saved to server, partner is not registered");
        document.getElementById('messageToSend').value = "";
        let statusMesage = "Message sent! Partner not registered yet."
        showStatusMessage(statusMesage);
        showMessages();
    }

    if (message.action === "showMessages") {
        // console.log("show messages now");
        showMessages();
    }
    if (message.action === "messageForUser") {
        document.getElementById('messageFrom').innerHTML = "Message from: " + message.event.sender;
        if (message.event.messageText === " " || !message.event.messageText) {
            document.getElementById('incomingMessageText').innerHTML = "Waiting for new message .. ";
            const newUnreadMessage = false;
            changeIcon(newUnreadMessage);
        } else {
            document.getElementById('incomingMessageText').innerHTML = message.event.messageText;
        }
        const sender = message.event.sender;
        // console.log("sender:", sender);
        // const newUnreadMessage = true;
        // changeIcon(newUnreadMessage);
        confirmMessageReceipt(sender);
        showMessages();
    }
    if (message.action === "messageSent") {
        // console.log("message sent notification");
        document.getElementById('messageToSend').value = "";
        let statusMesage = "Message sent!"
        showStatusMessage(statusMesage);
        // showMessages();
    }
    if (message.action === "updateUserIDInStorage") {

    }

})

// document.getElementById('messageToSend').placeholder = "Reply...";

// document.getElementById('signOutButton').addEventListener('click', function() {
//     userSignOut = true;
//     // console.log("sign out button clicked");
//     chrome.storage.local.get(['token'], function(result) {
//         // console.log("result: ", result)
//         if (result.token) {
//         chrome.runtime.sendMessage({ action: "userSignOut", token: result.token  });
//         }

//     })
//     messagesShown = false;
//     document.getElementById('signIn').style.display = 'block';
// });


document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('signOutButton').addEventListener('click', async function() {
        try {
            userSignOut = true;
            // console.log("signOutButton clicked");

            const tokenResult = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['token'], (result) => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    resolve(result);
                });
            });

            // console.log("result: ", tokenResult);
            if (tokenResult.token) {
                await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ action: "userSignOut", token: tokenResult.token }, (response) => {
                        if (chrome.runtime.lastError) {
                            return reject(chrome.runtime.lastError);
                        }
                        resolve(response);
                    });
                });
            } else {
                const userIDResult = await new Promise((resolve, reject) => {
                    chrome.storage.local.get(['userID'], (result) => {
                        if (chrome.runtime.lastError) {
                            return reject(chrome.runtime.lastError);
                        }
                        resolve(result);
                    });
                });

                // console.log("result: ", userIDResult);
                if (userIDResult.userID) {
                    await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({ action: "clearUserDataFromServer", "userID": userIDResult.userID }, (response) => {
                            if (chrome.runtime.lastError) {
                                return reject(chrome.runtime.lastError);
                            }
                            resolve(response);
                        });
                    });
                } else {
                    // console.log("can't remove user data from server without userID");
                }
            }

            // await new Promise((resolve, reject) => {
            //     chrome.storage.local.remove(['userID', 'partnerID', 'myPrivateKey', 'myPublicKey', 'partnerPublicKey'], () => {
            //         if (chrome.runtime.lastError) {
            //             return reject(chrome.runtime.lastError);
            //         }
            //         resolve();
            //     });
            // });

            messagesShown = false;
            document.getElementById('signIn').style.display = 'block';
            console.log("local data removed");
        } catch (error) {
            console.error('Error during removeInfoButton click handling:', error);
        }
        clearLocalData()
    });
});

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('removeInfoButton').addEventListener('click', async function() {
        try {
            userSignOut = true;
            console.log("removeInfoButton clicked");

            const tokenResult = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['token'], (result) => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    resolve(result);
                });
            });

            // console.log("result: ", tokenResult);
            if (tokenResult.token) {
                await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ action: "userSignOut", token: tokenResult.token }, (response) => {
                        if (chrome.runtime.lastError) {
                            return reject(chrome.runtime.lastError);
                        }
                        resolve(response);
                    });
                });
            } else {
                const userIDResult = await new Promise((resolve, reject) => {
                    chrome.storage.local.get(['userID'], (result) => {
                        if (chrome.runtime.lastError) {
                            return reject(chrome.runtime.lastError);
                        }
                        resolve(result);
                    });
                });

                // console.log("result: ", userIDResult);
                if (userIDResult.userID) {
                    await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({ action: "clearUserDataFromServer", "userID": userIDResult.userID }, (response) => {
                            if (chrome.runtime.lastError) {
                                return reject(chrome.runtime.lastError);
                            }
                            resolve(response);
                        });
                    });
                } else {
                    // console.log("can't remove user data from server without userID");
                }
            }

            messagesShown = false;
            document.getElementById('signIn').style.display = 'block';
            console.log("local data removed");
        } catch (error) {
            console.error('Error during removeInfoButton click handling:', error);
        }
        clearLocalData()
    });
});

document.getElementById('signInButton').addEventListener('click', function() {
    console.log("sign in button clicked");
    userSignIn()
});

document.getElementById('choosePartnerButton').addEventListener('click', function() {
    // console.log("add partner button clicked");
    const data = document.getElementById('choosenPartner').value ;
    if (data.includes("@")) {
        document.getElementById('responseMessage').innerHTML = "must be a gmail address, without '@gmail.com'";
    } else {
        document.getElementById('responseMessage').innerHTML = ""
        chrome.storage.local.set({'partnerID' : data + "@gmail.com"})
        chrome.storage.local.get(['partnerID'], function(result) {
            // console.log("partnerID result: ", result);
            if (result.partnerID) {
                // console.log("partnerID successfully saved in local storage", result.partnerID);
                chrome.storage.local.get(['myPrivateKey'], function(result) {
                    console.log("myPrivateKey result: ", result);
                    if (result.myPrivateKey) {
                        console.log("found myPrivateKey in local storage", result.myPrivateKey);
                        showMessages()

                    } else {
                        console.log("myPrivateKey not found in local storage");
                        // 
                        checkStoredData()
                    }
                });
                // resolve(true);
            } else {
                console.log("partner ID not found in local storage");
                // resolve(false);
            }
        });
        // chrome.runtime.sendMessage({ action: "userAddPartner", event: data });
    }
});

document.getElementById('checkNewMessageButton').addEventListener('click', function() {
    console.log("check message button clicked");
    checkNewMessage();
})

document.getElementById('replyButton').addEventListener('click', function() {
    console.log("reply button clicked");
    const data = document.getElementById('messageToSend').value;
    console.log("user clicks message send button, message: ", data);
    chrome.runtime.sendMessage({ action: "sendMessageToParter", event: data });
    document.getElementById('incomingMessageText').innerHTML = " ... ";
});

document.getElementById('okButton').addEventListener('click', function() {
    // console.log("ok Button clicked");
    if (userSignOut === false) {
        checkNewMessage();
        showMessages()
    } else {
        document.getElementById('signIn').style.display = 'block';
        document.getElementById('statusMessage').style.display = 'none';
        document.getElementById('infoContainer').style.display = 'none';
        userSignOut = false;
    }
    
});

document.getElementById('closeInfo').addEventListener('click', function() {
    // console.log("close info Button clicked, messagesShown =", messagesShown);
    if (messagesShown === true) {
        showMessages();
        document.getElementById('infoContainer').style.display = 'none';
    } else {
        document.getElementById('signIn').style.display = 'block';
        document.getElementById('infoContainer').style.display = 'none';
    }
});

document.getElementById('noButton').addEventListener('click', function() {
    // console.log("no Button clicked");
    showChoosePartner();
});

document.getElementById('clearMessageButton').addEventListener('click', function() {
    // console.log("clear Button clicked");
    document.getElementById('incomingMessageText').innerHTML = " ... ";
    const newUnreadMessage = false;
    changeIcon(newUnreadMessage);
});

document.getElementById('infoButton').addEventListener('click', function() { 
    // console.log("show info button clicked");
    showInfo();
})

document.getElementById('infoButton2').addEventListener('click', function() { 
    // console.log("show info button clicked");
    showInfo2();
})
