const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'marketplace.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        walletAddress TEXT,
        avatar TEXT,
        totalEarnings REAL DEFAULT 0,
        totalPurchased REAL DEFAULT 0,
        rating REAL DEFAULT 0,
        reviewCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Datasets table (off-chain metadata)
    db.run(`
      CREATE TABLE IF NOT EXISTS datasets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blockchainId INTEGER,
        sellerId INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price REAL NOT NULL,
        fileSize TEXT,
        format TEXT,
        recordCount INTEGER,
        ipfsHash TEXT,
        purchaseCount INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        reviewCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sellerId) REFERENCES users(id)
      )
    `);

    // Purchases table
    db.run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blockchainPurchaseId INTEGER,
        datasetId INTEGER NOT NULL,
        buyerId INTEGER NOT NULL,
        sellerId INTEGER NOT NULL,
        amount REAL NOT NULL,
        platformFee REAL,
        sellerEarnings REAL,
        status TEXT DEFAULT 'completed',
        downloadUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (datasetId) REFERENCES datasets(id),
        FOREIGN KEY (buyerId) REFERENCES users(id),
        FOREIGN KEY (sellerId) REFERENCES users(id)
      )
    `);

    // Transactions table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        relatedId INTEGER,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        datasetId INTEGER,
        userId INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (datasetId) REFERENCES datasets(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT,
        message TEXT,
        relatedId INTEGER,
        isRead INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { run, get, all, close };
