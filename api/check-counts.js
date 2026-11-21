const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const counts = {};
  
  const tables = ['InwardEntry', 'OutwardEntry', 'MaterialStock', 'Notification', 'Recipe', 'Execution', 'ExecutionBatch', 'FinalBatch', 'QcInspection'];
  
  for (const table of tables) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "${table}"`);
      counts[table] = parseInt(result[0].cnt);
    } catch (e) {
      counts[table] = 'ERROR: ' + e.message;
    }
  }
  
  console.log('=== Table Row Counts ===');
  for (const [table, count] of Object.entries(counts)) {
    console.log(`${table}: ${count}`);
  }
  
  // Check inward entries specifically
  const inwards = await prisma.inwardEntry.findMany({ take: 5 });
  console.log('\n=== Sample Inward Entries ===');
  console.log(JSON.stringify(inwards, null, 2));
  
  // Check outward entries  
  const outwards = await prisma.outwardEntry.findMany({ take: 5 });
  console.log('\n=== Sample Outward Entries ===');
  console.log(JSON.stringify(outwards, null, 2));
  
  // Check material stock
  const stocks = await prisma.materialStock.findMany({ take: 5 });
  console.log('\n=== Sample Material Stock ===');
  console.log(JSON.stringify(stocks, null, 2));
  
  await prisma.$disconnect();
}
main();
