import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { NotificationModule } from '../notification/notification.module';
import { OutwardController } from './outward.controller';
import { OutwardService } from './outward.service';

@Module({
  imports: [ActivityLogModule, NotificationModule],
  controllers: [OutwardController],
  providers: [OutwardService],
  exports: [OutwardService],
})
export class OutwardModule {}
