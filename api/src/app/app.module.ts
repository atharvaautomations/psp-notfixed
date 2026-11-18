import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InwardModule } from '../inward/inward.module';
import { OutwardModule } from '../outward/outward.module';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { BinsModule } from '../bins/bins.module';
import { ProductionModule } from '../production/production.module';
import { RecipeModule } from '../recipe/recipe.module';
import { PrinterModule } from '../printer/printer.module';
import { ExecutionModule } from '../execution/execution.module';
import { ScannerModule } from '../scanner/scanner.module';
import { WeighingModule } from '../bulk-weighing/weighing.module';
import { KneaderModule } from '../kneader/kneader.module';
import { MixingModule } from '../mixing/mixing.module';
import { QcModule } from '../qc/qc.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { InventoryModule } from '../inventory/inventory.module';
import { QrPreviewModule } from '../qr-preview/qr-preview.module';
import { SystemStatusModule } from '../system-status/system-status.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

import { ActivityLogModule } from '../activity-log/activity-log.module';
import { RequisitionModule } from '../requisition/requisition.module';
import { AlertModule } from '../alerts/alert.module';

@Module({
  imports: [
    PrismaModule,
    ActivityLogModule,
    RequisitionModule,
    AlertModule,
    InwardModule,
    OutwardModule,
    IngredientsModule,
    BinsModule,
    ProductionModule,
    RecipeModule,
    PrinterModule,
    ExecutionModule,
    ScannerModule,
    WeighingModule,
    KneaderModule,
    MixingModule,
    QcModule,
    AuthModule,
    UsersModule,
    SystemConfigModule,
    InventoryModule,
    QrPreviewModule,
    SystemStatusModule,
    SchedulingModule,
  ],
})
export class AppModule {}
