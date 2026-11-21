const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Check actual database columns for InwardEntry
  const inwardCols = await prisma.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'InwardEntry' ORDER BY column_name"
  );
  console.log('=== InwardEntry columns ===');
  console.log(inwardCols.map(c => c.column_name).join(', '));
  
  // Check actual database columns for OutwardEntry
  const outwardCols = await prisma.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'OutwardEntry' ORDER BY column_name"
  );
  console.log('\n=== OutwardEntry columns ===');
  console.log(outwardCols.map(c => c.column_name).join(', '));
  
  // Check actual database columns for MaterialStock
  const stockCols = await prisma.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'MaterialStock' ORDER BY column_name"
  );
  console.log('\n=== MaterialStock columns ===');
  console.log(stockCols.map(c => c.column_name).join(', '));
  
  // Check if Notification table exists
  const tables = await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  console.log('\n=== All tables ===');
  console.log(tables.map(t => t.tablename).join(', '));
  
  await prisma.$disconnect();
}
main();
