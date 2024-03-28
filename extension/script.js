console.log("script.js loaded")

// When the side panel opens
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    console.log("dcom content loaded")
    // Request message
    //chrome.runtime.sendMessage({ action: "fetchMessage" });
});

document.getElementById('signIn').addEventListener('click', function() {
    console.log("sign in button clicked");
    chrome.runtime.sendMessage({ action: "userSignIn" });
});

document.getElementById('choosePartnerButton').addEventListener('click', function() {
    console.log("choose partner button clicked");
    const data = document.getElementById('choosenPartner').value;
    if (data.includes("@")) {
        document.getElementById('responseMessage').innerHTML = "must be a gmail address, without '@gmail.com'";;
    } else {
        document.getElementById('responseMessage').innerHTML = ""
        chrome.runtime.sendMessage({ action: "userChoosePartner", event: data });
    }
});

document.getElementById('replyButton').addEventListener('click', function() {
    console.log("reply button clicked");
    const data = document.getElementById('messageToSend').value;
    console.log("user clicks message send button, message: ", data);
    chrome.runtime.sendMessage({ action: "sendMessageToParter", event: data });
});

document.getElementById('okButton').addEventListener('click', function() {
    console.log("ok Button clicked");
    showMessages();
});

document.getElementById('noButton').addEventListener('click', function() {
    console.log("no Button clicked");
    showChoosePartner();
});

document.getElementById('clearMessageButton').addEventListener('click', function() {
    console.log("clear Button clicked");
    document.getElementById('incomingMessageText').innerHTML = " ... ";
});

document.getElementById('infoButton').addEventListener('click', function() { 
    console.log("close info button clicked");
    window.open("./messenger_info.html", "_blank");
})

function checkAuthentication() {
    chrome.storage.local.get(['token'], function(result) {
        if (result.token) {
        // Ask the service worker to validate the token
            chrome.runtime.sendMessage({ action: "validateToken", token: result.token }, function(response) {
            if (response.isValid) {
                // The token is valid, proceed to fetch calendar events
                console.log("token is valid, proceed to fetch calendar events")
                document.getElementById('signIn').style.display = 'none';
                chrome.runtime.sendMessage({ action: "userSignIn" });
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

function showMessages(userData) {
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
}

function hideMessages() {
    document.getElementById('signIn').style.display = 'block';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
    document.getElementById('signOutContainer').style.display = 'none';
}

//welcome back and user verify partner
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
    } else {
        document.getElementById('incomingMessageText').innerHTML = "(waiting for message)"
    }
}

function confirmMessageReceipt(sender) {
    console.log("sender: ", sender)
    chrome.runtime.sendMessage({ action: "deleteMessage", data: sender })
}

chrome.runtime.onMessage.addListener((message, event, sender, sendResponse) => {
    console.log("message:", message)
    if (message.action === "messageForOnlineUser") {
        console.log("message for online user:", message.event.data)
    }

    if (message.action === "welcomeBack") {
        let text = message.event;
        console.log("welcome user back")
        console.log(text);
        welcomeUserBack(text);
    };
    if (message.action === "showChoosePartner") {
        console.log("show choose partner now");
        showChoosePartner();
    }
    if (message.action === "partnerAdded") { 
        document.getElementById('responseMessage').innerHTML = "Your partner " + message.event + " has been registered.";
        ;
    }
    if (message.action === "partnerIsInDb") {
        console.log("partner is in db");
        document.getElementById('responseMessage').innerHTML = "Your partner is also using mini messenger.";
        showStatusMessage();
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
        if (message.event.messageText === " ") {
            document.getElementById('incomingMessageText').innerHTML = "Waiting for new message .. ";
        } else {
            document.getElementById('incomingMessageText').innerHTML = message.event.messageText;
        }
        const sender = message.event.sender;
        console.log("sender:", sender);
        confirmMessageReceipt(sender);
        showMessages();
    }
    if (message.action === "messageSent") {
        console.log("message sent notification");
        document.getElementById('responseMessage').innerHTML = "Message sent!";
        showMessages();
    }
    // if (message.action === "cannotSendNewMessageNow") {
    //     console.log("user can't send new message")
    //     document.getElementById('responseMessage').innerHTML = "Last message not received yet!";
    //     showMessages();
    // }
})