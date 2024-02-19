// to log all sqlite messages:

const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./mydb.sqlite3', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the mydb.sqlite database.');
});


function logAllMessages() {
  db.all(`PRAGMA table_info(messages)`, [], (err, rows) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log("Schema for 'messages' table:");
    rows.forEach((row) => {
        console.log(`${row.name} ${row.type}`);
    });
  });


  console.log("logging all messages")
  const sql = `SELECT * FROM messages`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach((row) => {
      console.log("db row: ", row); // Log each row
      console.log(row.userID)
    });
  });
}

logAllMessages();