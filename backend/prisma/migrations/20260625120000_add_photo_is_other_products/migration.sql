-- AlterTable
ALTER TABLE "Photo" ADD COLUMN "isOtherProducts" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UploadPhoto" ADD COLUMN "isOtherProducts" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "UploadPhoto_isOtherProducts_idx" ON "UploadPhoto"("isOtherProducts");
