/**
 * repair-profiles.js
 * 
 * This script:
 * 1. Copies static frontend images into the backend uploads/leadership/ folder
 * 2. Updates staff profiles in MongoDB with new imageUrl (now served by backend)
 * 3. Stores the base64 backup so self-healing works on any new machine
 * 4. Removes test/placeholder profiles
 * 
 * Run: node repair-profiles.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const Staff = require('./models/Staff');

// Root of the project
const backendDir = __dirname;
const projectDir = path.join(backendDir, '..', 'dbu-student-union21-main', 'project');
// Relative from this script which IS inside dbu-student-union21-main/backend
const publicImgDir = path.join(backendDir, '..', 'project', 'public', 'image.png');
const uploadsLeadershipDir = path.join(backendDir, 'uploads', 'leadership');

const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  return mimes[ext] || 'image/jpeg';
};

const copyAndEncode = (srcPath) => {
  try {
    if (!fs.existsSync(srcPath)) return null;
    const buf = fs.readFileSync(srcPath);
    return buf.toString('base64');
  } catch (e) {
    return null;
  }
};

// Profiles to fix: map name regex → source image in public/image.png/
// These are the seeded/uploaded profiles that use /image.png/ paths (served by frontend only)
const frontendImageFixes = [
  {
    namePattern: /gizew/i,
    srcFile: 'gizeww.jpg',
    destFile: 'staff-gizew-fetene.jpg',
  },
  {
    namePattern: /sintayehu|sintayew/i,
    srcFile: 'pr sintayew.jpg',
    destFile: 'staff-sintayehu-ambachew.jpg',
  },
  {
    namePattern: /kalkidan desta/i,
    srcFile: 'kalkidan.jpg',
    destFile: 'staff-kalkidan-desta.jpg',
  },
  {
    namePattern: /asmare/i,
    srcFile: 'dr  asmare.png',
    destFile: 'staff-asmare-malese.png',
  },
];

// Profile names that are clearly test/fake and should be removed
const fakeProfiles = ['rtgyert', 'little'];

const repair = async () => {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Connected to MongoDB\n');

  // Ensure leadership folder exists
  if (!fs.existsSync(uploadsLeadershipDir)) {
    fs.mkdirSync(uploadsLeadershipDir, { recursive: true });
  }

  // ── 1. Remove fake/test profiles ──────────────────────────────────────────
  console.log('🗑️  Removing test/fake profiles...');
  for (const fakeName of fakeProfiles) {
    const result = await Staff.deleteMany({ name: { $regex: new RegExp(`^${fakeName}$`, 'i') } });
    if (result.deletedCount > 0) {
      console.log(`  ✅ Deleted "${fakeName}" (${result.deletedCount} records)`);
    } else {
      console.log(`  ℹ️  "${fakeName}" not found (already deleted?)`);
    }
  }

  // ── 2. Fix profiles that use /image.png/ (frontend-only) paths ────────────
  console.log('\n🔧 Fixing profiles with /image.png/ paths...');
  for (const fix of frontendImageFixes) {
    const srcPath = path.join(publicImgDir, fix.srcFile);
    const destPath = path.join(uploadsLeadershipDir, fix.destFile);
    const newImageUrl = `/uploads/leadership/${fix.destFile}`;

    if (!fs.existsSync(srcPath)) {
      // Try in the root image.png dir relative to this script
      const altSrc = path.join(backendDir, '..', 'image.png', fix.srcFile);
      if (!fs.existsSync(altSrc)) {
        console.log(`  ⚠️  Source image not found: ${srcPath}`);
        continue;
      }
    }

    // Copy image to backend uploads
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  📋 Copied ${fix.srcFile} → uploads/leadership/${fix.destFile}`);
    } catch (e) {
      console.error(`  ❌ Failed to copy ${fix.srcFile}:`, e.message);
      continue;
    }

    // Encode as base64
    const fileData = copyAndEncode(destPath);
    if (!fileData) {
      console.error(`  ❌ Could not read file: ${destPath}`);
      continue;
    }

    // Find and update the matching profile(s)
    const profiles = await Staff.find({ name: { $regex: fix.namePattern } }).select('_id name imageUrl');
    for (const profile of profiles) {
      await Staff.findByIdAndUpdate(profile._id, {
        imageUrl: newImageUrl,
        fileData,
        fileName: fix.srcFile,
        fileMimeType: getMimeType(fix.destFile),
      });
      console.log(`  ✅ Updated "${profile.name}" → ${newImageUrl} (base64 stored)`);
    }
  }

  // ── 3. Handle placeholder and missing upload profiles ─────────────────────
  console.log('\n🔧 Fixing profiles with missing /uploads/ files...');
  const allStaff = await Staff.find({ imageUrl: /^\/uploads\// }).select('+fileData name imageUrl');
  
  for (const profile of allStaff) {
    if (profile.fileData) {
      console.log(`  ✅ "${profile.name}" — already has base64 backup, skipping`);
      continue;
    }
    
    const relPath = profile.imageUrl.replace('/uploads/', '');
    const candidates = [
      path.join(backendDir, 'uploads', relPath),
      path.join(backendDir, 'uploads', 'leadership', path.basename(relPath)),
    ];
    
    let found = false;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const fileData = copyAndEncode(candidate);
        if (fileData) {
          await Staff.findByIdAndUpdate(profile._id, {
            fileData,
            fileName: path.basename(candidate),
            fileMimeType: getMimeType(candidate),
          });
          console.log(`  ✅ "${profile.name}" — backed up from disk`);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      // Fall back to a UI avatar as the imageUrl (so profile cards don't show broken images)
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=1E3A8A&color=fff&size=400`;
      await Staff.findByIdAndUpdate(profile._id, { imageUrl: fallbackUrl });
      console.log(`  🔄 "${profile.name}" — image file lost, set to UI avatar fallback`);
    }
  }

  // ── 4. Summary ─────────────────────────────────────────────────────────────
  console.log('\n📊 Final database summary:');
  const finalProfiles = await Staff.find({}).select('+fileData name imageUrl isActive').lean();
  for (const p of finalProfiles) {
    const status = p.fileData ? '✅ HAS_BASE64' : (p.imageUrl.startsWith('http') ? '🌐 EXTERNAL_URL' : '⚠️  NO_BACKUP');
    console.log(`  ${status} | ${p.isActive ? '👁' : '🚫'} | ${p.name} | ${p.imageUrl.substring(0, 60)}`);
  }

  console.log('\n✅ Repair complete!');
  await mongoose.connection.close();
  process.exit(0);
};

repair().catch(err => {
  console.error('❌ Repair error:', err);
  process.exit(1);
});
