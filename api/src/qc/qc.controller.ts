import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

import { UserRole } from '@prisma/client';

import { QcService } from './qc.service';
import { CreateQcSpecificationDto } from './dto/create-qc-specification.dto';
import { UpdateQcSpecificationDto } from './dto/update-qc-specification.dto';
import { ScanQcDto } from './dto/scan-qc.dto';
import { CreateQcInspectionDto } from './dto/create-qc-inspection.dto';
import { SaveQcLabelInfoDto } from './dto/save-qc-label.dto';
import { CreateRetestAuditDto } from './dto/create-retest-audit.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('qc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.QUALITY_CONTROL, UserRole.RUBBER_TECHNOLOGIST)
export class QcController {
  constructor(private readonly qcService: QcService) {}

  @Post('specification')
  createSpecification(@Body() dto: CreateQcSpecificationDto) {
    return this.qcService.createSpecification(dto);
  }

  @Get('specification')
  getAllSpecifications() {
    return this.qcService.findAllSpecifications();
  }

  @Get('specification/:id')
  getSpecification(@Param('id', ParseIntPipe) id: number) {
    return this.qcService.findSpecification(id);
  }

  @Patch('specification/:id')
  updateSpecification(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQcSpecificationDto
  ) {
    return this.qcService.updateSpecification(id, dto);
  }

  @Delete('specification/:id')
  deleteSpecification(@Param('id', ParseIntPipe) id: number) {
    return this.qcService.deleteSpecification(id);
  }

  @Post('scan')
  scanQr(@Body() dto: ScanQcDto) {
    return this.qcService.scanQr(dto);
  }

  @Post('scan/batch-disposition')
  scanQrForBatchDisposition(@Body() dto: ScanQcDto) {
    return this.qcService.scanQrForBatchDisposition(dto.qrId);
  }

  @Get('inspection')
  findAllInspections() {
    return this.qcService.findAllInspections();
  }

  @Get('inspection/:id')
  findInspectionById(@Param('id', ParseIntPipe) id: number) {
    return this.qcService.findInspectionById(id);
  }

  @Post('inspection')
  createInspection(
    @Body() dto: CreateQcInspectionDto,
    @CurrentUser() user: any
  ) {
    return this.qcService.createInspection(dto, user.id);
  }

  @Post('label-info')
  saveLabelInfo(
    @Body() dto: SaveQcLabelInfoDto,
    @CurrentUser() user: any
  ) {
    return this.qcService.saveLabelInfo(dto, user.id);
  }

  @Get('label-info/:finalBatchId')
  getLabelInfo(@Param('finalBatchId', ParseIntPipe) finalBatchId: number) {
    return this.qcService.findLabelInfo(finalBatchId);
  }

  @Post('retest-audit')
  createRetestAudit(
    @Body() dto: CreateRetestAuditDto,
    @CurrentUser() user: any
  ) {
    return this.qcService.createRetestAudit(dto, user.id);
  }

  @Get('retest-audit/:inspectionId')
  getRetestAudit(@Param('inspectionId', ParseIntPipe) inspectionId: number) {
    return this.qcService.findRetestAudit(inspectionId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads/qc';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
          cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new BadRequestException('Only PDF, JPG, and PNG files are allowed.'), false);
        }
        cb(null, true);
      },
    })
  )
  uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file provided or file upload failed.');
    }
    return {
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }
}
