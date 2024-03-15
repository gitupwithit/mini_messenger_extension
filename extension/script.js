<<<<<<< HEAD
console.log("script.js loaded")

// When the side panel opens
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    console.log("dcom content loaded")
    // Request message
    chrome.runtime.sendMessage({ action: "fetchMessage" });
});

document.getElementById('signIn').addEventListener('click', function() {
    console.log("sign in button clicked")
    chrome.runtime.sendMessage({ action: "userSignIn" });
});

document.getElementById('choosePartnerButton').addEventListener('click', function() {
    console.log("choose partner button clicked");
    const data = document.getElementById('choosenPartner').value
    if (data.includes("@")) {
        document.getElementById('responseMessage').innerHTML = "must be a gmail address, without '@gmail.com'"
    } else {
        document.getElementById('responseMessage').innerHTML = ""
        chrome.runtime.sendMessage({ action: "userChoosePartner", event: data });
    }
});

document.getElementById('replyButton').addEventListener('click', function() {
    console.log("reply button clicked")
    const data = document.getElementById('messageToSend').value
    console.log("user clicks message send button, message: ", data)
    chrome.runtime.sendMessage({ action: "sendMessageToOtherUser", event: data });
});

document.getElementById('okButton').addEventListener('click', function() {
    console.log("ok Button clicked")
    // server to check for existence of user's partner
    chrome.runtime.sendMessage({ action: "checkForPartner", event: data });
});


function checkAuthentication() {
    chrome.storage.local.get(['access_token'], function(result) {
        if (result.access_token) {
        // Ask the service worker to validate the token
            chrome.runtime.sendMessage({ action: "validateToken", token: result.access_token }, function(response) {
            if (response.isValid) {
                // The token is valid, proceed to fetch calendar events
                // console.log("token is valid, proceed to fetch calendar events")
                document.getElementById('signIn').style.display = 'none';
                
            } else {
                // Token is not valid, show the 'Authorize' button
                console.log("Token is not valid, show the 'Authorize' button")
                
                }
            });
        } else {
        // No token found, show the 'Authorize' button
        console.log("Token not found, show the 'Authorize' button")
        document.getElementById('signIn').style.display = 'block';
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
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'block';
    document.getElementById('outgoingMessageContainer').style.display = 'block';
    document.getElementById('statusMessage').style.display = 'block';
}

function hideMessages() {
    document.getElementById('signIn').style.display = 'block';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
}

//welcome back and user verify partner
function welcomeUserBack(text) {
    console.log(text)
    document.getElementById('statusMessage').style.display = 'block';
    document.getElementById('okButton').style.display = 'block';
    if (text === "") {
        document.getElementById('responseMessage').innerHTML = "Choose your partner!"
    } else {
        document.getElementById('responseMessage').innerHTML = "Welcome Back! Send message to " + text + " ?";
        document.getElementById('noButton').style.display = 'block';
    }
}

chrome.runtime.onMessage.addListener((message, event, sender, sendResponse) => {
    console.log("message:", message, "events", event)
    if (message.action === "welcomeUserBack") {
        let text = message.event.data
        console.log("welcome user back")
        console.log(text)
        welcomeUserBack(text);
    };
    if (message.action === "showChoosePartner") {
        console.log("show choose partner now");
        showChoosePartner();
    }
    if (message.action === "partnerIsInDb") {
        console.log("partner is in db");
        document.getElementById('responseMessage').innerHTML = "Your partner is registered too!";
        showMessages();
    }
    if (message.action === "partnerIsNotInDb") {
        console.log("partner is not in db");
        document.getElementById('responseMessage').innerHTML = "Your partner is not registered yet :/";
        showMessages();
    }
    if (message.action === "showMessages") {
        console.log("show messages now");
        showMessages();
    }
    if (message.action === "messageForUser") {
        document.getElementById('messageFrom').innerHTML = "Message from: " + message.event.sender;
        document.getElementById('incomingMessageText').innerHTML = message.event.messageText;
        showMessages();
    }
    if (message.action === "messageSent") {
        console.log("message sent notification")
        document.getElementById('responseMessage').innerHTML = "Message sent!";
        showMessages();
    }
})
=======
console.log("script.js loaded")

// When the side panel opens
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    console.log("dcom content loaded")
    // Request message
    chrome.runtime.sendMessage({ action: "fetchMessage" });
});

document.getElementById('signIn').addEventListener('click', function() {
    console.log("sign in button clicked")
    chrome.runtime.sendMessage({ action: "userSignIn" });
});

document.getElementById('choosePartnerButton').addEventListener('click', function() {
    console.log("choose partner button clicked");
    const data = document.getElementById('choosenPartner').value
    if (data.includes("@")) {
        document.getElementById('responseMessage').innerHTML = "must be a gmail address, without '@gmail.com'"
    } else {
        document.getElementById('responseMessage').innerHTML = ""
        chrome.runtime.sendMessage({ action: "userChoosePartner", event: data });
    }
});

document.getElementById('replyButton').addEventListener('click', function() {
    console.log("reply button clicked")
    const data = document.getElementById('messageToSend').value
    console.log("user clicks message send button, message: ", data)
    chrome.runtime.sendMessage({ action: "sendMessageToOtherUser", event: data });
});

document.getElementById('clearStatusMessageButton').addEventListener('click', function() {
    console.log("clearStatusMessageButton clicked")
    // server to check for existence of user's partner
    chrome.runtime.sendMessage({ action: "checkForPartner", event: data });
});


function checkAuthentication() {
    chrome.storage.local.get(['access_token'], function(result) {
        if (result.access_token) {
        // Ask the service worker to validate the token
            chrome.runtime.sendMessage({ action: "validateToken", token: result.access_token }, function(response) {
            if (response.isValid) {
                // The token is valid, proceed to fetch calendar events
                // console.log("token is valid, proceed to fetch calendar events")
                document.getElementById('signIn').style.display = 'none';
                
            } else {
                // Token is not valid, show the 'Authorize' button
                console.log("Token is not valid, show the 'Authorize' button")
                
                }
            });
        } else {
        // No token found, show the 'Authorize' button
        console.log("Token not found, show the 'Authorize' button")
        document.getElementById('signIn').style.display = 'block';
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
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'block';
    document.getElementById('outgoingMessageContainer').style.display = 'block';
    document.getElementById('statusMessage').style.display = 'block';
}

function hideMessages() {
    document.getElementById('signIn').style.display = 'block';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
}

function welcomeUserBack() {
    document.getElementById('responseMessage').innerHTML = "Welcome Back!";
    document.getElementById('statusMessage').style.display = 'block';
}

chrome.runtime.onMessage.addListener((message, events, sender, sendResponse) => {
    console.log("message:", message, "events", events)
    if (message.action === "welcomeUserBack") {
        console.log("welcome user back")
        welcomeUserBack();
    };
    if (message.action === "showChoosePartner") {
        console.log("show choose partner now");
        showChoosePartner();
    }
    if (message.action === "partnerIsInDb") {
        console.log("partner is in db");
        document.getElementById('responseMessage').innerHTML = "Your partner is registered too!";
        showMessages();
    }
    if (message.action === "partnerIsNotInDb") {
        console.log("partner is not in db");
        document.getElementById('responseMessage').innerHTML = "Your partner is not registered yet :/";
        showMessages();
    }
    if (message.action === "showMessages") {
        console.log("show messages now");
        showMessages();
    }
    if (message.action === "messageForUser") {
        document.getElementById('messageFrom').innerHTML = "Message from: " + message.event.sender;
        document.getElementById('incomingMessageText').innerHTML = message.event.messageText;
        showMessages();
    }
    if (message.action === "messageSent") {
        console.log("message sent notification")
        document.getElementById('responseMessage').innerHTML = "Message sent!";
        showMessages();
    }
})
>>>>>>> 5ccecd8d88ec9b841b77d6d1c1ff86a3cb06dc56
