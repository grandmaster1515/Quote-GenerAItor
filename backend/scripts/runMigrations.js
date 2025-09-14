const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/create_chat_sessions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Chat sessions table migration completed successfully');

    // Verify the table was created
    const verifyQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'chat_sessions'
      );
    `;

    const result = await pool.query(verifyQuery);

    if (result.rows[0].exists) {
      console.log('✅ chat_sessions table verified');
    } else {
      console.error('❌ chat_sessions table not found after migration');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error:', error);
    }
  } finally {
    // Don't close the pool here as it might be used elsewhere
    console.log('🏁 Migration script completed');
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };