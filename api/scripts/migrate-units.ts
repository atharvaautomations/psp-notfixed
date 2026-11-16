/**
 * Migration Script: Convert existing quantity data to base units
 *
 * Conversion rules:
 *   KG  → GRAM: multiply by 1000
 *   LITRE → ML: multiply by 1000
 *   NOS  → NOS: unchanged
 *
 * This script is idempotent - it checks if baseQuantity is already set before converting.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Starting Unit Conversion Migration ===\n');

  // -------------------------------------------------------
  // 1. InwardEntry: convert quantity + unit to baseQuantity + baseUnit
  // -------------------------------------------------------
  console.log('Migrating InwardEntry...');
  const inwardEntries = await prisma.inwardEntry.findMany({
    where: { baseQuantity: null },
  });

  for (const entry of inwardEntries) {
    const unit = (entry.unit || 'KG').toUpperCase();
    let baseQuantity: number;
    let baseUnit: string;

    if (unit === 'KG') {
      baseQuantity = entry.quantity * 1000;
      baseUnit = 'GRAM';
    } else if (unit === 'LITRE' || unit === 'L') {
      baseQuantity = entry.quantity * 1000;
      baseUnit = 'ML';
    } else if (unit === 'NOS') {
      baseQuantity = entry.quantity;
      baseUnit = 'NOS';
    } else if (unit === 'GRAM') {
      baseQuantity = entry.quantity;
      baseUnit = 'GRAM';
    } else if (unit === 'ML') {
      baseQuantity = entry.quantity;
      baseUnit = 'ML';
    } else {
      // Unknown unit, assume KG
      baseQuantity = entry.quantity * 1000;
      baseUnit = 'GRAM';
    }

    await prisma.inwardEntry.update({
      where: { id: entry.id },
      data: { baseQuantity, baseUnit },
    });
  }
  console.log(`  Migrated ${inwardEntries.length} inward entries.`);

  // -------------------------------------------------------
  // 2. OutwardEntry: convert quantity + unit to baseQuantity + baseUnit
  // -------------------------------------------------------
  console.log('Migrating OutwardEntry...');
  const outwardEntries = await prisma.outwardEntry.findMany({
    where: { baseQuantity: null },
  });

  for (const entry of outwardEntries) {
    const unit = (entry.unit || 'KG').toUpperCase();
    let baseQuantity: number;
    let baseUnit: string;

    if (unit === 'KG') {
      baseQuantity = entry.quantity * 1000;
      baseUnit = 'GRAM';
    } else if (unit === 'LITRE' || unit === 'L') {
      baseQuantity = entry.quantity * 1000;
      baseUnit = 'ML';
    } else if (unit === 'NOS') {
      baseQuantity = entry.quantity;
      baseUnit = 'NOS';
    } else if (unit === 'GRAM') {
      baseQuantity = entry.quantity;
      baseUnit = 'GRAM';
    } else if (unit === 'ML') {
      baseQuantity = entry.quantity;
      baseUnit = 'ML';
    } else {
      baseQuantity = entry.quantity * 1000;
      baseUnit = 'GRAM';
    }

    await prisma.outwardEntry.update({
      where: { id: entry.id },
      data: { baseQuantity, baseUnit },
    });
  }
  console.log(`  Migrated ${outwardEntries.length} outward entries.`);

  // -------------------------------------------------------
  // 3. MaterialStock: convert totalQuantity + unit to baseQuantity + baseUnit
  // -------------------------------------------------------
  console.log('Migrating MaterialStock...');
  const materialStocks = await prisma.materialStock.findMany({
    where: { baseQuantity: null },
  });

  for (const stock of materialStocks) {
    const unit = (stock.unit || 'KG').toUpperCase();
    let baseQuantity: number;
    let baseUnit: string;

    if (unit === 'KG') {
      baseQuantity = stock.totalQuantity * 1000;
      baseUnit = 'GRAM';
    } else if (unit === 'LITRE' || unit === 'L') {
      baseQuantity = stock.totalQuantity * 1000;
      baseUnit = 'ML';
    } else if (unit === 'NOS') {
      baseQuantity = stock.totalQuantity;
      baseUnit = 'NOS';
    } else if (unit === 'GRAM') {
      baseQuantity = stock.totalQuantity;
      baseUnit = 'GRAM';
    } else if (unit === 'ML') {
      baseQuantity = stock.totalQuantity;
      baseUnit = 'ML';
    } else {
      baseQuantity = stock.totalQuantity * 1000;
      baseUnit = 'GRAM';
    }

    await prisma.materialStock.update({
      where: { id: stock.id },
      data: { baseQuantity, baseUnit },
    });
  }
  console.log(`  Migrated ${materialStocks.length} material stock entries.`);

  // -------------------------------------------------------
  // 4. StepIngredient: convert quantity + unit to baseQuantity + baseUnit
  // -------------------------------------------------------
  console.log('Migrating StepIngredient...');
  const stepIngredients = await prisma.stepIngredient.findMany({
    where: { baseQuantity: null },
  });

  for (const ing of stepIngredients) {
    const unit = (ing.unit || 'KG').toUpperCase();
    let baseQuantity: number;
    let baseUnit: string;
    let baseTolerance: number | null = null;

    if (unit === 'KG') {
      baseQuantity = ing.quantity * 1000;
      baseUnit = 'GRAM';
      baseTolerance = ing.tolerance ? ing.tolerance * 1000 : null;
    } else if (unit === 'LITRE' || unit === 'L') {
      baseQuantity = ing.quantity * 1000;
      baseUnit = 'ML';
      baseTolerance = ing.tolerance ? ing.tolerance * 1000 : null;
    } else if (unit === 'NOS') {
      baseQuantity = ing.quantity;
      baseUnit = 'NOS';
      baseTolerance = ing.tolerance;
    } else if (unit === 'GRAM') {
      baseQuantity = ing.quantity;
      baseUnit = 'GRAM';
      baseTolerance = ing.tolerance;
    } else if (unit === 'ML') {
      baseQuantity = ing.quantity;
      baseUnit = 'ML';
      baseTolerance = ing.tolerance;
    } else {
      baseQuantity = ing.quantity * 1000;
      baseUnit = 'GRAM';
      baseTolerance = ing.tolerance ? ing.tolerance * 1000 : null;
    }

    await prisma.stepIngredient.update({
      where: { id: ing.id },
      data: { baseQuantity, baseUnit, baseTolerance },
    });
  }
  console.log(`  Migrated ${stepIngredients.length} step ingredients.`);

  // -------------------------------------------------------
  // 5. Requisition: convert requiredQuantity + unit to baseQuantity + baseUnit
  // -------------------------------------------------------
  console.log('Migrating Requisition...');
  const requisitions = await prisma.requisition.findMany({
    where: { baseQuantity: null },
  });

  for (const req of requisitions) {
    const unit = (req.unit || 'KG').toUpperCase();
    let baseQuantity: number;
    let baseUnit: string;

    if (unit === 'KG') {
      baseQuantity = req.requiredQuantity * 1000;
      baseUnit = 'GRAM';
    } else if (unit === 'LITRE' || unit === 'L') {
      baseQuantity = req.requiredQuantity * 1000;
      baseUnit = 'ML';
    } else if (unit === 'NOS') {
      baseQuantity = req.requiredQuantity;
      baseUnit = 'NOS';
    } else if (unit === 'GRAM') {
      baseQuantity = req.requiredQuantity;
      baseUnit = 'GRAM';
    } else if (unit === 'ML') {
      baseQuantity = req.requiredQuantity;
      baseUnit = 'ML';
    } else {
      baseQuantity = req.requiredQuantity * 1000;
      baseUnit = 'GRAM';
    }

    await prisma.requisition.update({
      where: { id: req.id },
      data: { baseQuantity, baseUnit },
    });
  }
  console.log(`  Migrated ${requisitions.length} requisitions.`);

  // -------------------------------------------------------
  // 6. BinAssignment: add unit and convert quantities
  // -------------------------------------------------------
  console.log('Migrating BinAssignment...');
  const binAssignments = await prisma.binAssignment.findMany({
    where: { baseUnit: null },
  });

  for (const bin of binAssignments) {
    const unit = 'KG'; // Legacy data assumed to be KG
    let baseMinQuantity: number;
    let baseMaxQuantity: number;
    let baseCurrentQuantity: number;

    baseMinQuantity = bin.minQuantity * 1000;
    baseMaxQuantity = bin.maxQuantity * 1000;
    baseCurrentQuantity = bin.currentQuantity * 1000;

    await prisma.binAssignment.update({
      where: { id: bin.id },
      data: {
        unit: 'KG',
        baseUnit: 'GRAM',
        baseMinQuantity,
        baseMaxQuantity,
        baseCurrentQuantity,
      },
    });
  }
  console.log(`  Migrated ${binAssignments.length} bin assignments.`);

  // -------------------------------------------------------
  // 7. ExecutionIngredient: add unit and convert quantities
  // -------------------------------------------------------
  console.log('Migrating ExecutionIngredient...');
  const executionIngredients = await prisma.executionIngredient.findMany({
    where: { baseUnit: null },
  });

  for (const ei of executionIngredients) {
    const unit = 'KG'; // Legacy data assumed to be KG
    let baseExpectedQuantity: number;
    let baseTolerance: number | null = null;
    let baseActualQuantity: number | null = null;

    baseExpectedQuantity = ei.expectedQuantity * 1000;
    baseTolerance = ei.tolerance ? ei.tolerance * 1000 : null;
    baseActualQuantity = ei.actualQuantity ? ei.actualQuantity * 1000 : null;

    await prisma.executionIngredient.update({
      where: { id: ei.id },
      data: {
        unit: 'KG',
        baseUnit: 'GRAM',
        baseExpectedQuantity,
        baseTolerance,
        baseActualQuantity,
      },
    });
  }
  console.log(`  Migrated ${executionIngredients.length} execution ingredients.`);

  console.log('\n=== Migration Complete ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
