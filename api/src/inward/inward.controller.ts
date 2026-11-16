import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { InwardService } from './inward.service';
import { CreateInwardDto } from './dto/create-inward.dto';
import { UpdateInwardDto } from './dto/update-inward.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface AuthenticatedRequest {
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

@Controller('inward')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InwardController {
  constructor(private readonly inwardService: InwardService) {}

  @Post()
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  create(@Body() dto: CreateInwardDto, @Req() req: AuthenticatedRequest) {
    return this.inwardService.create(dto, {
      userId: req.user.id,
      username: req.user.username,
    });
  }

  @Get()
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('unit') unit?: string
  ) {
    if (search || status || sort || unit) {
      return this.inwardService.findAllFiltered(search, status, sort, unit);
    }

    return this.inwardService.findAll();
  }

  // Inventory page
  @Get('/stock')
  @Roles(
    UserRole.STORES,
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.QUALITY_CONTROL
  )
  async getStock() {
    return this.inwardService.getStock();
  }

  // Inventory/dashboard analytics
  @Get('/analytics')
  @Roles(
    UserRole.STORES,
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.QUALITY_CONTROL
  )
  async getAnalytics() {
    return this.inwardService.getAnalytics();
  }

  @Get('materials')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  async getMaterials() {
    return this.inwardService.getMaterials();
  }

  @Get('suppliers')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  async getSuppliers() {
    return this.inwardService.getSuppliers();
  }

  @Get('available-bags/:material')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  async getAvailableBags(@Param('material') material: string) {
    return this.inwardService.getAvailableBags(material);
  }

  @Get('available-bags-by-inward/:inwardId')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  async getAvailableBagsByInward(
    @Param('inwardId', ParseIntPipe)
    inwardId: number
  ) {
    return this.inwardService.getAvailableBagsByInward(inwardId);
  }

  @Get('available-for-outward')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  async getAvailableForOutward() {
    return this.inwardService.getAvailableForOutward();
  }

  // QR Preview page
  @Get('qr/:qrId')
  @Roles(
    UserRole.STORES,
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.QUALITY_CONTROL
  )
  async getQrByQrId(@Param('qrId') qrId: string) {
    console.log('\n========== 📱 QR LOOKUP ENDPOINT HIT ==========');
    console.log('🔍 Controller received QR ID:', qrId);
    console.log('⏱️ Timestamp:', new Date().toISOString());

    try {
      const result = await this.inwardService.getQrByQrId(qrId);

      console.log('✅ Service returned result');

      return result;
    } catch (error: any) {
      console.error('❌ Controller error:', error.message);

      throw error;
    }
  }

  @Get(':id')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inwardService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInwardDto) {
    return this.inwardService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inwardService.remove(id);
  }

  // Used for QR preview / re-print
  @Get(':id/qrs')
  @Roles(
    UserRole.STORES,
    UserRole.RUBBER_TECHNOLOGIST,
    UserRole.QUALITY_CONTROL
  )
  getQrCodes(@Param('id', ParseIntPipe) id: number) {
    return this.inwardService.getQrCodesByInward(id);
  }
}
