const fs = require('fs');
const path = require('path');

const srcTestsDir = path.join(__dirname, 'src', '__tests__');
const subDirs = ['unit', 'integration', 'system'];

const findFiles = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath));
    } else {
      if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
};

subDirs.forEach(subDir => {
  const targetDir = path.join(srcTestsDir, subDir);
  const files = findFiles(targetDir);
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace imports by adding one more '../' level
    const newContent = content.replace(/(from\s+['"]|vi\.mock\(['"]|import\(['"])((?:\.\.\/)+)/g, (match, p1, p2) => {
      return p1 + '../' + p2;
    });

    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated imports in: ${file}`);
    }
  });
});

console.log('Fix script complete.');
