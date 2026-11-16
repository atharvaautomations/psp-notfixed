import { BinService } from './bins.service';
import { AssignBinDto } from './dto/assign-bin.dto';

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('bins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STORES, UserRole.RUBBER_TECHNOLOGIST)
export class BinController {
  constructor(private readonly binService: BinService) {}

  @Post()
  create(@Body() body: any) {
    return this.binService.assignBin(body);
  }

  @Post('assign')
  async assignBin(@Body() dto: AssignBinDto) {
    return this.binService.assignBin(dto);
  }

  @Get()
  async getAllBins() {
    return this.binService.findAll();
  }

  @Get('available')
  async getAvailableBins() {
    return this.binService.getAvailableBins();
  }

  @Get('unassigned-ingredients')
  async getUnassignedIngredients() {
    return this.binService.getUnassignedIngredients();
  }

  @Get('status')
  async getBinStatus() {
    return this.binService.getBinStatus();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.binService.update(id, body);
  }
}
