const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function getJulianDate(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const startOfYear = new Date(Date.UTC(date.getFullYear(), 0, 1));
  const currentUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfYear = Math.floor((currentUtc.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const ddd = String(dayOfYear).padStart(3, '0');
  return `${yy}${ddd}`;
}

async function migrateExecutionCodes() {
  const executions = await p.execution.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  console.log(`Found ${executions.length} executions to migrate.`);

  // Track sequence count per Julian date
  const sequenceMap = {};

  const mapping = [];

  for (const ex of executions) {
    const julianDate = getJulianDate(ex.createdAt);
    if (!sequenceMap[julianDate]) {
      sequenceMap[julianDate] = 1;
    } else {
      sequenceMap[julianDate]++;
    }

    const seqStr = String(sequenceMap[julianDate]).padStart(4, '0');
    const newCode = `EXE-${julianDate}-${seqStr}`;

    mapping.push({
      id: ex.id,
      oldCode: ex.executionCode,
      newCode,
    });
  }

  console.log('Mapping to apply:');
  mapping.forEach(m => console.log(`  ID ${m.id}: ${m.oldCode} -> ${m.newCode}`));

  // Execute in transaction
  await p.$transaction(async (tx) => {
    // 1. Temporarily append a suffix to avoid unique constraint collisions during rename
    for (const m of mapping) {
      await tx.execution.update({
        where: { id: m.id },
        data: { executionCode: `${m.newCode}_tmp_${m.id}` },
      });
    }

    // 2. Set the final new executionCode and update related QR IDs
    for (const m of mapping) {
      await tx.execution.update({
        where: { id: m.id },
        data: { executionCode: m.newCode },
      });

      // Update FinalBatches
      const finalBatches = await tx.finalBatch.findMany({
        where: {
          executionBatch: {
            executionId: m.id,
          },
        },
      });
      for (const fb of finalBatches) {
        const newQrId = fb.qrId.replace(m.oldCode, m.newCode);
        await tx.finalBatch.update({
          where: { id: fb.id },
          data: { qrId: newQrId },
        });
        console.log(`    Updated FinalBatch ${fb.id}: ${fb.qrId} -> ${newQrId}`);
      }

      // Update MasterBatches
      const masterBatches = await tx.masterBatch.findMany({
        where: {
          executionBatch: {
            executionId: m.id,
          },
        },
      });
      for (const mb of masterBatches) {
        const newQrId = mb.qrId.replace(m.oldCode, m.newCode);
        await tx.masterBatch.update({
          where: { id: mb.id },
          data: { qrId: newQrId },
        });
        console.log(`    Updated MasterBatch ${mb.id}: ${mb.qrId} -> ${newQrId}`);
      }

      // Update ExecutionIngredients
      const ingredients = await tx.executionIngredient.findMany({
        where: {
          executionBatch: {
            executionId: m.id,
          },
        },
      });
      for (const ei of ingredients) {
        if (ei.qrId && ei.qrId.includes(m.oldCode)) {
          const newQrId = ei.qrId.replace(m.oldCode, m.newCode);
          await tx.executionIngredient.update({
            where: { id: ei.id },
            data: { qrId: newQrId },
          });
        }
      }
    }
  });

  console.log('✅ Migration of execution codes completed successfully!');
}

migrateExecutionCodes().catch(console.error).finally(() => p.$disconnect());
