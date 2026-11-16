import { Module } from '@nestjs/common';
import { InwardService } from './inward.service';
import { InwardController } from './inward.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  controllers: [InwardController],
  providers: [InwardService, PrismaService],
  imports: [ActivityLogModule],
  exports: [InwardService],
})
export class InwardModule {}
