-- Migration: Add notification and bin alert enhancements
-- Adds new NotificationType enum values, Notification fields, and Alert fields
-- Idempotent: safe to run on existing database

-- --------------------------------------------------
-- Add new enum values to NotificationType
-- --------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INWARD_ENTRY_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'INWARD_ENTRY_CREATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INWARD_ENTRY_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'INWARD_ENTRY_UPDATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OUTWARD_ENTRY_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'OUTWARD_ENTRY_CREATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OUTWARD_ENTRY_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'OUTWARD_ENTRY_UPDATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REQUISITION_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'REQUISITION_CREATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REQUISITION_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'REQUISITION_UPDATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REQUISITION_APPROVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'REQUISITION_APPROVED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REQUISITION_REJECTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'REQUISITION_REJECTED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REQUISITION_FULFILLED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'REQUISITION_FULFILLED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INGREDIENT_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'INGREDIENT_CREATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BIN_ASSIGNED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'BIN_ASSIGNED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BIN_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'BIN_UPDATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RECIPE_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'RECIPE_CREATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RECIPE_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'RECIPE_UPDATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WEIGHING_COMPLETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'WEIGHING_COMPLETED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRODUCTION_EXECUTION_STARTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'PRODUCTION_EXECUTION_STARTED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRODUCTION_EXECUTION_COMPLETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'PRODUCTION_EXECUTION_COMPLETED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'KNEADER_COMPLETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'KNEADER_COMPLETED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MIXING_COMPLETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'MIXING_COMPLETED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BIN_LOW_STOCK' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'BIN_LOW_STOCK';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BIN_CAPACITY_EXCEEDED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'BIN_CAPACITY_EXCEEDED';
  END IF;
END $$;

-- --------------------------------------------------
-- Add new columns to Notification table
-- --------------------------------------------------

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "module" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "severity" TEXT DEFAULT 'INFO';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "activityLogId" INT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSON;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "navigationRoute" TEXT;

-- Add foreign key for activityLogId if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Notification_activityLogId_fkey' AND table_name = 'Notification') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog"("id");
  END IF;
END $$;

-- --------------------------------------------------
-- Add new columns to Alert table for bin alerts
-- --------------------------------------------------

ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "binNumber" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "currentQuantity" DOUBLE PRECISION;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "thresholdQuantity" DOUBLE PRECISION;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "attemptedQuantity" DOUBLE PRECISION;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "qrId" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "performedBy" TEXT;

-- --------------------------------------------------
-- Add indexes
-- --------------------------------------------------

CREATE INDEX IF NOT EXISTS "Notification_module_idx" ON "Notification"("module");
CREATE INDEX IF NOT EXISTS "Notification_activityLogId_idx" ON "Notification"("activityLogId");
CREATE INDEX IF NOT EXISTS "Alert_binNumber_idx" ON "Alert"("binNumber");
