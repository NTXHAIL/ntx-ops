-- Estimate photos gain a slot (panel, misc, VIN, wheels, …), a caption,
-- and a panel code. Existing rows stay attached to the estimate as Misc photos.
ALTER TABLE "EstimatePhoto" ADD COLUMN "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EstimatePhoto" ADD COLUMN "slot" TEXT NOT NULL DEFAULT 'MISC';
ALTER TABLE "EstimatePhoto" ADD COLUMN "panelCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EstimatePhoto" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Optional custom name for a photo field (panel or documentation slot).
CREATE TABLE "EstimatePhotoField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estimateId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "panelCode" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EstimatePhotoField_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EstimatePhoto_estimateId_slot_panelCode_idx" ON "EstimatePhoto"("estimateId", "slot", "panelCode");
CREATE INDEX "EstimatePhotoField_estimateId_idx" ON "EstimatePhotoField"("estimateId");
CREATE UNIQUE INDEX "EstimatePhotoField_estimateId_slot_panelCode_key" ON "EstimatePhotoField"("estimateId", "slot", "panelCode");
