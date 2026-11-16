import { Controller, Get, Param } from '@nestjs/common';
import { QrPreviewService } from './qr-preview.service';

@Controller('qr-preview')
export class QrPreviewController {
  constructor(private readonly qrPreviewService: QrPreviewService) {}

  @Get(':qrId')
  findByQrId(@Param('qrId') qrId: string) {
    return this.qrPreviewService.findByQrId(qrId);
  }
}
