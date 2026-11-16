import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({
  imports: [ActivityLogModule],
  controllers: [ProductionController],
  providers: [ProductionService, PrismaService],
  exports: [ProductionService],
})
export class ProductionModule {}
