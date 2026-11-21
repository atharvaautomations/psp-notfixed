const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Check QC specification parameters
  const specs = await prisma.qcSpecification.findMany({ include: { parameters: true } });
  console.log('=== QC Specifications ===');
  specs.forEach(s => {
    console.log('Recipe:', s.recipeId, 'Params:', s.parameters.length);
    s.parameters.forEach(p => console.log('  -', p.name, 'dependent:', p.isDependentOnElongation));
  });
  
  // Check executions
  const executions = await prisma.execution.findMany({ include: { batches: { include: { finalBatch: true } } } });
  console.log('\n=== Executions ===');
  executions.forEach(e => {
    console.log('Code:', e.executionCode, 'Batches:', e.batches.length);
    e.batches.forEach(b => console.log('  Batch', b.batchNumber, 'FB:', b.finalBatch?.qrId || 'none'));
  });
  
  await prisma.$disconnect();
}
main();
