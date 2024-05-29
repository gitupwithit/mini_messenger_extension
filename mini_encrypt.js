// for testing purposes

let myPrivateKey
let partnerPublicKey

async function getKeys() {
    console.log("get keys")
    myPrivateKey = await checkMyPrivateKey()
    partnerPublicKey = await checkPartnerPublicKey()
}

async function decryptMessage(encryptedMessage) {
    return new Promise(async (resolve, reject) => {
        console.log("Encoded message:", encryptedMessage);
        const buffer = base64ToArrayBuffer(encryptedMessage);
        console.log("ArrayBuffer message:", buffer);

        chrome.storage.local.get(['myPrivateKey'], async function(result) {
            let myPrivateKey = result.myPrivateKey;
            if (!myPrivateKey) {
                console.log('No private key found.');
                reject('No private key found.');
                return;
            }

            try {
                const binaryDer = base64ToArrayBuffer(myPrivateKey);
                console.log("Binary DER:", binaryDer);
                const importedPrivateKey = await crypto.subtle.importKey(
                    'pkcs8',
                    binaryDer,
                    { name: "RSA-OAEP", hash: { name: "SHA-256" }},
                    true,
                    ["decrypt"]
                );

                console.log("Imported private key:", importedPrivateKey);

                const decrypted = await crypto.subtle.decrypt(
                    { name: "RSA-OAEP" },
                    importedPrivateKey,
                    buffer
                );
                const decodedMessage = new TextDecoder().decode(decrypted);
                console.log("Decrypted message:", decodedMessage);
                resolve(decodedMessage);
            } catch (err) {
                console.error('Decryption error:', err);
                if (err instanceof DOMException) {
                    console.log('DOMException error:', err.name, err.message);
                } else if (err instanceof Error) {
                    console.log('Error:', err.name, err.message, err.stack);
                }
                reject(err);
            }
        });
    });
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const binaryString = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    return btoa(binaryString);
}

async function encryptMessage(unencryptedMessage, partnerPublicKey) {
    const data = new TextEncoder().encode(unencryptedMessage);
    try {
        // partnerPublicKey = stripPublicKeyHeaders(partnerPublicKey);
        const binaryDer = Uint8Array.from(atob(partnerPublicKey), c => c.charCodeAt(0));

        const importedPublicKey = await crypto.subtle.importKey(
            'spki',
            binaryDer,
            { name: "RSA-OAEP", hash: { name: "SHA-256" }},
            true,
            ["encrypt"]
        );

        const encrypted = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            importedPublicKey,
            data
        );

        const encryptedMessage = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

        console.log("encrypted message:", encryptMessage)

    } catch (err) {
        console.error('Encryption error:', err);
    }
}



// let encryptedMessage = await encryptMessage("hi how are you?")
// let decryptMessage = await decryptMessage(encryptedMessage)