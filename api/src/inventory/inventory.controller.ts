import { Controller, Get, Param, Query } from '@nestjs/common';

import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('summary')
  getSummary(@Query('unit') unit?: string) {
    return this.inventoryService.getSummary(unit);
  }

  @Get('materials')
  getMaterials(@Query('unit') unit?: string) {
    return this.inventoryService.getMaterials(unit);
  }

  @Get('materials/:materialName/history')
  getMaterialHistory(
    @Param('materialName') materialName: string,
    @Query('supplierName') supplierName?: string
  ) {
    return this.inventoryService.getMaterialHistory(materialName, supplierName);
  }

  @Get('trend')
  getTrend(@Query('unit') unit?: string) {
    return this.inventoryService.getTrend(unit);
  }

  @Get('top-materials')
  getTopMaterials(@Query('unit') unit?: string) {
    return this.inventoryService.getTopMaterials(unit);
  }
}
