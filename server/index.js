
// mini messenger server
// user = user
// partner = user's partner

const { log } = require('console');
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
        console.log('received:', parsedData);
        if (parsedData === undefined) {
            console.log("socket message is undefined")
            return
        }

        let userExists = currentlyConnectedClients.find(client => client.id === parsedData.userID);

        if (!userExists) {
            // add open connection to list
            if (parsedData.userID != undefined && parsedData.userID != null) {
                currentlyConnectedClients.push({id: parsedData.userID, ws: ws});
            }
        } else {
            // The user already exists in the array
            console.log("User already online");
        }
        currentlyConnectedClients.forEach((client) => {
            console.log(client.id, "is online at socket open")
        })
        if (parsedData.instruction === "checkNewMessageExtClosed") {
            try {
                const userPartner = await getPartner(parsedData.userID, ws);
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
                if (parsedData.toID) {
                    addPartner(parsedData, ws);
                } else {
                    console.log("no toID specified");
                }
            } catch (error) {
                console.log("error adding partner:", error);
            }
        }

        if (parsedData.instruction === "clearUser") {
            clearUser(parsedData.userID, ws);
            return
        }
        if (parsedData.instruction === "checkNewMessage") {
            // check if user is in db
            if (parsedData.userID == null) {
                console.log("userID is null")
                return;
            } else {
                db.all(`SELECT userID FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
                    if (err) {
                        throw err;
                    }
                    if (rows.length > 0) {
                        // User already exists
                        console.log("Duplicate userID, not adding to DB.");
                        checkForPartner(parsedData, ws)
                    } else {
                        // if user doesn't exist, add to db
                        console.log("Adding new user to db.");
                        db.run(`INSERT INTO messages (userID, toID, message, unixTime) VALUES (?, ?, ?, ?)`, [parsedData.userID, null, null, null], function(err) {
                            if (err) {
                                return console.error(err.message);
                            }
                            console.log(`A new user has been inserted with rowid ${this.lastID}`);
                            promptUserToChoosePartner(ws)
                        });
                    }
                })
            } 
            // console.log("check for new msg for: ", parsedData.userID);
            try {
                const userPartner = await getPartner(parsedData, ws);
                console.log("userpartner:", userPartner);
                if (userPartner) {
                    getMessage(parsedData, userPartner, ws);
                } else {
                    console.log("user has no partner")
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
            console.log("update private key for partner:")
            addPublicKey(parsedData, ws)
        }

        if (parsedData.instruction === "getPartnerPublicKey") {
            console.log("get Partner Public Key", )
            getPartnerPublicKey(parsedData, ws)
        }
        if (parsedData.instruction === "deleteMessage") {
            // console.log("should delete last message from partner: ", parsedData.sender)
            deleteMessage(parsedData, ws)
            return
        }
        if (parsedData.userID && parsedData.message) {
            // console.log("message received:", parsedData.message)
            if (parsedData.message === "is connecting to server") {
                return
            }
            // send message
            // console.log(parsedData.userID, " is sending this message; ", parsedData.message)
            // console.log("toID: ", parsedData.toID)
            updateMessageToSend(parsedData, ws) 
            return
        }
    });
    // Handle close
    ws.on('close', () => {
        // Remove closed connection from list of connections
        console.log("socket closed")
        const index = currentlyConnectedClients.indexOf(ws);
        console.log("index =", index);
        if (index > -1) {
            currentlyConnectedClients.splice(index, 1);
        }
        currentlyConnectedClients.forEach((client) => {
            console.log("client online at socket close: ", client.id);
        });
    });
})

async function getPartnerPublicKey(parsedData, ws) {
    // get user's partner
    const userPartner = await getPartner(parsedData.userID)
    // get partner's publicKey
    let publicKey
    db.all(`SELECT publicKey FROM messages WHERE userID = ?`, [userPartner], (err, rows) => {
        // console.log(rows)
        if (err) {
            console.error(err.message);
            return;
        }
        console.log("public key", rows[0])
        publicKey = rows[0]
    })
    if (publicKey) {
        const messageForClient = {"instruction":"publicKeyForUser", "data": publicKey}
        ws.send(messageForClient)
    } else {
        console.log("error with public key")
    }

}

// Get user's partner
async function getPartner(parsedData, ws) {
    return new Promise((resolve, reject) => {
        console.log("looking for ", parsedData.userID, "'s partner");
        db.all(`SELECT toID FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err); // Reject the promise on error
                return;
            }
            if (rows.length === 0) {
                console.log("Partner not found in db");
                resolve(""); // Resolve with empty string or appropriate value
                promptUserToChoosePartner(ws)
                return;
            }
            // Assuming you want the last partner if multiple are found
            const toID = rows[0].toID;
            // console.log("partner found, ", toID);
            resolve(toID); // Resolve the promise with toID
        });
    });
}

async function checkIfUserIsOnline(parsedData, ws) {
    let userIsOnline = currentlyConnectedClients.find(client => client.id === row.toID);
    if (userIsOnline) {
        console.log("user online", userIsOnline)
        resolve(userIsOnline)
    } else {
        console.log("user is not online")
        resolve("")
    }
}

function addPublicKey(parsedData, ws) {
    // check if user is online, if yes: send key, if no: store key
    let partner = getPartner(parsedData, ws)
    if (!partner) {
        console.log("partner not found")
        return
    }
    console.log("partner found:", partner)
    let userIsOnline = checkIfUserIsOnline(partner)
    if (!userIsOnline) {
        console.log("partner is not online, saving key")
        db.run(`UPDATE messages SET publicKey = ? WHERE userID = ?`, [parsedData.publicKey, parsedData.userID], function(err) { 
            if (err) {
                return console.error(err.message);
            }
            console.log(`209 A row has been inserted with rowid ${this.lastID}`);
        })
        return
    }
    console.log("send public key to partner")
    const messageForClient = {"instruction": "sendPublicKeyToUser", "message": parsedData.publicKey}
    userIsOnline.ws.send(JSON.stringify(messageForClient))
}

// Add partner
function addPartner(parsedData, ws) {
    // check if user already as partner
    console.log(`check if ${parsedData.userID} has a previously chosen partner`) 
    db.all(`SELECT toID FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        rows.forEach((row) => {
            console.log("partner results for user:", row )
        })
        if (rows.length > 0 && rows[0].toID != null && rows[0].toID != undefined) {
            console.log("user already has partner: ", rows[0])
            const messageForClient = {"instruction": "userHasExistingPartner"}
            ws.send(JSON.stringify(messageForClient))
        } else {
            console.log("no user partner found in db, adding")
            // add user's partner to db
            db.run(`UPDATE messages SET toID = ? WHERE userID = ?`, [parsedData.toID, parsedData.userID], function(err) { 
                console.log("toID:", parsedData.toID, " userID:", parsedData.userID)
                if (err) {
                    return console.error(err.message);
                }
                console.log(`240 A row has been inserted with rowid ${this.lastID}`);
            })
            // check if partner is in db already
            console.log("checking if partner is registered")
            db.all(`SELECT userID FROM messages WHERE userID = ?`, [parsedData.toID], (err, rows) => {
                // console.log(rows)
                if (err) {
                    console.error(err.message);
                    return;
                }
                // notify user
                if (rows.length > 0) {
                    console.log("partner added, is in db:", rows[0])
                    const messageForClient = {"instruction": "partnerAddedIsInDb"};
                    ws.send(JSON.stringify(messageForClient));
                } else {
                    console.log("partner added, is not in db")
                    const messageForClient = {"instruction": "partnerAddedIsNotInDb"};
                    ws.send(JSON.stringify(messageForClient));
                }

            })
        }
    })
}

// Check for message when user's extension is closed
function checkNewMessageExtClosed(toID, ws) {
     console.log("looking for new messages from ", toID)
     db.all(`SELECT message FROM messages WHERE userID = ?`, [toID], (err, rows) => {
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
    db.all(`SELECT toID FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
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
                console.log("partner results for user:", row )
            })
            if (rows[0].toID === null || rows[0].toID === undefined) {
                promptUserToChoosePartner(ws)
                return
            } else {
                console.log("user has registered partner: ", rows[0].toID)
                const toID = rows[0].toID
                //check if partner is in db yet
                db.all(`SELECT toID FROM messages WHERE userID = ?`, toID, (err, rows) => {
                    if (err) {
                        console.error(err.message);
                        return;
                    }
                    if (rows.length < 1) {
                        promptUserToChoosePartner(ws)
                            return
                    }
                    if (rows.length > 0) {
                        console.log("partner,", rows[0], "found in db")
                        // notify user
                        const messageForClient = {"instruction": "partnerIsInDb"};
                        ws.send(JSON.stringify(messageForClient));
                        // get message
                        const partner = rows[0]
                        getMessage(parsedData, partner, ws)
                    }
                })
            }
        }
    })
}
      
// Get Message
function getMessage(parsedData, partner, ws) {
    console.log("looking for new messages for", parsedData.userID, "from ", partner)
    let msg = " ";
    db.all(`SELECT message FROM messages WHERE userID = ?`, partner, (err, rows) => {
        // console.log(rows)
        if (err) {
            console.error(err.message);
            return;
        }
        if (rows.length > 0) {
            if (rows[0] != undefined && rows[0] != null) {
                msg = rows[0];
            }
        }
        const messageForClient = {"instruction": "newMessageForUser", "message": msg, "sender": partner}
        ws.send(JSON.stringify(messageForClient))
    })
}

// Send or update message for partner
function updateMessageToSend(parsedData, ws) {
    console.log("parseddata:",parsedData)
    // console.log("add or update message to send .. new message:", parsedData.message)
    const unixTime = Date.now(); // Get current time in milliseconds
    // Check if recipient is online
    db.all(`SELECT toID, message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        let toID = ""
        if (err) {
            console.error(err.message);
            return;
        }
        if (rows.length === 0) {
            console.log("3partner not found in db error")
            promptUserToChoosePartner(ws)
            return
        }
        if (rows.length > 0) {
            rows.forEach((row) => {
                // console.log("262row: ", row)
                if (row.toID === null || row.toID === undefined) {
                    console.log("error - no user partener found")
                } else {
                    // console.log("recipient is: ", row.toID)
                    // console.log("currently connnected clients:", currentlyConnectedClients)
                    let partnerIsOnline = currentlyConnectedClients.find(client => client.id === row.toID);
                    if (partnerIsOnline) {
                        console.log("online partner", partnerIsOnline)
                        console.log("new msg:", parsedData.message, "for recipient", row.toID, "who is online, from user:", parsedData.userID)
                        const messageForClient = {"instruction":"messageForOnlineUser", "data": parsedData.message, "sender": parsedData.userID}
                        partnerIsOnline.ws.send(JSON.stringify(messageForClient))
                        return
                    }
                }
            })
        }
    })

    // Check for existing message for the user
    db.all(`SELECT message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // updating message to partner
        // console.log("rows length:", rows.length)
        if (rows.length > 0) {
            rows.forEach((row) => {
                // console.log("existing message=", row.message);
                const unixTime = Date.now();
                // console.log("Adding new message to DB.");

                // console.log(parsedData.userID, parsedData.message, unixTime)
                db.run(`UPDATE messages SET message = ?, unixTime = ? WHERE userID = ?`, [parsedData.message, unixTime, parsedData.userID], function(err) {
                    if (err) {
                        return console.error(err.message);
                    }
                // console.log(`Row(s) updated: ${this.changes}`);
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
    db.all(`SELECT message FROM messages WHERE userID = ?`, [parsedData.sender], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // updating message to partner
        // console.log("rows length:", rows.length, " sender: ", parsedData.sender)
        if (rows.length > 0) {
            rows.forEach((row) => {
                const blankMessage = " ";
                // console.log("existing message=", row.message);
                if (row.message != null && row.message != "null" && row.message != " ") {
                    const unixTime = Date.now();
                    // console.log("Deleting message in DB.");
                    db.run(`UPDATE messages SET message = ?, unixTime = ? WHERE userID = ?`, [blankMessage, unixTime, parsedData.sender], function(err) {
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
