import { Module } from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { RequisitionController } from './requisition.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { OutwardModule } from '../outward/outward.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  controllers: [RequisitionController],
  providers: [RequisitionService, PrismaService],
  imports: [ActivityLogModule, OutwardModule, NotificationModule],
  exports: [RequisitionService],
})
export class RequisitionModule {}
