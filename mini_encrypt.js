const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const filePath = './keys.json';

async function getPublicKey(user) {
    try {
        const data = await readFile(filePath);
        const json = JSON.parse(data);
        console.log("Public Key for", user, "retrieved successfully.");
        return json[user]['publicKey'];
    } catch (err) {
        console.error('Failed to read public key for', user, ':', err);
        throw err; // rethrow the error to be handled by the caller
    }
}

async function encryptMessage(recipientUser, unencryptedMessage) {
    try {
        const publicKeyBase64 = await getPublicKey(recipientUser);
        const binaryDer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
        const importedPublicKey = await crypto.subtle.importKey(
            'spki',
            binaryDer,
            { name: "RSA-OAEP", hash: { name: "SHA-256" }},
            true,
            ["encrypt"]
        );
        const data = new TextEncoder().encode(unencryptedMessage);
        const encrypted = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            importedPublicKey,
            data
        );
        const encryptedMessage = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        console.log("Encrypted message:", encryptedMessage);
        return encryptedMessage; // return the encrypted message for further use
    } catch (err) {
        console.error('Encryption error for message to', recipientUser, ':', err);
        throw err; // rethrow to allow caller to handle
    }
}

encryptMessage("userA", "hi how are you?").then(encryptedMessage => {
    console.log("Encrypted Message:", encryptedMessage);
}).catch(err => {
    console.error("Failed to encrypt message:", err);
});
