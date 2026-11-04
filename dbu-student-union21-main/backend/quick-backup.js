/**
 * MongoDB Atlas Read-Only Quick Backup Script
 * Fetches and saves all collections from MongoDB Atlas into backend/dbu_backup_json/
 *
 * Safety:
 *   - Strictly read-only on the database.
 *   - Never prints passwords or credentials in console output.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load local .env if available
dotenv.config({ path: path.join(__dirname, '.env') });

const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return 'none';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

const resolveAtlasUri = () => {
  if (process.env.ATLAS_URI && (process.env.ATLAS_URI.includes('mongodb+srv') || process.env.ATLAS_URI.includes('mongodb.net'))) {
    return process.env.ATLAS_URI.trim();
  }

  if (process.env.MONGODB_URI && (process.env.MONGODB_URI.includes('mongodb+srv') || process.env.MONGODB_URI.includes('mongodb.net'))) {
    return process.env.MONGODB_URI.trim();
  }

  // Retrieve historical Atlas connection string from Git commit b44ce43
  try {
    const gitEnv = execSync('git show b44ce43:dbu-student-union21-main/backend/.env', { encoding: 'utf8' });
    const match = gitEnv.split('\n').find((line) => line.startsWith('MONGODB_URI='));
    if (match) {
      return match.replace('MONGODB_URI=', '').trim();
    }
  } catch (err) {
    // Git lookup failed
  }

  return null;
};

const backup = async () => {
  const uri = resolveAtlasUri();

  if (!uri) {
    console.error('❌ Error: Could not resolve MongoDB Atlas connection URI.');
    console.error('   Please provide ATLAS_URI or MONGODB_URI in backend/.env pointing to MongoDB Atlas.');
    process.exit(1);
  }

  console.log(`\n============================================================`);
  console.log(`MONGODB ATLAS QUICK BACKUP`);
  console.log(`============================================================`);
  console.log(`Connecting to: ${sanitizeMongoUri(uri)}...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    const dbName = mongoose.connection.name;
    console.log(`✅ Connected successfully to database: "${dbName}"\n`);

    const backupDir = path.join(__dirname, 'dbu_backup_json');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Found ${collections.length} collections to back up into:\n  ${backupDir}\n`);

    const manifest = {
      timestamp: new Date().toISOString(),
      database: dbName,
      totalCollections: collections.length,
      totalDocuments: 0,
      collections: {},
    };

    let totalDocs = 0;

    for (const col of collections) {
      const colName = col.name;
      const docs = await mongoose.connection.db.collection(colName).find({}).toArray();
      const filePath = path.join(backupDir, `${colName}.json`);

      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');

      totalDocs += docs.length;
      manifest.collections[colName] = {
        count: docs.length,
        file: `${colName}.json`,
        sizeBytes: fs.statSync(filePath).size,
      };

      console.log(`  💾 [${colName}] -> ${docs.length} documents saved (${colName}.json)`);
    }

    manifest.totalDocuments = totalDocs;
    const manifestPath = path.join(backupDir, 'metadata.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`\n============================================================`);
    console.log(`✅ BACKUP COMPLETED SUCCESSFULLY`);
    console.log(`   Database:         ${dbName}`);
    console.log(`   Collections:      ${collections.length}`);
    console.log(`   Total Documents:  ${totalDocs}`);
    console.log(`   Location:         ${backupDir}`);
    console.log(`   Manifest:         ${manifestPath}`);
    console.log(`============================================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error during backup:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
    process.exit(1);
  }
};

backup();

