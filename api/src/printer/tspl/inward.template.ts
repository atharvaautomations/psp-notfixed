import { PrinterLabelData } from '../types/printer-label-data';

/**
 * Inward material label - 100mm x 150mm portrait (203 dpi => 800 x 1200 dots).
 *
 * Header : logo + PREMIER SEALING PRODUCTS (centered) + subtitle
 * Left   : key on one line, value directly below it
 * Right  : QR ID box aligned with the quantity-to-expiry rows
 * Bottom : QC Date and QC Sign side by side, blank ruled space underneath
 *
 * Font style matches the original label set: printer font "0", header 18x15,
 * body 9x9 and small 7x6.
 */
export function generateTSPL(data: PrinterLabelData): string {
  const unit = data.unit || '';
  const perBagValue =
    !data.storedAsWhole && data.bagWeight ? data.bagWeight : data.quantity;
  const quantityPerBag = `${formatNumber(perBagValue)} ${unit}`.trim();

  const lines = [
    'SIZE 100 mm, 150 mm',
    'GAP 2 mm, 0 mm',
    'DIRECTION 0',
    'CLS',

    // Outer frame
    'BOX 12,12,788,1188,3',

    // Header: logo box on the left, company name centered
    'BOX 24,24,96,96,3',
    'TEXT 44,54,"0",0,5,5,"LOGO"',
    'TEXT 100,30,"0",0,18,15,"PREMIER SEALING PRODUCTS"',
    'TEXT 267,76,"0",0,9,9,"MATERIAL INWARD LABEL"',
    'BAR 16,124,772,3',

    // Left column - key with value directly below
    field('MATERIAL NAME', data.materialName, 140, 28),
    field('BATCH NUMBER', data.batchNumber, 220, 28),
    field('GRN NO. / DATE', paired(data.grnNumber, data.grnDate), 300, 30),
    field('BATCH NO. / DATE', paired(data.batchNumber, data.batchDate), 380, 30),
    field('SUPPLIER NAME', data.supplierName, 460, 28),
    field('QUANTITY (PER BAG WEIGHT)', quantityPerBag, 540, 18),
    field('SHELF LIFE', data.shelfLife, 620, 18),
    field('MANUFACTURING DATE', formatDate(data.mfgDate), 700, 18),
    field('EXPIRY DATE', formatDate(data.expDate), 780, 18),

    // QR ID box - right side, aligned with the quantity-to-expiry rows
    'BOX 540,540,776,826,3',
    `QRCODE 583,554,M,6,A,0,M2,"${escapeTsplText(data.qrId)}"`,
    'TEXT 626,712,"0",0,9,9,"QR ID"',
    `TEXT 590,740,"0",0,7,6,"${escapeTsplText(truncate(data.qrId, 20))}"`,

    // QC entries - side by side, blank ruled space underneath for handwriting
    'BAR 16,880,772,3',
    'TEXT 40,915,"0",0,9,9,"QC DATE :"',
    'TEXT 420,915,"0",0,9,9,"QC SIGN :"',
    'BAR 40,1110,360,3',
    'BAR 420,1110,740,3',

    'PRINT 1,1',
    '',
  ];

  return lines.join('\r\n');
}

function field(
  label: string,
  value: unknown,
  labelY: number,
  maxChars = 28
): string {
  const text = truncate(String(value ?? '').trim() || '-', maxChars);

  return [
    `TEXT 40,${labelY},"0",0,9,9,"${escapeTsplText(label)}"`,
    `TEXT 40,${labelY + 26},"0",0,9,9,"${escapeTsplText(text)}"`,
  ].join('\r\n');
}

function paired(
  number: unknown,
  date: Date | string | null | undefined
): string {
  const n = String(number ?? '').trim() || '-';
  return `${n} / ${formatDate(date)}`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
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

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function escapeTsplText(value: string): string {
  return String(value ?? '').replace(/"/g, "'");
}
