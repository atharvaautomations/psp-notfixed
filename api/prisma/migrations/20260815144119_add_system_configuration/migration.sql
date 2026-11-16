-- CreateEnum
CREATE TYPE "SystemDeviceType" AS ENUM ('PLC', 'PRINTER', 'SERVER', 'CLIENT_PC', 'NETWORK_DEVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "SystemServiceType" AS ENUM ('BACKEND', 'FRONTEND', 'DATABASE', 'PLC_SERVICE', 'PRINTER_SERVICE', 'OTHER');

-- CreateTable
CREATE TABLE "SystemDevice" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SystemDeviceType" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER,
    "protocol" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemService" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SystemServiceType" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "healthPath" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemDevice_key_key" ON "SystemDevice"("key");

-- CreateIndex
CREATE INDEX "SystemDevice_type_idx" ON "SystemDevice"("type");

-- CreateIndex
CREATE INDEX "SystemDevice_enabled_idx" ON "SystemDevice"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SystemService_key_key" ON "SystemService"("key");

-- CreateIndex
CREATE INDEX "SystemService_type_idx" ON "SystemService"("type");

-- CreateIndex
CREATE INDEX "SystemService_enabled_idx" ON "SystemService"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");
