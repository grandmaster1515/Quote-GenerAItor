const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runServicesMigration() {
  try {
    console.log('🔄 Running services required_info migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add_required_info_to_services.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Services migration completed successfully');

    // Verify the migration
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'services'
        AND column_name = 'required_info';
    `;

    const result = await pool.query(verifyQuery);

    if (result.rows.length > 0) {
      console.log('✅ required_info column verified:', result.rows[0]);
    } else {
      console.error('❌ required_info column not found after migration');
      return false;
    }

    // Check if sample data exists and was updated
    const sampleDataQuery = `
      SELECT name, required_info
      FROM services
      WHERE business_id = '550e8400-e29b-41d4-a716-446655440000'
        AND name IN ('HVAC Services', 'Plumbing Services', 'Kitchen Remodeling')
        AND required_info != '[]'::jsonb;
    `;

    const sampleResult = await pool.query(sampleDataQuery);

    if (sampleResult.rows.length > 0) {
      console.log('✅ Sample data updated successfully:');
      sampleResult.rows.forEach(row => {
        console.log(`   - ${row.name}: ${row.required_info.length} requirements`);
      });
    } else {
      console.log('ℹ️  No sample data to update (services may not exist yet)');
    }

    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error:', error);
    }
    return false;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runServicesMigration()
    .then((success) => {
      if (success) {
        console.log('🎉 Services migration script completed successfully');
        process.exit(0);
      } else {
        console.error('💥 Migration script failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Migration script error:', error);
      process.exit(1);
    });
}

module.exports = { runServicesMigration };