export interface QcLabelData {
  qrId: string;
  recipeCode: string;
  batchNumber: string;
  qcResult: 'PASS' | 'FAIL';
  customerName?: string;
  partName?: string;
  partNumber?: string;
  expiryDate?: string;
  compoundName?: string;
  mixingDate?: string;
  shift?: string;
  completedAt: Date | string;
}

export function buildQcLabel(data: QcLabelData): string {
  const title = 'QC INSPECTION';

  function formatDate(value: Date | string): string {
    const date = new Date(value);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  const lines = [
    'SIZE 100 mm, 50 mm',
    'GAP 2 mm, 0 mm',
    'DIRECTION 0',
    'CLS',

    'BOX 4,4,770,370,5',

    `TEXT 130,20,"0",0,18,15,"${title}"`,

    'BAR 4,70,765,5',

    `QRCODE 70,120,M,8,A,0,M2,"${escapeTsplText(data.qrId)}"`,

    `TEXT 90,300,"0",0,9,9,"${escapeTsplText(data.qrId)}"`,
  ];

  // Recipe
  lines.push(
    `TEXT 330,80,"0",0,9,9,"RECIPE : ${escapeTsplText(data.recipeCode)}"`
  );

  // Batch Number
  lines.push(
    `TEXT 330,110,"0",0,9,9,"BATCH NO : ${escapeTsplText(
      String(data.batchNumber ?? data.qrId)
    )}"`
  );

  // Customer Name
  lines.push(
    `TEXT 330,140,"0",0,9,9,"CUSTOMER : ${escapeTsplText(
      data.customerName ?? ''
    )}"`
  );

  // Part Name
  lines.push(
    `TEXT 330,170,"0",0,9,9,"PART NAME : ${escapeTsplText(
      data.partName ?? ''
    )}"`
  );

  // Part Number
  lines.push(
    `TEXT 330,200,"0",0,9,9,"PART NO : ${escapeTsplText(data.partNumber ?? '')}"`
  );

  // Compound Name
  lines.push(
    `TEXT 330,230,"0",0,9,9,"COMPOUND : ${escapeTsplText(
      data.compoundName ?? ''
    )}"`
  );

  // Mixing Date / Shift
  const mixingInfo = `${data.mixingDate ?? ''}${
    data.shift ? ` / ${data.shift}` : ''
  }`;
  lines.push(
    `TEXT 330,260,"0",0,9,9,"MIXING : ${escapeTsplText(mixingInfo)}"`
  );

  // Expiry Date
  lines.push(
    `TEXT 330,290,"0",0,9,9,"EXPIRY : ${escapeTsplText(data.expiryDate ?? '')}"`
  );

  // QC Result
  lines.push(
    `TEXT 330,320,"0",0,10,10,"QC RESULT : ${escapeTsplText(data.qcResult)}"`
  );

  // Date
  lines.push(
    `TEXT 330,350,"0",0,9,9,"DATE : ${formatDate(data.completedAt)}"`
  );

  // Julian date at bottom right
  lines.push(
    `TEXT 700,340,"0",0,7,6,"${getJulianDate(new Date())}"`
  );

  lines.push('PRINT 1,1');
  lines.push('');

  return lines.join('\r\n');
}

function getJulianDate(date: Date): string {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  return `${String(date.getUTCFullYear()).slice(-2)}${String(
    dayOfYear
  ).padStart(3, '0')}`;
}

function escapeTsplText(value: string): string {
  return String(value ?? '').replace(/"/g, "'");
}