-- Migration: Add optional operator assignment to executions
-- Adds an execution-level operator relationship while keeping the existing
-- ExecutionSchedule operator assignment intact.
-- Idempotent: safe to run on existing databases.

ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "operatorId" INTEGER;

CREATE INDEX IF NOT EXISTS "Execution_operatorId_idx" ON "Execution"("operatorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Execution_operatorId_fkey'
      AND table_name = 'Execution'
  ) THEN
    ALTER TABLE "Execution"
      ADD CONSTRAINT "Execution_operatorId_fkey"
      FOREIGN KEY ("operatorId") REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
