-- AlterTable
ALTER TABLE "Order" ADD COLUMN "pickedUpByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickedUpByUserId_fkey" FOREIGN KEY ("pickedUpByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
