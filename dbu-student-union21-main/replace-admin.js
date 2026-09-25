const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'project/src');
const backendDir = path.join(process.cwd(), 'backend');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory() && !filePath.includes('node_modules')) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
};

const allFiles = [...walk(srcDir), ...walk(backendDir)];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('dbu10101040')) {
    // In React components
    content = content.replace(/user\?\.username === 'dbu10101040'/g, "user?.role === 'admin'");
    content = content.replace(/user\.username === 'dbu10101040'/g, "user.role === 'admin'");
    content = content.replace(/user\?\.username !== 'dbu10101040'/g, "user?.role !== 'admin'");
    
    // In backend routes
    content = content.replace(/req\.user\.username === 'dbu10101040'/g, "req.user.role === 'admin'");
    content = content.replace(/req\.user\?\.username === 'dbu10101040'/g, "req.user?.role === 'admin'");
    content = content.replace(/req\.user\.username !== 'dbu10101040'/g, "req.user.role !== 'admin'");
    
    // For specific arrays like users.js adminUsernames
    content = content.replace(/'dbu10101010', 'dbu10101020', 'dbu10101030', 'dbu10101040'/g, "'dbu10101010', 'dbu10101020', 'dbu10101030'");
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});
