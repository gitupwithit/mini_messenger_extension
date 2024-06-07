
// mini messenger server
// user = user
// partner = user's partner

const { log } = require('console');
const { parse } = require('path');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const wss = new WebSocket.Server({ port: 8000 });

console.log("server running")

const currentlyConnectedClients = [];

let db = new sqlite3.Database('./mydb.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the mydb.sqlite database.');
  });

wss.on('connection', async function connection(ws) {
    console.log("socket open")
    // console.log("ws", ws._events)
    ws.on('message', async function incoming(message) {
        // console.log("all clients at open: ", currentlyConnectedClients)
        const parsedData = JSON.parse(message)
        console.log('socket message received:', parsedData);
        if (parsedData === undefined) {
            console.log("socket message is undefined")
            return
        }

        if (parsedData.instruction === "sendUserDataToServer") {
            //console.log("adding user data to db")
            addUserDataToDb(parsedData.data, ws)
        }

        let userExists = currentlyConnectedClients.find(client => client.id === parsedData.data.userID);

        if (!userExists) {
            // add open connection to list
            if (parsedData.data.userID != undefined && parsedData.data.userID != null) {
                currentlyConnectedClients.push({id: parsedData.data.userID, ws: ws});
            }
        } else {
            // The user already exists in the array
            //console.log("User already online");
        }
        currentlyConnectedClients.forEach((client) => {
            //console.log(client.id, "is online at socket open")
        })
        if (parsedData.instruction === "checkNewMessageExtClosed") {
            try {
                const userPartner = await getPartner(parsedData.data.userID, ws);
                // console.log("userpartner:", userPartner);
                if (userPartner) {
                    checkNewMessageExtClosed(userPartner, ws);
                }
            } catch (error) {
                console.error("Error getting partner: ", error);
            }
            return;
        }
        if (parsedData.instruction === "addPartner") {
            try {
                if (parsedData.data.partnerID) {
                    addPartner(parsedData, ws);
                } else {
                    //console.log("no partnerID specified");
                }
            } catch (error) {
                //console.log("error adding partner:", error);
            }
        }
        if (parsedData.instruction === "clearUserDataFromServer") {
            clearUser(parsedData.data.userID, ws);
            return
        }
        if (parsedData.instruction === "checkNewMessage") {
            // check if user is in db
            if (parsedData.data.userID == null) {
                //console.log("userID is null")
                return;
            } else {
                db.all(`SELECT userID FROM messages WHERE userID = ?`, [parsedData.data.userID], (err, rows) => {
                    if (err) {
                        throw err;
                    }
                    if (rows.length > 0) {
                        // User already exists
                        //console.log("Duplicate userID, not adding to DB.");
                        checkForPartner(parsedData, ws)
                    } else {
                        //console.log("ERROR - user not in db.");
                        
                    }
                })
            } 
            // console.log("check for new msg for: ", parsedData.data.userID);
            try {
                const userPartner = await getPartner(parsedData, ws);
                //console.log("userpartner:", userPartner);
                if (userPartner) {
                    getMessage(parsedData, userPartner, ws);
                } else {
                    //console.log("user has no partner")
                    const messageForUser = {"instruction":"choosePartner"}
                    ws.send(JSON.stringify(messageForUser))
                    return
                }
            } catch (error) {
                console.error("Error getting partner: ", error);
            }
            return;
        }
        if (parsedData.instruction === "sendPublicKeyToPartner") {
            console.log("update public key for partner:")
            // addPublicKey(parsedData, ws)
        }
        if (parsedData.instruction === "getPartnerPublicKey") {
            console.log("get Partner Public Key", )
            getPartnerPublicKey(parsedData, ws)
        }
        if (parsedData.instruction === "deleteMessage") {
            // console.log("should delete last message from partner: ", parsedData.data.sender)
            deleteMessage(parsedData, ws)
            return
        }
        if (parsedData.instruction === "newMessageForPartner") {
            console.log(parsedData.data.userID, "is sending this message:", parsedData.data.message, "to:", parsedData.data.partnerID)
            updateMessageToSend(parsedData, ws)
            return
        }
    });
    // Handle close
    ws.on('close', () => {
        // Remove closed connection from list of connections
        console.log("socket closed")
        const index = currentlyConnectedClients.indexOf(ws);
        //console.log("index =", index);
        if (index > -1) {
            currentlyConnectedClients.splice(index, 1);
        }
        currentlyConnectedClients.forEach((client) => {
            //console.log("client online at socket close: ", client.id);
        });
    });
})

// add to db userID, partnerID, myPublicKey
async function addUserDataToDb(data, ws) {
    console.log("Adding new user to db:", data);
        db.run(`INSERT INTO messages (userID, partnerID, message, publicKey, unixTime) VALUES (?, ?, ?, ?, ?)`, [data.userID, data.partnerID, null, data.myPublicKey, null], function(err) {
            if (err) {
                return console.error(err.message);
            }
            //console.log(`A new user has been inserted with rowid ${this.lastID}`);
            // confirm db update to client
            const messageForUser = { "instruction": "userAddedSuccessfully" }
            ws.send(JSON.stringify(messageForUser)) 
        });

}

async function getPartnerPublicKey(parsedData, ws) {
    // get user's partner
    const partnerID = parsedData.data.partnerID;
    console.log("parsedData:", parsedData)
    console.log("get public key for partner:", partnerID);
    // get partner's publicKey
    let partnerPublicKey;
    return new Promise((resolve, reject) => {
        db.all(`SELECT publicKey FROM messages WHERE userID = ?`, [partnerID], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err); // Reject the promise on error
                return;
            } else if (rows.length === 0) {
                //console.log("no partner public key foind in db");
                const messageForClient = {"instruction":"noPartnerPublicKeyOnServer" } 

                // write data (userID, partnerID, publicKey)
                // let dataToAdd = { "userID": parsedData.data.userID, "partnerID": parsedData.data.partnerID, "myPublicKey": parsedData.data.myPublicKey }
                // console.log("data to add:", dataToAdd)
                // addUserDataToDb(dataToAdd, ws)

                console.log("msg for client:", JSON.stringify(messageForClient))
                ws.send(JSON.stringify(messageForClient))
                // save incoming message
                // console.log("message", parsedData.data.message)
                // if (!parsedData.data.message) {return}
                // db.run(`UPDATE messages SET message = ? WHERE userID = ?`, [parsedData.data.message, parsedData.data.userID], function(err) { 
                //     if (err) {
                //         return console.error(err.message);
                //     }
                //     console.log(`198 A row has been inserted with rowid ${this.lastID}`);
                //     const messageForClient = {"instruction":"messageForPartnerSavedPartnerNotRegistered" } 
                //     console.log("msg for client:", JSON.stringify(messageForClient)) // logs as 'msg for client: {"instruction":"publicKeyForUser"}'
                //     ws.send(JSON.stringify(messageForClient))
                // })
                resolve(""); 
                return;
            } else {
                partnerPublicKey = rows[0].publicKey
                const messageForClient = {"instruction":"publicKeyForUser", "data": partnerPublicKey } 
                console.log("msg for client:", JSON.stringify(messageForClient)) 
                ws.send(JSON.stringify(messageForClient))
                resolve("publicKey")
            }
        })
    })
}

// Get user's partner
async function getPartner(parsedData, ws) {
    return new Promise((resolve, reject) => {
        //console.log("looking for ", parsedData.data.userID, "'s partner");
        db.all(`SELECT partnerID FROM messages WHERE userID = ?`, [parsedData.data.userID], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err); // Reject the promise on error
                return;
            }
            if (rows.length === 0) {
                //console.log("1 Partner not found in db");
                promptUserToChoosePartner(ws)
                resolve(""); // Resolve with empty string or appropriate value
                
                return;
            }
            // Assuming you want the last partner if multiple are found
            const partnerID = rows[0].partnerID;
            //console.log("partner found, ", partnerID);
            resolve(partnerID); // Resolve the promise with partnerID
        });
    });
}

async function checkIfUserIsOnline(parsedData) {
    return new Promise((resolve, reject) => {
        let userIsOnline = currentlyConnectedClients.find(client => client.id === parsedData.data.partnerID);
        if (userIsOnline) {
            //console.log("user online", userIsOnline)
            resolve(userIsOnline)
        } else {
            //console.log("user is not online")
            resolve(false)
        }
    })
}

async function addPublicKey(parsedData, ws) {
    // check if user is online, if yes: send key, if no: store key
    let partner = await getPartner(parsedData, ws)
    if (!partner) {
        //console.log("partner not found")
        return
    }
    //console.log("partner found:", partner)
    let userIsOnline = await checkIfUserIsOnline(parsedData)
    if (!userIsOnline) {
        console.log("partner is not online, saving key")
        db.run(`UPDATE messages SET publicKey = ? WHERE userID = ?`, [parsedData.data.publicKey, parsedData.data.userID], function(err) { 
            if (err) {
                return console.error(err.message);
            }
            //console.log(`209 A row has been inserted with rowid ${this.lastID}`);
        })
        return
    } else {
        console.log("send public key to partner")
        const messageForClient = {"instruction": "sendPublicKeyToUser", "message": parsedData.data.publicKey}
        userIsOnline.ws.send(JSON.stringify(messageForClient))
    }
}

// Add partner
function addPartner(parsedData, ws) {
    // check if user already as partner
    //console.log(`check if ${parsedData.data.userID} has a previously chosen partner`) 
    db.all(`SELECT partnerID FROM messages WHERE userID = ?`, [parsedData.data.userID], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        rows.forEach((row) => {
            //console.log("partner results for user:", row )
        })
        if (rows.length > 0 && rows[0].partnerID != null && rows[0].partnerID != undefined) {
            //console.log("user already has partner: ", rows[0])
            const messageForClient = {"instruction": "userHasExistingPartner"}
            ws.send(JSON.stringify(messageForClient))
        } else {
            //console.log("no user partner found in db, adding")
            // add user's partner to db
            db.run(`UPDATE messages SET partnerID = ? WHERE userID = ?`, [parsedData.data.partnerID, parsedData.data.userID], function(err) { 
                //console.log("partnerID:", parsedData.data.partnerID, " userID:", parsedData.data.userID)
                if (err) {
                    return console.error(err.message);
                }
                //console.log(`240 A row has been inserted with rowid ${this.lastID}`);
            })
            // check if partner is in db already
            //console.log("checking if partner is registered")
            db.all(`SELECT userID FROM messages WHERE userID = ?`, [parsedData.data.partnerID], (err, rows) => {
                // console.log(rows)
                if (err) {
                    console.error(err.message);
                    return;
                }
                // notify user
                if (rows.length > 0) {
                    //console.log("partner added, is in db:", rows[0])
                    const messageForClient = {"instruction": "partnerAddedIsInDb"};
                    ws.send(JSON.stringify(messageForClient));
                } else {
                    //console.log("partner added, is not in db")
                    const messageForClient = {"instruction": "partnerAddedIsNotInDb"};
                    ws.send(JSON.stringify(messageForClient));
                }

            })
        }
    })
}

// Check for message when user's extension is closed
function checkNewMessageExtClosed(partnerID, ws) {
     console.log("looking for new messages from ", partnerID)
     db.all(`SELECT message FROM messages WHERE userID = ?`, [partnerID], (err, rows) => {
         // console.log(rows)
         if (err) {
             console.error(err.message);
             return;
         }
         rows.forEach((row) => {
             // console.log("row: ", row)
             console.log("row message:", row.message)

             if (row.message === undefined) {
                 console.log("no message for user with ext closed")
             } else {
                if (row.message != " ") {
                    console.log("no new message")
                    const messageForClient = {"instruction": "newMessageExtClosed"}
                    ws.send(JSON.stringify(messageForClient))
                }
             }
             
         })
     })
}

// Clear user info from server
function clearUser(user, ws) {
    console.log("clear data for", user)
    db.run('DELETE FROM messages WHERE userID = ?', user, function(err) {
        if (err) {
            console.error(err.message);
        } else {
            console.log(`Row(s) deleted: ${this.changes}`);
        }
    });
}

// Prompt user to choose a partner
function promptUserToChoosePartner(ws) {
    const messageForUser = {"instruction": "choosePartner"}
    ws.send(JSON.stringify(messageForUser)) 
}

// Check for partner
function checkForPartner(parsedData, ws) {
    // check if user has a partner
    // console.log("parsed Data2:", parsedData)
    db.all(`SELECT partnerID FROM messages WHERE userID = ?`, [parsedData.data.userID], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        if (rows.length < 1) {
            promptUserToChoosePartner(ws)
            return
        }
        if (rows.length > 0) {
            rows.forEach((row) => {
                //console.log("partner results for user:", row )
            })
            if (rows[0].partnerID === null || rows[0].partnerID === undefined) {
                promptUserToChoosePartner(ws)
                return
            } else {
                //console.log("user has registered partner: ", rows[0].partnerID)
                const partnerID = rows[0].partnerID
                //console.log("partnerID:", partnerID)
                //check if partner is in db yet
                db.all(`SELECT partnerID FROM messages WHERE userID = ?`, partnerID, (err, rows) => {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    if (rows.length < 1) {
                        // chosen partner is not registered 
                        const messageForClient = {"instruction": "partnerAddedIsNotInDb"};
                        ws.send(JSON.stringify(messageForClient));
                        return
                    }
                    if (rows.length > 0) {
                        //console.log("partner,", partnerID, "found in db")
                        // notify user
                        const messageForClient = {"instruction": "partnerIsInDb"};
                        ws.send(JSON.stringify(messageForClient));
                        // look for partner's publicKey


                    }
                })
            }
        }
    })
}

function getMessage(parsedData, partner, ws) {
    console.log("Looking for new messages for", parsedData.data.userID, "from", partner);
    db.all(`SELECT message FROM messages WHERE userID = ?`, [partner], (err, rows) => {
        if (err) {
            console.error("Database error:", err.message);
            return;
        }
        if (rows.length > 0 && rows[0].message) {
            // Assuming the message is stored as a base64 string in the database
            console.log("Retrieved message:", rows[0].message);
            // const buffer = base64ToArrayBuffer(rows[0].message); // Convert base64 string to ArrayBuffer
            // const encodedBinary = arrayBufferToBase64(buffer); // Now convert ArrayBuffer to base64 string properly

            const messageForClient = {
                "instruction": "newMessageForUser",
                "message": rows[0].message,
                "sender": partner
            };
            console.log("Message Length:", rows[0].message.length);
            ws.send(JSON.stringify(messageForClient));
        } else {
            console.log("No message found from partner:", partner);
        }
    });
}

// function arrayBufferToBase64(buffer) {
//     console.log("Input buffer object:", buffer);  // Log the full buffer object to inspect it
//     if (buffer instanceof ArrayBuffer) {
//         // Proceed if buffer is indeed an ArrayBuffer
//         let binary = Buffer.from(buffer).toString('base64');
//         console.log("Encoded binary:", binary);
//         return binary;
//     } else if (buffer && buffer.message instanceof ArrayBuffer) {
//         // Additional check in case the ArrayBuffer is nested inside an object property
//         let binary = Buffer.from(buffer.message).toString('base64');
//         console.log("Encoded binary from nested message:", binary);
//         return binary;
//     } else {
//         console.log("Error: Input is not an ArrayBuffer.");
//         return null; // or throw an error as appropriate
//     }
// }

// function base64ToArrayBuffer(base64) {
//     const buffer = Buffer.from(base64, 'base64');
//     return buffer.buffer; // Convert Buffer to ArrayBuffer if necessary
// }

// Send or update message for partner
function updateMessageToSend(parsedData, ws) {
    // console.log("parseddata:",parsedData)
    console.log("add or update message to send .. new message:", parsedData.data.message)
    const unixTime = Date.now(); // Get current time in milliseconds
    // Check if recipient is online
    db.all(`SELECT partnerID, message FROM messages WHERE userID = ?`, [parsedData.data.userID], (err, rows) => {
        let partnerID = ""
        if (err) {
            console.error(err.message);
            return;
        }
        if (rows.length === 0) {
            //console.log("user not found in db error")
            // promptUserToChoosePartner(ws)
            // return
        }
        if (rows.length > 0) {
            rows.forEach((row) => {
                // console.log("262row: ", row)
                if (row.partnerID === null || row.partnerID === undefined) {
                    console.log("error - no user partener found")
                } else {
                    // console.log("recipient is: ", row.partnerID)
                    // console.log("currently connnected clients:", currentlyConnectedClients)
                    let partnerIsOnline = currentlyConnectedClients.find(client => client.id === row.partnerID);
                    if (partnerIsOnline) {
                        //console.log("online partner", partnerIsOnline.id)
                        console.log("new msg:", parsedData.data.message, "for recipient", row.partnerID, "who is online, from user:", parsedData.data.userID)
                        const messageForClient = {"instruction":"messageForOnlineUser", "data": parsedData.data.message, "sender": parsedData.data.userID}
                        partnerIsOnline.ws.send(JSON.stringify(messageForClient))
                        return
                    }
                }
            })
        }
    })

    // Check for existing message for the user
    db.all(`SELECT message FROM messages WHERE userID = ?`, [parsedData.data.userID], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // updating message to partner
        //console.log("rows length:", rows.length)
        if (rows.length > 0) {
            rows.forEach((row) => {
                //console.log("existing message=", row.message);
                const unixTime = Date.now();
                // console.log("Adding new message to DB.");

                console.log(parsedData.data.userID, parsedData.data.message, unixTime)
                db.run(`UPDATE messages SET message = ?, unixTime = ? WHERE userID = ?`, [parsedData.data.message, unixTime, parsedData.data.userID], function(err) {
                    if (err) {
                        return console.error(err.message);
                    }
                //console.log(`Row(s) updated: ${this.changes}`);
                const messageForUser = {"instruction":"messageSent"}
                ws.send(JSON.stringify(messageForUser))
                })
            })
        }
    })
}

// Delete last message
function deleteMessage(parsedData, ws) {
    // console.log("delete last message")
    db.all(`SELECT message FROM messages WHERE userID = ?`, [parsedData.data.sender], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // updating message to partner
        // console.log("rows length:", rows.length, " sender: ", parsedData.data.sender)
        if (rows.length > 0) {
            rows.forEach((row) => {
                const blankMessage = " ";
                // console.log("existing message=", row.message);
                if (row.message != null && row.message != "null" && row.message != " ") {
                    const unixTime = Date.now();
                    // console.log("Deleting message in DB.");
                    db.run(`UPDATE messages SET message = ?, unixTime = ? WHERE userID = ?`, [blankMessage, unixTime, parsedData.data.sender], function(err) {
                        if (err) {
                            return console.error(err.message);
                        }
                    // console.log(`Row(s) updated: ${this.changes}`);
                    })
                } else {
                    console.log("message is blank no need to delete")
                }
            })
            // updateMessageToSend(parsedData, ws);
        }
    })
}
