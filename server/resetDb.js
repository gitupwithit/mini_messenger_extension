// to reset the sqlite db

const sqlite3 = require('sqlite3').verbose();

//Open a database connection
let db = new sqlite3.Database('./mydb.sqlite3', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the mydb.sqlite database.');
});

// Drop Table

db.run(`DROP TABLE IF EXISTS messages`);

// Create a table
db.run(`CREATE TABLE IF NOT EXISTS messages (
  userID TEXT,
  toID TEXT,
  message TEXT,
  unixTime INTEGER
)`, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Table created.');
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Closed the database connection.');
});
