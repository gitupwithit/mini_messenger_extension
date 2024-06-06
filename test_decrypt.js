const crypto = require('crypto');

// UserA's private key in PEM format (base64 encoded)
const privateKeyBase64 = `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCY19nh5LWfGP4/GywsHkhVURbJK7fGCaD4+opKi2yho19T7d2zpKL2vmBW4zqtZ3US+HGEM78/ZKw+zXRhX/JYelBmilY8eZmDIbCMuS0KADkU3+Z6YMHbS1H08fDu0rtcxTHoNY8wJPLOdNpIRcpx5fY9B8lCaGqF5V24acZnEXYKYz0DkL7tlyQT0bC/rycOJzIi+45w09M/hKBQLodkTtLSrPXfTUS/NbrjSR024XVYqUDQXIb1XVXJ60F6Ki1xmXqRmk0/nW5+DEFQJAtmrcqRNT8DHaykwvVSWpr8i7yZ/l7Mo0pFnE9R7f/MZ/gQFuKW/Gm+YLw40+8ubNqXAgMBAAECggEAA1vBwF7Neqsnse+PmLBlHDhEJcWQjuBNYOD9LngN6JuEQTguC+LjFlvjuTfxn1qf7hMCdtAmow9e1Vu2/yw1USpLmbMGj50qxPUYsG+hwcQufOmGv6KmL9QnohgXDLNIP9ilOn/xsKaKGadYTLazgiICCM7/8c1LGkf+t20Mqwu2Emj+k5l1d006dlBG+QChIg3qLA3Pw/aglaQzHpE0scHEhJrc1CurS5zf5craPJ28H9labwiyq2kXS4Bgl7h2o1/kqmjL6El7LrCywgPAMTEnJKFuQKh/J2ZUczQJ4MrY58pwKCVXlb9fhiutiCftaXnEmGV1gsiwRbYpV90//QKBgQDKHpScck7GbHoxDVdSnJpxf0n0P7xapUJ3EqgnJ4+BG//mokrj8WGA33yd2If+/rTuLX4Fxn8b85W7L8CgXROpI2gxsll3A6DVRMAWaMEfDmtwb24Gc6Cjrrt8wDaWV3NcaroSVwxIOvUCJjmsnJzV/uhjMBCD/6oncehqhpKRBQKBgQDBlnb2so83nZpWOxq/hcp7PYh18rMmY59a6lcOsLqQpwLT4Y/2lDHi2mZubpXl508NyKec36k4ypFEHaOJwGLOYmmdeFy7LpOfFYWa9Z1fna65twNN8Sd2iR1CNQOsYwdpa5+/XbQ14Oq1qSCNXSgpFQUtYSRt6FdRTlZsGCO/6wKBgAnn7citIYdAEc0NplX6LueZIXrDFOwsZVGIrI0etz3QrX4UPi9lyS2TxnvF/QRWX2+88ww9akVobtI5yOsTJL+JaLXm09OtbdiGAhQXFj/7aPCdxXqzeBANpEq88O/1YUYKRQxZD9UKbq+oR/NZyaYDVEhoNqcBhMliH834wn4xAoGBALSBS+Ozkv7UoXgOHF7ArZBES91Os+Tztz7aitpTx2HhmC1ggQ/2Fp3j7ubBjluUVo4PrtoDYpJlrxXIXRiwnnC6Kqh99llCkLshIjbfFiJ1sNnR3+7pEVbherqlHAu9Osf9ZjLVeJdUZQWF8aheWHgV9YHetk0U+3YAiWy5BXyJAoGAMFof+2/W78fWy2bbXjO/n+JI3B220Qqcr9vHepdDwyLmRZu6alhySX2ocQvv7T4PUqIVDCKHE8yNmYxZ8C7oc+M9OszejJB7GLNu0qApXPZuCmpGtycOIHAWTbjF1du4PBrZPELnaO/KMD9tb6EmH6a+W0a5s39vewRvIHswUS0=`

// Convert base64 encoded private key to a PEM format
const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

// The encrypted message in base64
const encryptedMessageBase64 = `Nl8x4RBt2cVLmVp7YYkyV2rfkcJtbxp0X2ips7lnVPbgngzTvK+8Og3acmuKJVJlnp3lpY0TOmblr3LkzCCqj+FnzEHRstyIKawgZzMloIjovAsdh6HEjVzrFWwqhFi7pzwB72Tdnn2697RyWDKfTmW4OuYl6goz0QjRh8hIuvvGWdaEh6VhlUXyeNu/xqPaJSz8HU7FvvtjUXqflHe5upgfdJcWTaMkJwUR+c7UH50eYBwm83QQkuwu32zseYECgWIQnezZiwSH0FP6WzFL4NFyQCYDX2WxYYaLXHO0dMo/fURYmxne7ZBU5F3TqLCY+lRPyZT9pRyt+RCb78yO5A==`

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
