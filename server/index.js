const sqlite3 = require('sqlite3').verbose();
const { OutgoingMessage } = require('http');
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
    console.log("ws", ws._events)
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        console.log('received:', JSON.parse(message));
        if (JSON.parse(message).userID == null) {
            console.log("userID is null")
        } else {
            if (message === undefined) {
                console.log("message from client is undefined")
            } else {
                const data = message; // Parse the JSON string back into an object
                // console.log('received:', JSON.parse(data));
                const parsedData = JSON.parse(data)
                if (parsedData.toID) { // when user is adding or updating their chosen partner
                    checkPartner(parsedData, ws);
                } else { // when user is sending message to chosen partner
                    updateDb(parsedData, ws)  
                    broadcastMessage()
                }
            }
        }
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

/* 

check db for given userID's toID value, if it is a match continue, 
otherwise send message to user that they need to reinstall the extension
to change their toID value

*/

function checkPartner(parsedData, ws) {
    let foundPartner;
    console.log("Now checking this partner:", parsedData.userID, "user's registered partner:", parsedData.toID);
    
    db.all(`SELECT toID FROM messages WHERE userID = ?`, [parsedData.userID], (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        // If there are rows returned, they will be in the `rows` array
        if (rows.length > 0) {
            console.log(`Found toID values for userID ${parsedData.userID}:`);
            let partnerFound = false;
            rows.forEach((row) => {
                if (row.toID === parsedData.toID) {
                    console.log(`Match found for partnerID ${parsedData.toID}`);
                    partnerFound = true;
                }
                foundPartner = row.toID
            });
            if (!partnerFound) {
                console.log(`No match found for userID ${parsedData.userID} with partner ${parsedData.toID}, the stored partner is ${foundPartner}`);
            }
        } else {
            console.log(`No records found for userID ${parsedData.userID}, adding to ${parsedData.toID} db`);
            updatePartner(parsedData, ws)
        }
    });
}

function updatePartner(parsedData, ws) {
    let unixTime = null
    console.log("Adding new partner for user to db.");
    // Prepare SQL query to insert data
    const sql = `INSERT INTO messages (userID, toID, message, unixTime) VALUES (?, ?, ?, ?)`;
    // Values to insert
    const values = [parsedData.userID, parsedData.toID + "@gmail.com", parsedData.message, unixTime];
    // Execute the insert operation
    db.run(sql, values, function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
}

function updateDb(parsedData, ws) {
    const unixTime = Date.now(); // Get current time in milliseconds
    // Check for existing message for the user
    const sql_check = `SELECT * FROM messages WHERE userID = ?`;
    db.all(sql_check, [parsedData.userID], (err, rows) => {
        if (err) {
            throw err;
        }
        if (rows.length > 0) {
            // User already has a message, don't add
            console.log("Duplicate message, not adding to DB.");
            ws.send("messageRejection");
        } else {
            // No existing message for this user, proceed to add
            console.log("Adding new message to DB.");
            // Prepare SQL query to insert data
            const sql = `INSERT INTO messages (userID, toID, message, unixTime) VALUES (?, ?, ?, ?)`;
            // Values to insert
            const values = [parsedData.userID, parsedData.toID, parsedData.message, unixTime];
            // Execute the insert operation
            db.run(sql, values, function(err) {
                if (err) {
                    return console.error(err.message);
                }
                console.log(`A row has been inserted with rowid ${this.lastID}`);
            });
        }
    });
}

function broadcastMessage() {
    let message = "test message"
    clients.forEach(client => {
        console.log("client readystate:", client.readyState)
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

