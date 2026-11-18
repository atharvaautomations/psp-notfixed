import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export type ActivityLogData = {
  moduleType: string;
  activityType: string;
  referenceId?: string | null;
  bagNumber?: number | null;
  qrId?: string | null;
  grnNumber?: string | null;
  binNumber?: string | null;
  userId?: number | null;
  username?: string | null;
  status?: string;
  errorMessage?: string | null;
  metadata?: any;
};

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: ActivityLogData) {
    return this.prisma.activityLog.create({
      data: {
        moduleType: data.moduleType,
        activityType: data.activityType,
        referenceId: data.referenceId ?? null,
        bagNumber: data.bagNumber ?? null,
        qrId: data.qrId ?? null,
        grnNumber: data.grnNumber ?? null,
        binNumber: data.binNumber ?? null,
        userId: data.userId ?? null,
        username: data.username ?? null,
        status: data.status ?? 'Success',
        errorMessage: data.errorMessage ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async list(filters?: {
    moduleType?: string;
    activityType?: string;
    userId?: number;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    sort?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.moduleType) {
      where.moduleType = filters.moduleType;
    }

    if (filters?.activityType) {
      where.activityType = filters.activityType;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { referenceId: { contains: filters.search, mode: 'insensitive' } },
        { qrId: { contains: filters.search, mode: 'insensitive' } },
        { grnNumber: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { errorMessage: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: filters?.sort === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async export(filters?: {
    moduleType?: string;
    activityType?: string;
    userId?: number;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    sort?: 'asc' | 'desc';
    format?: 'excel' | 'pdf';
  }): Promise<Buffer> {
    const where: any = {};

    if (filters?.moduleType) {
      where.moduleType = filters.moduleType;
    }

    if (filters?.activityType) {
      where.activityType = filters.activityType;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { referenceId: { contains: filters.search, mode: 'insensitive' } },
        { qrId: { contains: filters.search, mode: 'insensitive' } },
        { grnNumber: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { errorMessage: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const logs = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: filters?.sort === 'asc' ? 'asc' : 'desc' },
    });

    const format = filters?.format ?? 'excel';

    if (format === 'pdf') {
      return this.generatePDF(logs);
    }

    return this.generateExcel(logs);
  }

  private async generateExcel(logs: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Activity Log');

    worksheet.columns = [
      { header: 'Date & Time', key: 'createdAt', width: 22 },
      { header: 'Module', key: 'moduleType', width: 18 },
      { header: 'Activity', key: 'activityType', width: 25 },
      { header: 'Reference ID', key: 'referenceId', width: 20 },
      { header: 'Bag No.', key: 'bagNumber', width: 12 },
      { header: 'QR ID', key: 'qrId', width: 25 },
      { header: 'GRN No.', key: 'grnNumber', width: 20 },
      { header: 'Bin No.', key: 'binNumber', width: 12 },
      { header: 'Performed By', key: 'username', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Error Details', key: 'errorMessage', width: 30 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const log of logs) {
      worksheet.addRow({
        createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
        moduleType: log.moduleType,
        activityType: log.activityType.replace(/_/g, ' '),
        referenceId: log.referenceId ?? '',
        bagNumber: log.bagNumber ?? '',
        qrId: log.qrId ?? '',
        grnNumber: log.grnNumber ?? '',
        binNumber: log.binNumber ?? '',
        username: log.username ?? '',
        status: log.status,
        errorMessage: log.errorMessage ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async generatePDF(logs: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ layout: 'landscape', margin: 30 });
      const chunks: Buffer[] = [];
      const stream = new PassThrough();

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);

      doc.pipe(stream);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('Activity Log Export', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);

      // Table headers
      const headers = [
        { text: 'Date & Time', width: 110 },
        { text: 'Module', width: 65 },
        { text: 'Activity', width: 100 },
        { text: 'Reference ID', width: 80 },
        { text: 'Bag No.', width: 50 },
        { text: 'QR ID', width: 90 },
        { text: 'GRN No.', width: 70 },
        { text: 'Bin No.', width: 50 },
        { text: 'Performed By', width: 75 },
        { text: 'Status', width: 50 },
      ];

      const startX = doc.page.margins.left;
      let y = doc.y;

      // Draw header row
      doc.fontSize(8).font('Helvetica-Bold');
      let x = startX;
      for (const header of headers) {
        doc.rect(x, y, header.width, 18).fill('#4472C4');
        doc.fillColor('white').text(header.text, x + 2, y + 5, {
          width: header.width - 4,
          height: 18,
          ellipsis: true,
        });
        x += header.width;
      }
      doc.fillColor('black');
      y += 18;

      // Draw data rows
      doc.fontSize(7).font('Helvetica');
      for (const log of logs) {
        if (y > doc.page.height - doc.page.margins.bottom - 20) {
          doc.addPage();
          y = doc.page.margins.top;

          // Redraw headers on new page
          doc.fontSize(8).font('Helvetica-Bold');
          x = startX;
          for (const header of headers) {
            doc.rect(x, y, header.width, 18).fill('#4472C4');
            doc.fillColor('white').text(header.text, x + 2, y + 5, {
              width: header.width - 4,
              height: 18,
              ellipsis: true,
            });
            x += header.width;
          }
          doc.fillColor('black');
          y += 18;
          doc.fontSize(7).font('Helvetica');
        }

        const rowData = [
          log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
          log.moduleType,
          log.activityType.replace(/_/g, ' '),
          log.referenceId ?? '',
          log.bagNumber?.toString() ?? '',
          log.qrId ?? '',
          log.grnNumber ?? '',
          log.binNumber?.toString() ?? '',
          log.username ?? '',
          log.status,
        ];

        x = startX;
        const rowHeight = 16;
        for (let i = 0; i < headers.length; i++) {
          const cellText = rowData[i] ?? '';
          doc.rect(x, y, headers[i].width, rowHeight).stroke('#E0E0E0');
          doc.text(cellText, x + 2, y + 4, {
            width: headers[i].width - 4,
            height: rowHeight,
            ellipsis: true,
          });
          x += headers[i].width;
        }
        y += rowHeight;
      }

      doc.end();
    });
  }
}
