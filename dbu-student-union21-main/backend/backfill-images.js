/**
 * backfill-images.js
 * 
 * One-time script to backfill base64 image data into MongoDB for all existing
 * uploaded images (Staff profiles, Carousel slides, User avatars).
 * 
 * Run with:  node backfill-images.js
 * 
 * This ensures the self-healing system can restore any missing images even for
 * profiles that were uploaded BEFORE the fileData field was added.
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const Staff = require('./models/Staff');
const Carousel = require('./models/Carousel');
const User = require('./models/User');

const uploadsDir = path.join(__dirname, 'uploads');

const readFileBase64 = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      return buf.toString('base64');
    }
  } catch (e) {
    // ignore
  }
  return null;
};

const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimes[ext] || 'image/jpeg';
};

const backfill = async () => {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Connected to MongoDB');

  // ── 1. Staff profiles ──────────────────────────────────────────────────────
  console.log('\n📋 Backfilling Staff profiles...');
  const staffWithUploads = await Staff.find({
    imageUrl: /^\/uploads\//,
    $or: [{ fileData: { $exists: false } }, { fileData: null }, { fileData: '' }]
  }).select('+fileData');

  let staffFixed = 0;
  for (const profile of staffWithUploads) {
    const relPath = profile.imageUrl.replace('/uploads/', '');
    // Try both locations: root uploads/ and leadership/ subfolder
    const candidates = [
      path.join(uploadsDir, relPath),
      path.join(uploadsDir, 'leadership', path.basename(relPath)),
    ];

    let fileData = null;
    let resolvedPath = null;
    for (const candidate of candidates) {
      const data = readFileBase64(candidate);
      if (data) { fileData = data; resolvedPath = candidate; break; }
    }

    if (fileData) {
      await Staff.findByIdAndUpdate(profile._id, {
        fileData,
        fileName: path.basename(resolvedPath),
        fileMimeType: getMimeType(resolvedPath),
      });
      console.log(`  ✅ Staff "${profile.name}" — backed up from ${resolvedPath}`);
      staffFixed++;
    } else {
      console.log(`  ⚠️  Staff "${profile.name}" — file NOT found on disk (imageUrl: ${profile.imageUrl})`);
    }
  }
  console.log(`  Staff: ${staffFixed}/${staffWithUploads.length} profiles backfilled`);

  // ── 2. Carousel slides ─────────────────────────────────────────────────────
  console.log('\n🎠 Backfilling Carousel slides...');
  const slidesWithUploads = await Carousel.find({
    imageUrl: /^\/uploads\//,
    $or: [{ fileData: { $exists: false } }, { fileData: null }, { fileData: '' }]
  }).select('+fileData');

  let slidesFixed = 0;
  for (const slide of slidesWithUploads) {
    const relPath = slide.imageUrl.replace('/uploads/', '');
    const candidates = [
      path.join(uploadsDir, relPath),
      path.join(uploadsDir, 'carousel', path.basename(relPath)),
    ];

    let fileData = null;
    let resolvedPath = null;
    for (const candidate of candidates) {
      const data = readFileBase64(candidate);
      if (data) { fileData = data; resolvedPath = candidate; break; }
    }

    if (fileData) {
      await Carousel.findByIdAndUpdate(slide._id, {
        fileData,
        fileName: path.basename(resolvedPath),
        fileMimeType: getMimeType(resolvedPath),
      });
      console.log(`  ✅ Slide ${slide._id} — backed up from ${resolvedPath}`);
      slidesFixed++;
    } else {
      console.log(`  ⚠️  Slide ${slide._id} — file NOT found on disk (imageUrl: ${slide.imageUrl})`);
    }
  }
  console.log(`  Carousel: ${slidesFixed}/${slidesWithUploads.length} slides backfilled`);

  // ── 3. User avatars ────────────────────────────────────────────────────────
  console.log('\n👤 Backfilling User avatars...');
  const usersWithUploads = await User.find({
    profileImage: /^\/uploads\//,
    $or: [{ profileImageData: { $exists: false } }, { profileImageData: null }, { profileImageData: '' }]
  }).select('+profileImageData');

  let usersFixed = 0;
  for (const user of usersWithUploads) {
    const relPath = user.profileImage.replace('/uploads/', '');
    const candidates = [
      path.join(uploadsDir, relPath),
      path.join(uploadsDir, 'profiles', path.basename(relPath)),
    ];

    let fileData = null;
    let resolvedPath = null;
    for (const candidate of candidates) {
      const data = readFileBase64(candidate);
      if (data) { fileData = data; resolvedPath = candidate; break; }
    }

    if (fileData) {
      await User.findByIdAndUpdate(user._id, {
        profileImageData: fileData,
        profileImageName: path.basename(resolvedPath),
        profileImageMimeType: getMimeType(resolvedPath),
      });
      console.log(`  ✅ User "${user.name}" — backed up from ${resolvedPath}`);
      usersFixed++;
    } else {
      console.log(`  ⚠️  User "${user.name}" — file NOT found on disk (profileImage: ${user.profileImage})`);
    }
  }
  console.log(`  Users: ${usersFixed}/${usersWithUploads.length} avatars backfilled`);

  console.log('\n✅ Backfill complete!');
  console.log(`   Staff:    ${staffFixed} profiles`);
  console.log(`   Carousel: ${slidesFixed} slides`);
  console.log(`   Users:    ${usersFixed} avatars`);

  await mongoose.connection.close();
  process.exit(0);
};

backfill().catch(err => {
  console.error('❌ Backfill error:', err);
  process.exit(1);
});
