/* TO DO:

better user set up when opening ext
Store locally: user id, partner id, public and private key

*/

console.log("script.js loaded")

let messagesShown = false;
let clearUserNow = false;
let userSignOut = false;

// initialize icon
const newIcon = "images/icon-16.png";
chrome.action.setIcon({ path: newIcon }, () => {
    console.log("Icon changed to indicate no messages.");
});

// When side panel opens
document.addEventListener('DOMContentLoaded', function() {
    let userAuthentication = checkForAuthenticationToken();
    if (userAuthentication) {
        console.log("authentication exists");
        // The token is valid, verify user data saved locally
        let userID = checkUserId();
        if (userID === false) { console.log("userID error"); return} // expecting this to log?
        // if (userID) {
        //     let privateKey = await checkMyPrivateKey();
        //     if (checkMyPrivateKey) { 
        //         let partnerId = await checkPartnerID();
        //         if (partnerId) {
        //             let partnerPublicKey = await checkPartnerPublicKey();
        //             if (partnerPublicKey) {
        //                 checkNewMessage();
        //             }
        //         }
        //     }
        // }
    }
    console.log("dcom content loaded")
});

async function checkForAuthenticationToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['token'], function(result) {
            console.log("authorization token")
            if (result.token) {
                console.log("token found in local storage", result.token)
                return true;
            } else {
                console.log("token not found in local storage")
                return false;
            }
        })
    })
}

async function checkUserId() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['userID'], function(result) {
            console.log("userID result: ", result);
            if (result.userID) {
                console.log("found userID in local storage", result.userID);
                resolve(true);
            } else {
                console.log("user ID not found in local storage");
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
                resolve(true);
            } else {
                console.log("myPrivateKey not found in local storage");
                resolve(false);
            }
        });
    });
}

async function checkPartnerID() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['partnerID'], function(result) {
            console.log("partnerID result: ", result);
            if (result.partnerID) {
                console.log("found partnerID in local storage", result.partnerID);
                resolve(true);
            } else {
                console.log("partnerID not found in local storage");
                resolve(false);
            }
        });
    });
}

async function checkPartnerPublicKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['partnerPrivateKey'], function(result) {
            console.log("partnerPrivateKey result: ", result);
            if (result.partnerPrivateKey) {
                console.log("found partnerPrivateKey in local storage", result.partnerPrivateKey);
                resolve(true);
            } else {
                console.log("partnerPrivateKey not found in local storage");
                resolve(false);
            }
        });
    });

}

document.getElementById('signOutButton').addEventListener('click', function() {
    userSignOut = true;
    console.log("sign out button clicked");
    chrome.storage.local.get(['token'], function(result) {
        console.log("result: ", result)
        if (result.token) {
        chrome.runtime.sendMessage({ action: "userSignOut", token: result.token  });
        }
    })
    messagesShown = false;
    document.getElementById('signIn').style.display = 'block';
});

document.getElementById('removeInfoButton').addEventListener('click', function() {
    userSignOut = true;
    console.log("removeInfoButton clicked");
    chrome.storage.local.get(['token'], function(result) {
        console.log("result: ", result)
        if (result.token) {
        chrome.runtime.sendMessage({ action: "userSignOut", token: result.token  });
        }
    })
    messagesShown = false;
    document.getElementById('signIn').style.display = 'block';
});

document.getElementById('signInButton').addEventListener('click', function() {
    console.log("sign in button clicked");
    chrome.runtime.sendMessage({ action: "userSignIn" });
});

document.getElementById('addPartnerButton').addEventListener('click', function() {
    console.log("add partner button clicked");
    const data = document.getElementById('choosenPartner').value;
    if (data.includes("@")) {
        document.getElementById('responseMessage').innerHTML = "must be a gmail address, without '@gmail.com'";
    } else {
        document.getElementById('responseMessage').innerHTML = ""
        chrome.runtime.sendMessage({ action: "userAddPartner", event: data });
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
    console.log("ok Button clicked");
    if (userSignOut === false) {
        checkNewMessage();
    } else {
        document.getElementById('signIn').style.display = 'block';
        document.getElementById('statusMessage').style.display = 'none';
        document.getElementById('infoContainer').style.display = 'none';
        userSignOut = false;
    }
    
});

document.getElementById('closeInfo').addEventListener('click', function() {
    console.log("close info Button clicked, messagesShown =", messagesShown);
    if (messagesShown === true) {
        showMessages();
        document.getElementById('infoContainer').style.display = 'none';
    } else {
        document.getElementById('signIn').style.display = 'block';
        document.getElementById('infoContainer').style.display = 'none';
    }
});

document.getElementById('noButton').addEventListener('click', function() {
    console.log("no Button clicked");
    showChoosePartner();
});

document.getElementById('clearMessageButton').addEventListener('click', function() {
    console.log("clear Button clicked");
    document.getElementById('incomingMessageText').innerHTML = " ... ";
    const newUnreadMessage = false;
    changeIcon(newUnreadMessage);
});

document.getElementById('infoButton').addEventListener('click', function() { 
    console.log("show info button clicked");
    showInfo();
})

document.getElementById('infoButton2').addEventListener('click', function() { 
    console.log("show info button clicked");
    showInfo2();
})

function changeIcon(newUnreadMessage) {
    if (newUnreadMessage === true) {
        const newIcon = "images/images2/icon-16.png";
        chrome.action.setIcon({ path: newIcon }, () => {
        console.log("New message icon.");
        });
    } else {
        const newIcon = "images/icon-16.png";
        chrome.action.setIcon({ path: newIcon }, () => {
        console.log("No new message icon.");
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
        console.log("token search result: ", result)
        if (result.token) {
            chrome.runtime.sendMessage({ action: "checkNewMessage", token: result.token  });
            } else {
                console.log("error - token not found") // should this trigger new token creation?
                return
            }
        }
    )
}

async function checkAuthentication() {
    console.log("checking authentication now")
    chrome.storage.local.get(['token'], function(result) {
    console.log("result: ", result)
    if (result.token) {
        console.log("token found")
    // Ask the service worker to validate the token
        chrome.runtime.sendMessage({ action: "validateToken", token: result.token }, function(response) {
            console.log("response", response)
            if (response.isValid) {
                
                console.log("token is valid");
                // chrome.runtime.sendMessage({ action: "getUserID", token: result.token })
                
            } else {
                // Token is not valid, show the sign in button
                console.log("Token is not valid, show the sign in button");
                document.getElementById('signIn').style.display = 'block';
            };
        })
    } else {
        console.log("token not found")
        // chrome.runtime.sendMessage({ action: "userSignIn" });
        }
    });
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
    document.getElementById('statusMessage').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'block';
}

function showStatusMessage() {
    document.getElementById('statusMessage').style.display = 'block';
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'none';
}

function hideMessages() {
    document.getElementById('signIn').style.display = 'block';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'none';
}

function welcomeUserBack(text) {
    console.log(text.toID);
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('statusMessage').style.display = 'block';
    document.getElementById('okButton').style.display = 'block';
    if (text === "") {
        document.getElementById('responseMessage').innerHTML = "Choose your partner!"
    } else {
        document.getElementById('responseMessage').innerHTML = "Welcome Back! Send message to " + text.toID + "?";
        document.getElementById('messageFrom').innerHTML = "Message from " + text.toID;
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
    console.log("sender: ", sender)
    const data =  document.getElementById('incomingMessageText').textContent
    console.log("data:", data)
    if (data === " ... " || data === "Waiting for new message .. ") {
        console.log("message is blank, nothing to delete")
    } else {
        console.log("delete existing message")
        chrome.runtime.sendMessage({ action: "deleteMessage", data: sender} )
    }
}

function confirmUserSignOut() {
    messagesShown = false
    showStatusMessage()
    document.getElementById('responseMessage').innerHTML = "You are signed out, all data removed from server.";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("message:", message)
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
    
    if (message.action === "confirmSignOut") {
        console.log("confirm user sign out");
        confirmUserSignOut();
    }
    if (message.action === "welcomeBack") {
        let text = message.event;
        console.log("welcome user back");
        console.log(text);
        welcomeUserBack(text);
    }
    if (message.action === "showChoosePartner") {
        console.log("show choose partner now");
        showChoosePartner();
    }
    if (message.action === "partnerAddedIsInDb") {
        console.log("partner is in db");
        document.getElementById('responseMessage').innerHTML = "Your partner is also using mini messenger.";
        showStatusMessage();
    }
    if (message.action === "partnerAddedIsNotInDb") {
        console.log("partner is not in db");
        document.getElementById('responseMessage').innerHTML = "Your partner is not registered yet :/";
        showStatusMessage();
    }
    if (message.action === "showMessages") {
        console.log("show messages now");
        showMessages();
    }
    if (message.action === "messageForUser") {
        document.getElementById('messageFrom').innerHTML = "Message from: " + message.event.sender;
        if (message.event.messageText === " " || !message.event.messageText) {
            document.getElementById('incomingMessageText').innerHTML = "Waiting for new message .. ";
            const newUnreadMessage = false;
            changeIcon(newUnreadMessage);
        } else {
            document.getElementById('incomingMessageText').innerHTML = message.event.messageText.message;
        }
        const sender = message.event.sender;
        console.log("sender:", sender);
        // const newUnreadMessage = true;
        // changeIcon(newUnreadMessage);
        confirmMessageReceipt(sender);
        showMessages();
    }
    if (message.action === "messageSent") {
        console.log("message sent notification");
        document.getElementById('responseMessage').innerHTML = "Message sent!";
        document.getElementById('messageToSend').value = "";
        showStatusMessage();
        // showMessages();
    }
})

// document.getElementById('messageToSend').placeholder = "Reply...";

