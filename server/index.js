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
        if (message === undefined) {
            console.log("message from client is undefined")
        }
        const data = message; // Parse the JSON string back into an object
        console.log('received:', JSON.parse(data));
        const parsedData = JSON.parse(data)
        updateDb(parsedData, ws)  
        broadcastMessage()
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
            const sql = `INSERT INTO messages (userID, message, unixTime) VALUES (?, ?, ?)`;
            // Values to insert
            const values = [parsedData.userID, parsedData.message, unixTime];
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

// function logAllMessages() {
//     const sql = `SELECT * FROM messages`;
//     db.all(sql, [], (err, rows) => {
//       if (err) {
//         throw err;
//       }
//       rows.forEach((row) => {
//         console.log("db row: ", row); // Log each row
//         console.log(row.userID)
//       });
//     });
//   }

// logAllMessages();

// Assuming this is inside your WebSocket connection handler
// wss.on('connection', ws => {
//     ws.on('message', message => {
//         const data = JSON.parse(message); // Assuming message is a JSON string
//         const unixTime = Date.now(); // Get current time in milliseconds
        
//         // Prepare SQL query to insert data
//         const sql = `INSERT INTO messages (fromID, toID, message, unixTime) VALUES (?, ?, ?, ?)`;
        
//         // Values to insert
//         const values = [data.fromID, data.toID, data.message, unixTime];
        
//         // Execute the insert operation
//         db.run(sql, values, function(err) {
//             if (err) {
//                 return console.error(err.message);
//             }
//             console.log(`A row has been inserted with rowid ${this.lastID}`);
//         });
//     });
// });

// Optionally, close the database connection when the server is shutting down
// db.close((err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Closed the database connection.');
// });



// //Open a database connection
// let db = new sqlite3.Database('./mydb.sqlite3', (err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Connected to the mydb.sqlite database.');
// });

// // Create a table
// db.run(`CREATE TABLE IF NOT EXISTS messages (
//   fromID TEXT,
//   toID TEXT,
//   message TEXT,
//   unixTime INTEGER
// )`, (err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Table created.');
// });

// // Close the database connection
// db.close((err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Closed the database connection.');
// });
