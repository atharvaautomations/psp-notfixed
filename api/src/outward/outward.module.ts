import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { OutwardController } from './outward.controller';
import { OutwardService } from './outward.service';

@Module({
  imports: [ActivityLogModule],
  controllers: [OutwardController],
  providers: [OutwardService],
  exports: [OutwardService],
})
export class OutwardModule {}
