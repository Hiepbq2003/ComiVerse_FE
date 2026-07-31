const fs = require('fs');
const path = require('path');

const srcTestsDir = path.join(__dirname, 'src', '__tests__');

const dirsToCreate = [
  path.join(srcTestsDir, 'unit'),
  path.join(srcTestsDir, 'integration'),
  path.join(srcTestsDir, 'system'),
];

dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const isIntegration = (fileName) => {
  return fileName.includes('Flow') || fileName.includes('Workflow');
};

const isSystem = (fileName) => {
  return fileName.includes('E2E') || fileName.includes('System');
};

// Find all test files in src/__tests__ (ignoring unit, integration, system folders)
const findFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      // Ignore the new category directories and scripts
      if (['unit', 'integration', 'system', 'scripts'].includes(file) && dir === srcTestsDir) return;
      results = results.concat(findFiles(fullPath));
    } else {
      if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
};

const allFiles = findFiles(srcTestsDir);

allFiles.forEach(oldPath => {
  const fileName = path.basename(oldPath);
  let category = 'unit';
  if (isSystem(fileName)) {
    category = 'system';
  } else if (isIntegration(fileName)) {
    category = 'integration';
  }

  // Determine new path (preserve structure under the category folder)
  const relativePath = path.relative(srcTestsDir, oldPath);
  const newPath = path.join(srcTestsDir, category, relativePath);
  
  const newDir = path.dirname(newPath);
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }

  // Read content and adjust imports
  let content = fs.readFileSync(oldPath, 'utf8');
  
  // Replace imports by adding one more '../' level
  // Matches: import ... from '../../something' or vi.mock('../../something')
  content = content.replace(/(from\s+['"]|vi\.mock\(['"]|import\(['"])((?:\.\.\/)+)/g, (match, p1, p2) => {
    return p1 + '../' + p2;
  });

  // Move the file
  fs.renameSync(oldPath, newPath);
  console.log(`Moved: ${relativePath} -> ${category}/${relativePath}`);
});

console.log('Done reorganizing tests.');
