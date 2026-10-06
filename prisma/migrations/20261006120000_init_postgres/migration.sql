-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ESTIMATOR');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('OPEN', 'PENDING', 'IN_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "DentSize" AS ENUM ('DIME', 'NICKEL', 'QUARTER', 'HALF_DOLLAR');

-- CreateEnum
CREATE TYPE "LineItemType" AS ENUM ('PDR_PANEL', 'OVERSIZED', 'LABOR', 'CUSTOM', 'CONVENTIONAL', 'REPLACE');

-- CreateEnum
CREATE TYPE "LaborRateType" AS ENUM ('HOURLY', 'FLAT');

-- CreateEnum
CREATE TYPE "OversizedKind" AS ENUM ('OS', 'DOS', 'OS_2X', 'OS_3X');

-- CreateEnum
CREATE TYPE "StormStatus" AS ENUM ('DETECTED', 'APPROVED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'BOOKED', 'ESTIMATED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "InsuranceAnswer" AS ENUM ('YES', 'NO', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('PHONE', 'TEXT', 'EMAIL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ESTIMATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phonePrimary" TEXT,
    "phoneSecondary" TEXT,
    "emailPrimary" TEXT,
    "emailSecondary" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" TEXT,
    "make" TEXT,
    "model" TEXT,
    "vin" TEXT,
    "bodyClass" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "insuranceCarrier" TEXT,
    "adjusterName" TEXT,
    "adjusterPhone" TEXT,
    "adjusterEmail" TEXT,
    "deductibleCents" INTEGER NOT NULL DEFAULT 0,
    "dateOfLoss" TIMESTAMP(3),
    "status" "ClaimStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "bodyStyle" TEXT NOT NULL DEFAULT 'CAR',
    "carrierId" TEXT NOT NULL DEFAULT 'state_farm',
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "claimId" TEXT,
    "createdById" TEXT NOT NULL,
    "pdrSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "markupCents" INTEGER NOT NULL DEFAULT 0,
    "oversizedCents" INTEGER NOT NULL DEFAULT 0,
    "laborCents" INTEGER NOT NULL DEFAULT 0,
    "customCents" INTEGER NOT NULL DEFAULT 0,
    "conventionalCents" INTEGER NOT NULL DEFAULT 0,
    "replaceCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLineItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "LineItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "panelCode" TEXT,
    "dentCount" INTEGER,
    "dentSize" "DentSize",
    "oversizedKind" "OversizedKind",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "matrixAmountCents" INTEGER,
    "markupCodesJson" TEXT NOT NULL DEFAULT '[]',
    "markupPercentApplied" INTEGER NOT NULL DEFAULT 0,
    "markupAmountCents" INTEGER NOT NULL DEFAULT 0,
    "laborRateId" TEXT,
    "laborTimeId" TEXT,
    "laborHours" DOUBLE PRECISION,
    "laborRateCents" INTEGER,
    "rateType" "LaborRateType",
    "usedCatalogRate" BOOLEAN NOT NULL DEFAULT false,
    "usedCatalogTime" BOOLEAN NOT NULL DEFAULT false,
    "rateOverridden" BOOLEAN NOT NULL DEFAULT false,
    "timeOverridden" BOOLEAN NOT NULL DEFAULT false,
    "auditNote" TEXT,
    "unitAmountCents" INTEGER NOT NULL DEFAULT 0,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "partsCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "EstimateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimatePhoto" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "slot" TEXT NOT NULL DEFAULT 'MISC',
    "panelCode" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimatePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimatePhotoField" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "panelCode" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimatePhotoField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdrMatrix" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL DEFAULT 'state_farm',
    "isStub" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PdrMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdrMatrixRow" (
    "id" TEXT NOT NULL,
    "matrixId" TEXT NOT NULL,
    "panelCode" TEXT NOT NULL,
    "panelLabel" TEXT NOT NULL,
    "minDents" INTEGER NOT NULL,
    "maxDents" INTEGER,
    "dimeCents" INTEGER NOT NULL,
    "nickelCents" INTEGER NOT NULL,
    "quarterCents" INTEGER NOT NULL,
    "halfDollarCents" INTEGER NOT NULL,

    CONSTRAINT "PdrMatrixRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkupRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MarkupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maxCombinedMarkupPercent" INTEGER NOT NULL DEFAULT 50,
    "oversizedOsCents" INTEGER NOT NULL DEFAULT 5000,
    "oversizedDosCents" INTEGER NOT NULL DEFAULT 10000,
    "oversizedTripleCents" INTEGER NOT NULL DEFAULT 15000,
    "nextEstimateSeq" INTEGER NOT NULL DEFAULT 1001,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LaborRateType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborTime" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "hours" DOUBLE PRECISION NOT NULL,
    "defaultRateId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LaborTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Storm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "states" TEXT NOT NULL,
    "peakHailInches" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "status" "StormStatus" NOT NULL DEFAULT 'DETECTED',
    "headline" TEXT,
    "offerText" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Storm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StormZip" (
    "id" TEXT NOT NULL,
    "stormId" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "maxHailInches" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StormZip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "stormId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "vehicleDamaged" BOOLEAN NOT NULL,
    "insurance" "InsuranceAnswer" NOT NULL,
    "vehicleYear" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vin" TEXT,
    "zip" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "preferredContact" "ContactMethod" NOT NULL,
    "photoPath" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "fbclid" TEXT,
    "gclid" TEXT,
    "smsConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentTextVersion" TEXT,
    "consentText" TEXT,
    "consentAt" TIMESTAMP(3),
    "consentIp" TEXT,
    "consentUserAgent" TEXT,
    "consentPageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_estimateNumber_key" ON "Estimate"("estimateNumber");

-- CreateIndex
CREATE INDEX "EstimatePhoto_estimateId_idx" ON "EstimatePhoto"("estimateId");

-- CreateIndex
CREATE INDEX "EstimatePhoto_estimateId_slot_panelCode_idx" ON "EstimatePhoto"("estimateId", "slot", "panelCode");

-- CreateIndex
CREATE INDEX "EstimatePhotoField_estimateId_idx" ON "EstimatePhotoField"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimatePhotoField_estimateId_slot_panelCode_key" ON "EstimatePhotoField"("estimateId", "slot", "panelCode");

-- CreateIndex
CREATE UNIQUE INDEX "PdrMatrix_carrierId_key" ON "PdrMatrix"("carrierId");

-- CreateIndex
CREATE INDEX "PdrMatrixRow_matrixId_panelCode_idx" ON "PdrMatrixRow"("matrixId", "panelCode");

-- CreateIndex
CREATE UNIQUE INDEX "MarkupRule_code_key" ON "MarkupRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Storm_slug_key" ON "Storm"("slug");

-- CreateIndex
CREATE INDEX "StormZip_stormId_idx" ON "StormZip"("stormId");

-- CreateIndex
CREATE UNIQUE INDEX "StormZip_stormId_zip_key" ON "StormZip"("stormId", "zip");

-- CreateIndex
CREATE INDEX "Lead_stormId_status_idx" ON "Lead"("stormId", "status");

-- CreateIndex
CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimatePhoto" ADD CONSTRAINT "EstimatePhoto_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimatePhotoField" ADD CONSTRAINT "EstimatePhotoField_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdrMatrixRow" ADD CONSTRAINT "PdrMatrixRow_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "PdrMatrix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborTime" ADD CONSTRAINT "LaborTime_defaultRateId_fkey" FOREIGN KEY ("defaultRateId") REFERENCES "LaborRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StormZip" ADD CONSTRAINT "StormZip_stormId_fkey" FOREIGN KEY ("stormId") REFERENCES "Storm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stormId_fkey" FOREIGN KEY ("stormId") REFERENCES "Storm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

