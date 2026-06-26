-- CreateTable
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadPhoto" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "uploadSessionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT,
    "filename" TEXT NOT NULL,
    "isFoaieDeZahar" BOOLEAN NOT NULL DEFAULT false,
    "linkedPhotoId" TEXT,
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadSession_orderId_idx" ON "UploadSession"("orderId");

-- CreateIndex
CREATE INDEX "UploadPhoto_uploadSessionId_createdAt_idx" ON "UploadPhoto"("uploadSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadPhoto_linkedAt_idx" ON "UploadPhoto"("linkedAt");

-- CreateIndex
CREATE INDEX "UploadPhoto_isFoaieDeZahar_idx" ON "UploadPhoto"("isFoaieDeZahar");

-- AddForeignKey
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadPhoto" ADD CONSTRAINT "UploadPhoto_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadPhoto" ADD CONSTRAINT "UploadPhoto_linkedPhotoId_fkey" FOREIGN KEY ("linkedPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

