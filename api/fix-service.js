const fs = require('fs');
const content = fs.readFileSync('src/notification/notification.service.ts', 'utf8');
const newContent = content
  .replace(/metadata: data\.metadata \?\? null,/g, 'metadata: data.metadata ?? Prisma.JsonNull,')
  .replace(/metadata: data\.metadata \?\? null,/g, 'metadata: data.metadata ?? Prisma.JsonNull,');
fs.writeFileSync('src/notification/notification.service.ts', newContent);
console.log('Done');