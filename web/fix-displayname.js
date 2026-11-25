const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/qc/components/QcInspectionTable.tsx', 'utf8');
const newContent = content.replace(
  '});\r\n\r\nexport default QcInspectionTable;',
  '});\r\n\r\nQcInspectionTable.displayName = "QcInspectionTable";\r\n\r\nexport default QcInspectionTable;'
);
fs.writeFileSync('src/app/(dashboard)/qc/components/QcInspectionTable.tsx', newContent);
console.log('Done');