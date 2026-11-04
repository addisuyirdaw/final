#!/usr/bin/env node
/**
 * Database Migration CLI
 * Usage: node scripts/migrate.js [--status]
 */
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const { runMigrations, getMigrationStatus } = require('../utils/migrationRunner');

const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return 'none';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

const main = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_union_db';
  const showStatusOnly = process.argv.includes('--status');

  console.log(`🔌 Connecting to MongoDB: ${sanitizeMongoUri(uri)}...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB.');

    if (showStatusOnly) {
      const status = await getMigrationStatus();
      console.log('\n--- Migration Registry Status ---');
      console.table(status);
      await mongoose.disconnect();
      process.exit(0);
    }

    await runMigrations({ silent: false });
    await mongoose.disconnect();
    console.log('🏁 Migration process completed cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration process encountered a fatal error:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
    process.exit(1);
  }
};

main();

