console.log("script.js loaded")

// When the side panel opens
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    // Request message
    chrome.runtime.sendMessage({ action: "fetchMessage" });
});

document.getElementById('signIn').addEventListener('click', function() {
    console.log("sign in button clicked")
    chrome.runtime.sendMessage({ action: "userSignIn" });
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

function showMessages() {
    document.getElementById('signIn').style.display = 'none';
    document.getElementById('incomingMessageContainer').style.display = 'block';
    document.getElementById('outgoingMessageContainer').style.display = 'block';
}

function hideMessages() {
    document.getElementById('signIn').style.display = 'block';
    document.getElementById('incomingMessageContainer').style.display = 'none';
    document.getElementById('outgoingMessageContainer').style.display = 'none';
}

chrome.runtime.onMessage.addListener((message, events, sender, sendResponse) => {
    if (message.action === "showMessages") {
        console.log("show messages now")
        document.getElementById('signIn').style.display = 'none';
        document.getElementById('incomingMessageContainer').style.display = 'block';
        document.getElementById('outgoingMessageContainer').style.display = 'block';
    }
})
