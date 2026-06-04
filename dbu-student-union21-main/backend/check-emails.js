require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const total = await User.countDocuments();
  const users = await User.find({}).select('username email role isAdmin').limit(20);
  
  console.log('\n=== TOTAL USERS IN DB:', total, '===');
  console.log('\nUsername | Email | Role | isAdmin');
  console.log('---------|-------|------|--------');
  users.forEach(u => {
    console.log(`${u.username} | ${u.email || 'NO EMAIL'} | ${u.role} | ${u.isAdmin}`);
  });

  const withEmail = users.filter(u => u.email).length;
  const withoutEmail = users.filter(u => !u.email).length;
  console.log(`\nWith email: ${withEmail}, Without email: ${withoutEmail}`);
  process.exit(0);
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
