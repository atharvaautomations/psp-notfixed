import { PrinterLabelData } from '../types/printer-label-data';

/**
 * Inward material label - 100mm x 150mm portrait (203 dpi => 800 x 1200 dots).
 *
 * Header : logo + PREMIER SEALING PRODUCTS (centered) + subtitle
 * Body   : horizontal key-value pairs (KEY: VALUE) with fixed value column
 * Bottom : QC Date and QC Sign side by side, QR code centered at bottom
 *
 * Font style matches the original label set: printer font "0",
 * header 18x15, body 10x10 (increased from 9x9), small 7x6.
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

    // Horizontal key-value rows - fixed value column at x=320
    // Row spacing: 42 dots (increased for better readability), starting at y=140
    kvField('MATERIAL NAME:', toUpper(data.materialName), 140),
    kvField('BATCH NUMBER:', toUpper(data.batchNumber), 182),
    kvField('GRN NO. / DATE:', toUpper(paired(data.grnNumber, data.grnDate)), 224),
    kvField('BATCH NO. / DATE:', toUpper(paired(data.batchNumber, data.batchDate)), 266),
    kvField('SUPPLIER NAME:', toUpper(data.supplierName), 308),
    kvField('QUANTITY (PER BAG):', toUpper(quantityPerBag), 350),
    kvField('SHELF LIFE:', toUpper(data.shelfLife), 392),
    kvField('MANUFACTURING DATE:', toUpper(formatDate(data.mfgDate)), 434),
    kvField('EXPIRY DATE:', toUpper(formatDate(data.expDate)), 476),

    // Separator before QC section
    'BAR 16,520,772,3',

    // QC entries - side by side, blank ruled space underneath for handwriting
    'TEXT 40,545,"0",0,10,10,"QC DATE:"',
    'TEXT 420,545,"0",0,10,10,"QC SIGN:"',
    'BAR 40,670,360,3',
    'BAR 420,670,740,3',

    // QR code section - bottom center, enlarged & perfectly centered
    // QR box: 320x320 dots (x=240 to 560, centered at x=400), y=700 to 1020
    'BOX 240,700,560,1020,3',
    // QR code: cell size 10, centered in box (box center x=400, y=860)
    // QR code top-left at x=280, y=740 (320-160)/2 = 80 offset from box edge
    `QRCODE 300,760,M,10,A,0,M2,"${escapeTsplText(data.qrId)}"`,
    // QR ID heading: larger font, centered at x=400
    'TEXT 350,1035,"0",0,14,14,"QR ID"',
    // QR ID value: larger font, centered, with clear gap from heading
    `TEXT 310,1080,"0",0,10,9,"${escapeTsplText(truncate(toUpper(data.qrId), 28))}"`,

    'PRINT 1,1',
    '',
  ];

  return lines.join('\r\n');
}

function kvField(label: string, value: string, y: number): string {
  const keyX = 40;
  const valueX = 320;

  const truncatedLabel = truncate(label, 30);
  const truncatedValue = truncate(value || '-', 55);

  return [
    `TEXT ${keyX},${y},"0",0,10,10,"${escapeTsplText(truncatedLabel)}"`,
    `TEXT ${valueX},${y},"0",0,10,10,"${escapeTsplText(truncatedValue)}"`,
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

function toUpper(value: unknown): string {
  return String(value ?? '').toUpperCase();
}