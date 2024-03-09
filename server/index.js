const sqlite3 = require('sqlite3').verbose();
const { getMaxListeners } = require('events');
const { OutgoingMessage } = require('http');
const { parse } = require('path');
const WebSocket = require('ws');
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
        console.log('received:', JSON.parse(message));
        const parsedData = JSON.parse(message)
        if (JSON.parse(message).userID == null) {
            // console.log("userID is null")
            return;
        }
        if (message === undefined) {
            console.log("message from client is undefined")
            return;
        }
        // for new users
        if ((JSON.parse(message).userID) && JSON.parse(message).message === undefined && JSON.parse(message).toID === undefined) {
            console.log("check userID")
            checkUserID(parsedData, ws)
            return;
        }
        // when user is adding or updating their chosen partner
        if (parsedData.toID + "@gmail.com" || JSON.parse(message).message === undefined) { 
            console.log("toId:", parsedData.toID)
            checkPartner(parsedData, ws);
            return;
        }
        // send message
        updateMessage(parsedData, ws)  
        // broadcastMessage()
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

function checkUserID(parsedData, ws) {
    console.log("Now checking this user:", parsedData.userID)
    const sql_check = `SELECT * FROM messages WHERE userID = ?`;
    db.all(sql_check, [parsedData.userID], (err, rows) => {
        if (err) {
            throw err;
        }
        if (rows.length > 0) {
            // User already exists
            console.log("Duplicate userID, not adding to DB.");
            ws.send("userNotAdded");
        } else {
            // add user to db
            console.log("Adding new user to db.");
            // Prepare SQL query to insert data
            const sql = `INSERT INTO messages (userID, toID, message, unixTime) VALUES (?, ?, ?, ?)`;
            // Values to insert
            const values = [parsedData.userID, null, null, null];
            // Execute the insert operation
            db.run(sql, values, function(err) {
                if (err) {
                    return console.error(err.message);
                }
                console.log(`A row has been inserted with rowid ${this.lastID}`);
            });
            ws.send("userAdded");
        }
    })
}

/* checks if chosen partner is using the extension, 
then checks if the partner is registered as user's partner */
function checkPartner(parsedData, ws) {
    let foundPartner;
    console.log(`check if ${parsedData.toID} is using the extension`)
    db.all(`SELECT toID FROM messages WHERE userID = ?`, parsedData.toID + '@gmail.com', (err, rows) => {
        // console.log("row length:", rows.length)
        if (err) {
            console.error(err.message);
            return;
        }
        if (rows.length > 0) {
            console.log(`${parsedData.toID} is using the extension`);
            console.log("row is like: ", rows)
            ws.send("partnerIsInDb");
            
        } else {
            console.log("partner us not in db")
            ws.send("partnerIsNotInDb");
        }
    })
    console.log("checking requested partner's registered partner")

    const sql = `SELECT * FROM messages`;

    db.all(sql, [], (err, rows) => {
        if (err) {
        throw err;
        }
        rows.forEach((row) => {
        // console.log("db row: ", row); // Log each row
        // console.log(row.userID)
            console.log("row toID:", row.toID, " row.userid:", row.userID, " parseduserID:", parsedData.userID, " parsedToID:", parsedData.toID)
            if (row.userID === parsedData.userID) {
                if (row.toID === parsedData.toID + "@gmail.com") {
                    console.log("partner match")
                } else {
                    console.log("partner mismatch, expected partner:", row.toID)
                }
            }
        });
    });

    console.log("Now checking this user:", parsedData.userID, "for this partner:", parsedData.toID + "@gmail.com");
    db.all(`SELECT toID FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        console.log("users registered partner is:", rows)
        if (err) {
            console.error(err.message);
            return;
        }
        // If there are rows returned, they will be in the `rows` array
        if (rows.length > 0) {
            console.log(`Found toID value for userID ${parsedData.userID}:`);
            let partnerFound = false;
            rows.forEach((row) => {
                console.log("row.toID=", row.toID)
                foundPartner = row.toID;
                if (row.toID === parsedData.toID + "@gmail.com") {
                    console.log(`Match found for partnerID ${parsedData.toID}@gmail.com`);
                    partnerFound = true;
                    updateMessage(parsedData, ws)  

                }
                if (row.toID == null) {
                    console.log(`Partner for ${parsedData.userID} is null, updating db`);
                    updatePartner(parsedData, ws)
                }
            });
            // for user mis-types partner
            if (!partnerFound) {
                console.log(`No match found for userID ${parsedData.userID} with partner ${parsedData.toID}, the stored partner is ${foundPartner}`);
            }
        } else {
            // redundant??
            console.log(`No partner found for userID ${parsedData.userID}, adding to ${parsedData.toID} db`);
            updatePartner(parsedData, ws)
        }
    });
}

function updatePartner(parsedData, ws) {
    const sql = `UPDATE messages
                 SET toID = ?
                 WHERE userID = ? AND (toID IS NULL OR toID = '')`;
    db.run(sql, [parsedData.toID + "@gmail.com", parsedData.userID], function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Row(s) updated: ${this.changes}`);
    });
}

function updateMessage(parsedData, ws) {
    console.log("hanlding new messages")
    const unixTime = Date.now(); // Get current time in milliseconds
    // Check for existing message for the user
    const sql_check = `SELECT * FROM messages WHERE userID = ?`;
    db.all(`SELECT message FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // updating message to partner
        console.log("ros length:", rows.length)

        if (rows.length > 0) {
            console.log(`Found message to send from userID ${parsedData.userID}:`);
            rows.forEach((row) => {
                console.log("message=", row.message);
                if (row.message === null || row.message === "null") {
                    const unixTime = Date.now();
                    console.log("Adding new message to DB.");
                    const sql = `UPDATE messages
                        SET message = ?
                        WHERE userID = ? AND (message IS NULL OR message = '' OR message = 'null')`;
                    db.run(sql, [parsedData.message, parsedData.userID, unixTime], function(err) {
                        if (err) {
                            return console.error(err.message);
                        }
                    console.log(`Row(s) updated: ${this.changes}`);
                    })
                    ws.send("messageSent");
                }
            
            })
        } 
        // check for new messages for user from partner
    })
    db.all(`SELECT message FROM messages WHERE userID = ?`, [parsedData.toID + "@gmail.com"], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // updating message to partner
        if (rows.length > 0) {
            console.log("found message for user: ")
            rows.forEach((row) => {
                console.log("message=", row);
            })
        }
    })



        // } else {
        //     console.log("no messages for user")
        // }
}

// // broadcast test message to all users
// function broadcastMessage() {
//     let message = "test message"
//     clients.forEach(client => {
//         console.log("client readystate:", client.readyState)
//         if (client.readyState === WebSocket.OPEN) {
//             client.send(message);
//         }
//     });
// }

