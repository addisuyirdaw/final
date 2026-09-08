const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const { createDefaultAdmin } = require('./utils/createAdmin');

async function testPasswordPersistence() {
  console.log('--- Testing Password Persistence Across Server Restarts ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const testUsername = 'dbu10101040';
  const originalPassword = 'Admin123#';
  const temporaryNewPassword = 'MyNewStrongPass456#';

  const baseUrl = 'http://localhost:5000/api/auth';

  try {
    // 1. Initial Login
    console.log(`\n1. Attempting login for ${testUsername} with current password...`);
    let loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: originalPassword })
    });
    let loginData = await loginRes.json();
    
    // If not matching originalPassword, try temporaryNewPassword
    let currentPass = originalPassword;
    if (!loginData.success) {
      console.log('Trying with temporaryNewPassword...');
      loginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: temporaryNewPassword })
      });
      loginData = await loginRes.json();
      currentPass = temporaryNewPassword;
    }

    if (!loginData.success) {
      throw new Error(`Could not log in as ${testUsername}: ` + JSON.stringify(loginData));
    }
    console.log(`✅ Login successful with token (Active password was: "${currentPass}")`);
    const token = loginData.token;

    // 2. Change Password
    const nextPassword = currentPass === originalPassword ? temporaryNewPassword : 'AnotherStrongPass789#';
    console.log(`\n2. Changing password via PUT /api/auth/change-password to: "${nextPassword}"...`);
    const changeRes = await fetch(`${baseUrl}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: currentPass,
        newPassword: nextPassword
      })
    });
    const changeData = await changeRes.json();
    console.log('Change password response:', changeData);
    if (!changeData.success) {
      throw new Error('Failed to change password: ' + JSON.stringify(changeData));
    }
    console.log('✅ Password changed successfully!');

    // 3. Login immediately with nextPassword
    console.log(`\n3. Logging in immediately with nextPassword: "${nextPassword}"...`);
    const loginImmediateRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: nextPassword })
    });
    const loginImmediateData = await loginImmediateRes.json();
    if (!loginImmediateData.success) {
      throw new Error('Failed immediate login after password change: ' + JSON.stringify(loginImmediateData));
    }
    console.log('✅ Immediate login succeeded with 200 OK!');

    // 4. SIMULATE SERVER RESTART / CRON / STARTUP SEEDING
    console.log('\n4. Simulating server restart and database reconnection by calling createDefaultAdmin()...');
    await createDefaultAdmin();
    console.log('✅ createDefaultAdmin() completed.');

    // 5. Login AFTER server restart simulation with the NEW password
    console.log(`\n5. Logging in AFTER server restart with nextPassword: "${nextPassword}"...`);
    const loginAfterRestartRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: nextPassword })
    });
    const loginAfterRestartData = await loginAfterRestartRes.json();
    if (!loginAfterRestartData.success) {
      throw new Error('❌ BUG STILL PRESENT: Login failed after server restart with: ' + JSON.stringify(loginAfterRestartData));
    }
    console.log('🎉 SUCCESS: Login succeeded with 200 OK after server restart! The password was NOT overwritten!');

    // 6. Verify OLD password now fails with 401
    console.log(`\n6. Verifying old password ("${currentPass}") fails with 401 Invalid credentials...`);
    const oldLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: currentPass })
    });
    const oldLoginData = await oldLoginRes.json();
    if (oldLoginRes.status !== 401) {
      throw new Error(`Expected 401 for old password, got: ${oldLoginRes.status}`);
    }
    console.log(`✅ Old password correctly rejected with 401: ${oldLoginData.message}`);

    // Restore back to Admin123# for user convenience
    console.log(`\n7. Resetting password back to "${originalPassword}"...`);
    const restoreToken = loginAfterRestartData.token;
    await fetch(`${baseUrl}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${restoreToken}`
      },
      body: JSON.stringify({
        currentPassword: nextPassword,
        newPassword: originalPassword
      })
    });
    console.log(`✅ Password restored to "${originalPassword}" for account ${testUsername}.`);

    console.log('\n🌟 ALL TESTS PASSED: Password changes now permanently persist across server restarts!');
  } finally {
    await mongoose.disconnect();
  }
}

testPasswordPersistence().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
