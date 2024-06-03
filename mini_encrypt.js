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
        const publicKeyBase64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzUDEFoeceGVkGY9LJk7Vtb160o6QZEJzmEyDe3KmSQ9CrzUQIL031pIr+JUxFp2+J1x4DqJlFhO+VR0VfMlkNg5BdUGZjKMFgL4O5/68k60E1w+RZXFx+wpFsOgxQS7WrQtgg9BDrEze2owlgJTyLo4H+j+FGe57e3qnb+ebWUMEUHelVT4gd5vIA+O8HIGJIwrHbt8Yn92VqfDPivxLDNOn3cyQMsZm46Ixd/wD8Cdg+bfFzB3/W5BQATBaFPPGMiiTCxaL9Dde8FUtsuPFCGVdUJUrY+NnBp6aIay6tO8Kgyyw8ZsPI03S6T3w6EDC58fw+ZBm6jJQiKZnlt0viQIDAQAB';
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
