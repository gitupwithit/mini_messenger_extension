const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const filePath = './keys.json';

async function getPrivateKey(user) {
    try {
        const data = await readFile(filePath);
        const json = JSON.parse(data);
        return base64ToArrayBuffer(json[user]['privateKey']);
    } catch (err) {
        console.error('Failed to read private key for', user, ':', err);
        throw err; // rethrow to handle the error in the caller function
    }
}

async function decryptMessage(encryptedMessage, user) {
    try {
        const privateKeyBuffer = await getPrivateKey(user);
        const importedPrivateKey = await crypto.subtle.importKey(
            'pkcs8',
            privateKeyBuffer,
            { name: "RSA-OAEP", hash: { name: "SHA-256" }},
            true,
            ["decrypt"]
        );

        const buffer = base64ToArrayBuffer(encryptedMessage);
        const decrypted = await crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            importedPrivateKey,
            buffer
        );

        const decodedMessage = new TextDecoder().decode(decrypted);
        return decodedMessage; // return the decrypted message
    } catch (err) {
        console.error('Decryption error:', err);
        throw err; // rethrow to allow caller to handle
    }
};

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Usage example
decryptMessage("UTyFS6W34fuxi5Oy1nqc81S7BtEpPrz8mI3+EsTEvHliVRHzOE4m2cczbVBXD+9TwxvorqZQ37+X38fTai3RuBCPGV1Li1xZhNSLGYYqSK0aBtCVzWOL2zy93ffR36Q9geThwd4H0UGe/RaUJbZwz8RPamJcH1IBzgz2wtyahmr6Gw1Y4+7OTwSsd41wWVPW8FWn1/Q+zgtGLWvVsWCmRM75Ks0/8w697x6tWIKAUf0aS5VCpdbfTTSZOLHha4vFSUUjYwoiPfGUZLt3YAqvz+Boz+oYRlpirjdWca73GVDYF1pDvakCBjNHXHXT54AuKmurQcEuiVprvcqrTgU2TA==", "userA").then(decodedMessage => {
    console.log("Decrypted Message:", decodedMessage);
}).catch(err => {
    console.error("Failed to decrypt message:", err);
});