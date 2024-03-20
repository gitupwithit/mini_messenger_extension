
// mini messenger server
// user = user
// partner = user's partner

const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const wss = new WebSocket.Server({ port: 8000 });

console.log("server running")

const clients = [];

let db = new sqlite3.Database('./mydb.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the mydb.sqlite database.');
  });

wss.on('connection', function connection(ws) {
    clients.push(ws)
    // console.log("ws", ws._events)
    ws.on('message', function incoming(message) {
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
            updateMessageToSend(parsedData, ws) 
            return
        }
        // check if user exists
        if (parsedData.userID == null) {
            console.log("userID is null")
            return;
        }
        console.log("looking for user: ", parsedData.userID)
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
                ws.send("userAdded");
            }
        })
    });
    // Handle close
    ws.on('close', () => {
        // Remove the connection from our list of clients when it closes
        console.log("closed")
        const index = clients.indexOf(ws);
        if (index > -1) {
            clients.splice(index, 1);
        }
    });
})

// Check for partner
function checkForPartner(parsedData, ws) {
    // check if user has a partner
    console.log(parsedData)
    console.log(`check if ${parsedData.userID} has a chosen partner`)
    db.all(`SELECT toID, message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        let toID = ""
        if (err) {
            console.error(err.message);
            return;
        }
        console.log(rows)
        if (rows.length === 0) {
            console.log("user not found in db error")
            return
        }
        if (rows.length > 0) {
            rows.forEach((row) => {
                if (row.toID === null || row.toID === undefined) {
                    console.log("partner not found error")
                    return
                }
                const messageForUser = {"instruction": "welcomeBack", "message": {"toID": row.toID}}
                const jsonString = JSON.stringify(messageForUser)
                console.log("message for user", jsonString)
                ws.send(jsonString)
                toID = row.toID
            })
            getNewMessage(toID, ws)
        }
    })
}

// Get Messages
function getNewMessage(toID, ws) {
    console.log("looking for new messages from ", toID)
    let msg = " ";
    db.all(`SELECT toID, message FROM messages WHERE userID = ?`, [toID], (err, rows) => {
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