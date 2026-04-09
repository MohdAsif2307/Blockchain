const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

async function insertUser() {
  const db = new sqlite3.Database('./db/marketplace.db');
  const hashedPassword = await bcrypt.hash('password', 10);
  
  db.run(`INSERT INTO users (username, email, password, walletAddress, rating) VALUES (?, ?, ?, ?, ?)`, 
    ['testuser', 'test@example.com', hashedPassword, '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 5.0], 
    function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('Test user inserted with password: password');
      }
      db.close();
    });
}

insertUser();