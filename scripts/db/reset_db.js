const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'backend', 'db', 'marketplace.db'), (err) => {
  if (err) console.error('Error opening database:', err);
});

db.serialize(() => {
  console.log('🗑️  Resetting database...\n');
  
  // Clear datasets and purchases
  db.run('DELETE FROM purchases', (err) => {
    if (err) console.error('Error deleting purchases:', err);
    else console.log('✅ Cleared purchases table');
  });
  
  db.run('DELETE FROM datasets', (err) => {
    if (err) console.error('Error deleting datasets:', err);
    else console.log('✅ Cleared datasets table');
  });
  
  db.run('DELETE FROM notifications', (err) => {
    if (err) console.error('Error deleting notifications:', err);
    else console.log('✅ Cleared notifications table');
  });
  
  // Keep users table intact  but list them
  db.all('SELECT id, username, email, walletAddress FROM users', (err, rows) => {
    if (err) console.error('Error listing users:', err);
    else {
      console.log('\n✅ Existing users:');
      rows.forEach(row => {
        console.log(`   ID ${row.id}: ${row.username} (${row.email}) - ${row.walletAddress}`);
      });
    }
  });
  
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('\n✅ Database reset complete');
  });
});
