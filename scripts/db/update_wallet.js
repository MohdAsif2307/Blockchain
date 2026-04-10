const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'backend', 'db', 'marketplace.db'), (err) => {
  if (err) console.error(err);
});

const UPDATE_SQL = `UPDATE users SET walletAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' WHERE id = 3`;

db.run(UPDATE_SQL, function (err) {
  if (err) {
    console.error('❌ Update failed:', err.message);
  } else {
    console.log('✅ Updated user 3 wallet address to: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    console.log('   Changes made:', this.changes);
    
    // Verify
    db.get('SELECT id, email, walletAddress FROM users WHERE id = 3', (err, row) => {
      if (err) console.error(err);
      else {
        console.log('\n✅ Verification:');
        console.log('   User ID:', row.id);
        console.log('   Email:', row.email);
        console.log('   Wallet:', row.walletAddress);
      }
      db.close();
    });
  }
});
