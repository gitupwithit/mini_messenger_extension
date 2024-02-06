console.log("script.js loaded")

const outgoingMessageForm = document.getElementById('outgoingMessageForm');
const messageToSend = document.getElementById('messageToSend');

outgoingMessageForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    console.log('Form submitted');
    event.target.querySelector('button[type="submit"]').disabled = true;
    const data = { title: messageToSend.value }
    console.log("message to send: ", data)

})