import { Module } from '@nestjs/common';
import { QrPreviewController } from './qr-preview.controller';
import { QrPreviewService } from './qr-preview.service';

@Module({
  controllers: [QrPreviewController],
  providers: [QrPreviewService],
})
export class QrPreviewModule {}
