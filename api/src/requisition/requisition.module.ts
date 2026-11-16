import { Module } from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { RequisitionController } from './requisition.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { OutwardModule } from '../outward/outward.module';

@Module({
  controllers: [RequisitionController],
  providers: [RequisitionService, PrismaService],
  imports: [ActivityLogModule, OutwardModule],
  exports: [RequisitionService],
})
export class RequisitionModule {}
