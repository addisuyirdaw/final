/**
 * Migration Runner
 * Handles sequential, idempotent, versioned database migrations.
 * Prevents re-running migrations that have already been recorded in the database.
 */
const mongoose = require('mongoose');
const Migration = require('../models/Migration');

// Registered migrations in chronological execution order
const REGISTERED_MIGRATIONS = [
  require('../migrations/001_initial_system_setup'),
  require('../migrations/002_seed_initial_core_clubs'),
  require('../migrations/003_seed_budget_ledger'),
];

/**
 * Executes all unapplied migrations in chronological order.
 * @param {Object} options
 * @param {boolean} options.silent - If true, suppresses non-error logs.
 * @returns {Promise<Array>} List of applied migration names.
 */
const runMigrations = async ({ silent = false } = {}) => {
  const log = (...args) => {
    if (!silent) console.log(...args);
  };

  log('📦 Checking database migrations...');

  // Ensure Migration collection has indexes ready
  await Migration.init();

  // Find all previously applied migrations
  const appliedRecords = await Migration.find({ status: 'applied' }).select('name appliedAt batch').lean();
  const appliedSet = new Set(appliedRecords.map((m) => m.name));

  // Determine current batch number
  const latestBatch = appliedRecords.reduce((max, m) => Math.max(max, m.batch || 0), 0);
  const currentBatch = latestBatch + 1;

  const newlyApplied = [];

  for (const migration of REGISTERED_MIGRATIONS) {
    if (appliedSet.has(migration.name)) {
      log(`⏭️ Migration already applied: ${migration.name}`);
      continue;
    }

    log(`🚀 Applying migration: ${migration.name} (${migration.description || 'No description'})...`);

    try {
      const details = await migration.up();
      await Migration.create({
        name: migration.name,
        batch: currentBatch,
        status: 'applied',
        appliedAt: new Date(),
        details: details || {},
      });

      newlyApplied.push(migration.name);
      log(`✅ Migration applied successfully: ${migration.name}`);
    } catch (err) {
      console.error(`❌ Migration failed: ${migration.name} -`, err.message);
      // Record failure for auditability
      await Migration.findOneAndUpdate(
        { name: migration.name },
        {
          name: migration.name,
          batch: currentBatch,
          status: 'failed',
          details: { error: err.message, stack: err.stack },
        },
        { upsert: true }
      );
      throw err;
    }
  }

  if (newlyApplied.length === 0) {
    log('✨ Database migrations are up to date. No pending migrations.');
  } else {
    log(`🎉 Successfully applied ${newlyApplied.length} pending migration(s).`);
  }

  return newlyApplied;
};

/**
 * Returns the status of all registered migrations.
 */
const getMigrationStatus = async () => {
  const appliedRecords = await Migration.find().sort({ batch: 1, appliedAt: 1 }).lean();
  const appliedMap = new Map(appliedRecords.map((m) => [m.name, m]));

  return REGISTERED_MIGRATIONS.map((m) => {
    const record = appliedMap.get(m.name);
    return {
      name: m.name,
      description: m.description,
      applied: !!record && record.status === 'applied',
      appliedAt: record ? record.appliedAt : null,
      batch: record ? record.batch : null,
      status: record ? record.status : 'pending',
    };
  });
};

module.exports = {
  runMigrations,
  getMigrationStatus,
  REGISTERED_MIGRATIONS,
};

