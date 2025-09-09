const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Database configuration
const dbConfig = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: process.env.PGPORT || process.env.DB_PORT || 5432,
  database: process.env.PGDATABASE || process.env.DB_NAME || 'quote_generator',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('📅 Database time:', result.rows[0].current_time);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Execute SQL file
async function executeSQLFile(filePath) {
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const client = await pool.connect();
    
    try {
      await client.query(sqlContent);
      console.log(`✅ Executed SQL file: ${path.basename(filePath)}`);
      return true;
    } catch (error) {
      console.error(`❌ Error executing ${path.basename(filePath)}:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Failed to read SQL file ${filePath}:`, error.message);
    throw error;
  }
}

// Initialize database (create tables and sample data)
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Check if database is already initialized
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'businesses'
        );
      `);
      
      if (result.rows[0].exists) {
        console.log('📊 Database already initialized');
        return true;
      }
    } finally {
      client.release();
    }
    
    // Execute schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    await executeSQLFile(schemaPath);
    
    // Execute sample data file
    const sampleDataPath = path.join(__dirname, '../../database/sample_data.sql');
    await executeSQLFile(sampleDataPath);
    
    console.log('✅ Database initialized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// Query helper function
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Query error:', error.message);
    throw error;
  }
}

// Get client from pool (for transactions)
async function getClient() {
  return await pool.connect();
}

// Close all connections
async function closePool() {
  await pool.end();
  console.log('📴 Database pool closed');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  initializeDatabase,
  executeSQLFile,
  closePool
};
