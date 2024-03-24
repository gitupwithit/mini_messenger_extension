
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

wss.on('connection', function connection(ws) {
    console.log("socket open")
    // console.log("ws", ws._events)
    ws.on('message', function incoming(message) {
        currentlyConnectedClients.forEach((client) => {
            console.log("client online at socket open: ", client.id)
        })
        // console.log("all clients at open: ", currentlyConnectedClients)
        // console.log('received: %s', message);
        const parsedData = JSON.parse(message)
        console.log('received:', parsedData);
        if (parsedData === undefined) {
            console.log("socket message is undefined")
            return
        }
        if (parsedData.instruction === "deleteMessage") {
            console.log("should delete last message from partner: ", parsedData.sender)
            const sender = parsedData.sender
            deleteMessage(sender)
            return
        }
        if (parsedData.userID && parsedData.message) {
            console.log("message received:", parsedData.message)
            if (parsedData.message === "is connecting to server") {
                return
            }
            // send message
            console.log(parsedData.userID, " is sending this message; ", parsedData.message)
            console.log("toID: ", parsedData.toID)
            updateMessageToSend(parsedData, ws) 
            return
        }
        if (parsedData.userID == null) {
            console.log("userID is null")
            return;
        }
        // check if user exists
        console.log("user: ", parsedData.userID, " has just signed in.")
        currentlyConnectedClients.push({ id: parsedData.userID, ws: ws })
        const sql_check = `SELECT * FROM messages WHERE userID = ?`;
        db.all(sql_check, [parsedData.userID], (err, rows) => {
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
                const sql = `INSERT INTO messages (userID, toID, message, unixTime) VALUES (?, ?, ?, ?)`;
                const values = [parsedData.userID, null, null, null];
                db.run(sql, values, function(err) {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log(`A row has been inserted with rowid ${this.lastID}`);
                });
                // user added, prompt to choose partner
                ws.send(JSON.stringify(messageForUser))
            }
        })
    });
    // Handle close
    ws.on('close', () => {
        // Remove the connection from our list of clients when it closes
        console.log("socket closed")
        const index = currentlyConnectedClients.indexOf(ws);
        if (index > -1) {
            currentlyConnectedClients.splice(index, 1);
        }
        currentlyConnectedClients.forEach((client) => {
            console.log("client online at socket close: ", client.id)
        })
    });
})

// Check for partner
function checkForPartner(parsedData, ws) {
    // check if user has a partner
    console.log("parsed Data2:", parsedData)
    console.log(`check if ${parsedData.userID} has a chosen partner`) 
    db.all(`SELECT toID, message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        let toID = ""
        if (err) {
            console.error(err.message);
            return;
        }
        if (rows.length === 0) {
            console.log("user not found in db error")
            return
        }
        if (rows.length > 0) {
            rows.forEach((row) => {
                console.log("row: ", row)
                if (row.toID === null || row.toID === undefined) {
                    console.log("no partner for user found")
                    console.log("parsedData.toID", parsedData.toID)
                    if (parsedData.toID) {
                        // user has submitted a partner
                        const sql = `UPDATE messages SET toID = ? WHERE userID = ?`;
                        const values = [parsedData.toID, parsedData.userID];
                        db.run(sql, values, function(err) { 
                            if (err) {
                                return console.error(err.message);
                            }
                            console.log(`121 A row has been inserted with rowid ${this.lastID}`);
                            const dataObject = {"instruction": "partnerAdded", "message": parsedData.toID};
                            ws.send(JSON.stringify(dataObject));
                            })
                        if (row.message != null) {
                            db.all(`SELECT toID, message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
                                if (err) {
                                    console.error(err.message);
                                    return;
                                }
                                if (rows.length === 0) {
                                    console.log("patner not found in db error")
                                    return
                                }
                                if (rows.length > 0) {
                                    console.log("row toID:", row.toID)
                                    const toID = row.toID;
                                    getMessage(toID, ws);
                                    return
                                    }
                                })
                            }
                        }
                    } else {
                        // look for message in partner's db
                        let toID = " ";
                        db.all(`SELECT toID, message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
                            if (err) {
                                console.error(err.message);
                                return;
                            }
                            if (rows.length === 0) {
                                console.log("user not found in db error")
                                return
                            }
                            if (rows.length > 0) {
                                console.log("156row toID:", row.toID)
                                const toID = row.toID;
                                getMessage(toID, ws);
                                return
                                }
                            })
                        }
                })
            }
            // user already in db, no registered partner
            const messageForUser = {"instruction": "choosePartner"}
            ws.send(JSON.stringify(messageForUser))
        })
    }


// Get Message
function getMessage(toID, ws) {
    console.log("looking for new messages from ", toID)
    let msg = " ";
    db.all(`SELECT message FROM messages WHERE userID = ?`, [toID], (err, rows) => {
        console.log(rows)
        if (err) {
            console.error(err.message);
            return;
        }
        rows.forEach((row) => {
            console.log("row: ", row)
            console.log("row message:", row.message)
            if (row.message === undefined) {
                msg = " ";
            } else {
                msg = row.message;
            }
            const messageForUser = {"instruction": "newMessageForUser", "message": msg, "sender": toID}
            const jsonString = JSON.stringify(messageForUser)
            console.log("new message for user:", jsonString)
            ws.send(jsonString)
        })
    })
}

// Send or update message for partner
function updateMessageToSend(parsedData, ws) {
    console.log("add or update message to send .. new message:", parsedData.message)
    const unixTime = Date.now(); // Get current time in milliseconds
    // Check if recipient is online
    db.all(`SELECT toID, message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        let toID = ""
        if (err) {
            console.error(err.message);
            return;
        }
        if (rows.length === 0) {
            console.log("user not found in db error")
            return
        }
        if (rows.length > 0) {
            rows.forEach((row) => {
                console.log("row: ", row)
                if (row.toID === null || row.toID === undefined) {
                    console.log("error - no user partener found")
                } else {
                    console.log("recipient is: ", row.toID)
                    console.log("index:",currentlyConnectedClients.indexOf(row.toID))
                    currentlyConnectedClients.forEach((client) => {
                        if (row.toID === client.id) {
                            console.log("recipient ", client.id, " is online")
                            const messageForUser = {"instruction":"messageForOnlineUser", "data": row.message}
                            client.ws.send(JSON.stringify(messageForUser))
                            return
                        }
                    })
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
        console.log("rows length:", rows.length)
        if (rows.length > 0) {
            rows.forEach((row) => {
                console.log("existing message=", row.message);
                const unixTime = Date.now();
                console.log("Adding new message to DB.");
                const sql = `UPDATE messages
                    SET message = ?, unixTime = ?
                    WHERE userID = ?`;
                console.log(parsedData.userID, parsedData.message, unixTime)
                db.run(sql, [parsedData.message, unixTime, parsedData.userID], function(err) {
                    if (err) {
                        return console.error(err.message);
                    }
                console.log(`Row(s) updated: ${this.changes}`);
                ws.send("messageSent");
                })
            })
        }
    })
}

// Delete last message
function deleteMessage(sender) {
    console.log("delete last message")
    db.all(`SELECT message FROM messages WHERE userID = ?`, [sender], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // updating message to partner
        console.log("rows length:", rows.length, " sender: ", sender)
        if (rows.length > 0) {
            rows.forEach((row) => {
                const blankMessage = " ";
                console.log("existing message=", row.message);
                if (row.message != null && row.message != "null" && row.message != " ") {
                    const unixTime = Date.now();
                    console.log("Deleting message in DB.");
                    const sql = `UPDATE messages
                        SET message = ?, unixTime = ?
                        WHERE userID = ?`;
                    db.run(sql, [blankMessage, unixTime, sender], function(err) {
                        if (err) {
                            return console.error(err.message);
                        }
                    console.log(`Row(s) updated: ${this.changes}`);
                    })
                } else {
                    console.log("message is blank no need to delete")
                }
            })
        } 
    })
}