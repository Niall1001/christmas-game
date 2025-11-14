// Database initialization script
// Run this manually to set up the database: node init-db.js

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initializeDatabase() {
  console.log('🗄️  Initializing Office Survivor Database...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set it in your .env file or environment variables.\n');
    console.error('Example:');
    console.error('DATABASE_URL=postgresql://username:password@host:5432/database\n');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!\n');

    // Read and execute schema
    console.log('📝 Creating database schema...');
    const schemaPath = join(__dirname, 'db-schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    await client.query(schema);
    console.log('✅ Database schema created successfully!\n');

    // Check if data exists
    const result = await client.query('SELECT COUNT(*) as count FROM leaderboard');
    const count = parseInt(result.rows[0].count);

    console.log(`📊 Current leaderboard entries: ${count}\n`);

    if (count === 0) {
      console.log('💡 Database is empty. Add some test data? (y/n)');
      // For non-interactive environments, skip test data
      console.log('Skipping test data insertion.\n');
    }

    client.release();

    console.log('✅ Database initialization complete!');
    console.log('🎮 Your Office Survivor leaderboard is ready!\n');

  } catch (error) {
    console.error('❌ Database initialization failed:');
    console.error(error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
