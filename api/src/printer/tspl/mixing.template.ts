import { MixingLabelData } from '../types/mixing-label-data';

export function buildMixingLabel(data: MixingLabelData): string {
  const title = data.labelType === 'MASTER' ? 'MASTER BATCH' : 'FINAL BATCH';

  function formatDate(value: Date | string): string {
    const date = new Date(value);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  function formatTime(value: Date | string): string {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const isFinalBatch = data.labelType === 'FINAL';

  const lines = [
    'SIZE 100 mm, 50 mm',
    'GAP 2 mm, 0 mm',
    'DIRECTION 0',
    'CLS',

    'BOX 4,4,770,370,5',

    `TEXT 240,20,"0",0,18,15,"${title}"`,

    'BAR 4,70,765,5',

    `QRCODE 70,120,M,8,A,0,M2,"${escapeTsplText(data.qrId)}"`,

    `TEXT 50,300,"0",0,9,9,"${escapeTsplText(data.qrId)}"`,

    'BAR 300,70,5,300',
  ];

  if (isFinalBatch) {
    // Final Batch label with new fields
    const productionBatchNo = data.productionBatchNumber ?? String(data.batchNumber);
    const compoundName = data.compoundName ?? '';
    const mixingDate = data.mixingDate ?? formatDate(data.completedAt);
    const mixingTime = data.mixingTime ?? formatTime(data.completedAt);
    const shift = data.shift ?? '';
    const expiryDate = data.expiryDate ?? '';

    lines.push(
      `TEXT 330,90,"0",0,10,10,"BATCH NO : ${escapeTsplText(productionBatchNo)}"`,
      `TEXT 330,130,"0",0,10,10,"COMPOUND : ${escapeTsplText(compoundName)}"`,
      `TEXT 330,170,"0",0,10,10,"MIXING DATE : ${escapeTsplText(mixingDate)}"`,
      `TEXT 330,210,"0",0,10,10,"MIXING TIME : ${escapeTsplText(mixingTime)}"`,
      `TEXT 330,250,"0",0,10,10,"SHIFT : ${escapeTsplText(shift)}"`,
      `TEXT 330,290,"0",0,10,10,"EXPIRY DATE : ${escapeTsplText(expiryDate)}"`
    );
  } else {
    // Master Batch label (existing format)
    lines.push(
      `TEXT 330,110,"0",0,10,10,"RECIPE : ${escapeTsplText(data.recipeCode)}"`,
      `TEXT 330,170,"0",0,10,10,"BATCH NO : ${escapeTsplText(String(data.batchNumber))}"`,
      `TEXT 330,230,"0",0,10,10,"LABEL TYPE : ${escapeTsplText(title)}"`,
      `TEXT 330,255,"0",0,10,10,"DATE : ${formatDate(data.completedAt)}"`
    );
  }

  lines.push(`TEXT 700,340,"0",0,7,6,"${getJulianDate(new Date())}"`);
  lines.push('PRINT 1,1');
  lines.push('');

  return lines.join('\r\n');
}

export function getJulianDate(date: Date): string {
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
