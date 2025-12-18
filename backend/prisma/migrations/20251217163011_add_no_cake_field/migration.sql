-- AlterTable
ALTER TABLE "Order" ADD COLUMN "noCake" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "cakeType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "weight" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "coating" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "decorType" DROP NOT NULL;


