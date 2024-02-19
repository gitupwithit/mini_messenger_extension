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
    chrome.runtime.sendMessage({ action: "sendMessage", event: data });
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
}

function hideMessages() {
    document.getElementById('signIn').style.display = 'block';
    document.getElementById('choosePartnerContainer').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
}

chrome.runtime.onMessage.addListener((message, events, sender, sendResponse) => {
    if (message.action === "showChoosePartner") {
        console.log("show choose partner now")
        showChoosePartner()
    }
    if (message.action === "showMessages") {
        console.log("show messages now")
        showMessages()
    }
})
