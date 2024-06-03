const crypto = require('crypto');

// UserA's private key in PEM format (base64 encoded)
const privateKeyBase64 = `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDNQMQWh5x4ZWQZj0smTtW1vXrSjpBkQnOYTIN7cqZJD0KvNRAgvTfWkiv4lTEWnb4nXHgOomUWE75VHRV8yWQ2DkF1QZmMowWAvg7n/ryTrQTXD5FlcXH7CkWw6DFBLtatC2CD0EOsTN7ajCWAlPIujgf6P4UZ7nt7eqdv55tZQwRQd6VVPiB3m8gD47wcgYkjCsdu3xif3ZWp8M+K/EsM06fdzJAyxmbjojF3/APwJ2D5t8XMHf9bkFABMFoU88YyKJMLFov0N17wVS2y48UIZV1QlStj42cGnpohrLq07wqDLLDxmw8jTdLpPfDoQMLnx/D5kGbqMlCIpmeW3S+JAgMBAAECggEACvl1Kpe4ZusT67Zw0BTrwhaGIks3Xvb7H4fqyU9XYwVm/T9+8+MuIMHKylUuzVzkkY31COJHuaMXXI1sLFKH0kiXmSWHaGDAjvJKkX66NkKsZTPaxDPpQmEZmhSGKqwulAzNTar1bVlkWobfC/Waz+Ct/kRGcX0h+teTa400jhSJ2SPpr7bfAY4kIdCh4P5ssNlnMSYGo0u9mmKzHTw4cY6fWa3n7QWY/yqze9ijH7afe93NvU5PpmMF36917V8PVmH3CaxElqJXIWLcZQ+NhKfK0UhHr9H7G3sQwVytTE0hI4AaluqPY9M4SR55LJfMcFVRzAf6oidoYzRjHPj74QKBgQDrucKa55fXsbdKyXHMbUx6P1PfvFbU6B+fJtDhGi44AYrmlKK87eG04IGKbtBpSIN7tQsKa5hs2BXhyJrLAuXj+roFvczR04XhzwzmLo6pHM4TheNsQNduR/pq6UGLBrXvVPpYgS8Db/c9n5iLchNadKskzn5PISCm8k49XOo6YQKBgQDe6A4Ztxzwkk3AEb4FFLA1j+uvgPvfygPeDBfZemWJDl2zoSjnhS57N/Xk5v07yIZuH2K6EoCpmBz/04EH5CqZFO+j0hniGM7ypxPJK8Xy1ol924ba/dk/h8Ww7cck1U36NpbwI9j/IlACU9iRxlvxXdyLMfaoPtVejL6om0WWKQKBgCBCjuB2O3CYcLY6dWl9t86vJgJjmxqOHe3A+SslUxf1FhZSVyc2AwKnCvNwEPOnqd7fOwCVEwoqVGxO8OhBoEagBJ9Oh15b7WGm3WQPERURzR4c36/r+8+q6BmDjKXDKFj1r0E3hMCarSJw2gaTeRSTDOz/mYeox/gxBwYc1i1hAoGAOJ3sZu+xtBEVGoHnJ9c3YoNps6wpTZA8JzwfGqgR/hveBPAcOaIESlvOYxOgonyuWG40X1qvv2PZicko7t4vS66bp5qH5Hu0pMF3LxOlNab0STlnKVxsv8w2lFfwyxQ6uCEBeYFBbpxCgjTVv0EIvWe/ysMoCVfcTiWlj6HQrPECgYEAr1RjuJ/1dN+rl8q54zFVkP07gSXqPh87kA4bSJRaw2sTPgxEaYW65eVBq0IJYjsfT92QX2Mv0HkG7ROB6WhDth/F7m5Yy4vMPgq2BkPdPOJvG1yhJ3Yo3ZZ/SDtwpqz0sMvGfx9OBJRUUnz5k9pae6dN3blLVOJy+SIdBtFj1n8=`;

// Convert base64 encoded private key to a PEM format
const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

// The encrypted message in base64
const encryptedMessageBase64 = `Ol44LbF/7a/CFeJDV8IQGTxtjKnrgQVM+E5vRDwgdRDlqGFjIBCk0xaY6Cou4XPyCWz4xAQURV3tBJM5cPGHfRzKdom+k6l4cPM0QHBtYZ+yMF87bnFpIURpHRybp6BlmpvwkO32spjaVg2eWzRMUBe6uvqYfSYAK0PN05dfVpTQkGLwa0f9IWLrHa+7Uz3tWTrT5p00/4WUbR11rvC7mEtqcUz1S8RMzxz7EMbwjlxVr8JF4J0SS1dlHuXYwY6IEr3mH7tVKw+bJdnxbOrn3hHE9Y10uFDpJFNT0xa/35OBN1Ija/KYgolooZoRlOFEw45BMa0K928MO8eCon+h9A==`;
const encryptedMessage = Buffer.from(encryptedMessageBase64, 'base64');

// Decrypt the message
try {
    const decryptedMessage = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      encryptedMessage
    );
    console.log('Decrypted message:', decryptedMessage.toString());
} catch (err) {
    console.error('Decryption failed:', err);
}
