const fs = require('fs');
const content = fs.readFileSync('src/notification/notification.controller.ts', 'utf8');

// Fix the import statement
const lines = content.split('\n');
let inImport = false;
let newLines = [];
let addedQuery = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("import {")) {
    inImport = true;
    newLines.push(line);
    continue;
  }
  
  if (inImport && line.includes("} from")) {
    // Add Query before the closing brace
    if (!addedQuery) {
      newLines.push("  Query,");
      addedQuery = true;
    }
    newLines.push(line);
    inImport = false;
    continue;
  }
  
  if (inImport && line.includes("@nestjs.common")) {
    // Fix the typo
    newLines.push(line.replace("@nestjs.common", "@nestjs/common"));
    continue;
  }
  
  newLines.push(line);
}

fs.writeFileSync('src/notification/notification.controller.ts', newLines.join('\n'));
console.log('Done');