const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const filePath = './keys.json';

async function updateAndVerifyKey(user, keyType, keyBase64) {
    try {
        // Read and parse the JSON file
        const data = await readFile(filePath);
        const json = JSON.parse(data);
        
        // Update the key
        json[user][keyType] = keyBase64;
        
        // Write the modified JSON back to the file
        await writeFile(filePath, JSON.stringify(json, null, 2));
        
        // Verify the key
        const newData = await readFile(filePath);
        const newJson = JSON.parse(newData);
        const storedKey = newJson[user][keyType];
        
        if (storedKey === keyBase64) {
            console.log(`Successfully updated and verified ${keyType} for ${user}`);
        } else {
            console.error(`Failed to verify ${keyType} storage for ${user}`);
        }
    } catch (err) {
        console.error(`Error in updating/verifying ${keyType} for ${user}:`, err);
    }
}

async function generateKeyPair(user) {
    try {
        // Assuming crypto and key generation functions are defined elsewhere
        const keyPair = await generateKeys();  // Placeholder for actual key generation logic
        const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);
        const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
        
        await updateAndVerifyKey(user, 'privateKey', privateKeyBase64);
        await updateAndVerifyKey(user, 'publicKey', publicKeyBase64);
        
        console.log('Key pair generation and verification completed successfully for', user);
    } catch (err) {
        console.error('Error generating key pair for', user, ':', err);
    }
}


async function exportPrivateKey(privateKey) {
    const exportedPrivateKey = await crypto.subtle.exportKey("pkcs8", privateKey);
    const privateKeyBase64 = arrayBufferToBase64(exportedPrivateKey);
    console.log("Exported Private Key (base64):", privateKeyBase64);
    return privateKeyBase64
}

async function exportPublicKey(publicKey) {
    const exportedPublicKey = await crypto.subtle.exportKey("spki", publicKey);
    const publicKeyBase64 = arrayBufferToBase64(exportedPublicKey);
    console.log("Exported Public Key (base64):", publicKeyBase64);
    return publicKeyBase64
}

async function generateKeys() {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: "SHA-256" },
            },
            true,
            ["encrypt", "decrypt"]
        );
        return keyPair
    } catch (err) {
        console.error("Error generating key pair:", err);
        return false;
    }
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const binaryString = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    return btoa(binaryString);
}

generateKeyPair("userA");
// generateKeyPair("userB");