-- CreateTable
CREATE TABLE "OrderCake" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "cakeType" TEXT,
    "weight" TEXT,
    "customWeight" TEXT,
    "shape" TEXT,
    "floors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderCake_orderId_position_idx" ON "OrderCake"("orderId", "position");

-- AddForeignKey
ALTER TABLE "OrderCake" ADD CONSTRAINT "OrderCake_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn: hasPastry on Order
ALTER TABLE "Order" ADD COLUMN "hasPastry" BOOLEAN NOT NULL DEFAULT false;

-- Backfill cakes from existing per-cake columns
-- Cake 1: insert when any cake1 field is present and noCake = false
INSERT INTO "OrderCake" ("orderId", "position", "cakeType", "weight", "customWeight", "shape", "floors")
SELECT "id", 1, "cakeType", "weight", "customWeight", "shape", "floors"
FROM "Order"
WHERE COALESCE("noCake", false) = false
  AND (
    "cakeType" IS NOT NULL OR
    "weight"   IS NOT NULL OR
    "shape"    IS NOT NULL OR
    "floors"   IS NOT NULL
  );

-- Cake 2: insert when any cake2 field is present
INSERT INTO "OrderCake" ("orderId", "position", "cakeType", "weight", "customWeight", "shape", "floors")
SELECT "id", 2, "cake2Type", "cake2Weight", "cake2CustomWeight", "cake2Shape", "cake2Floors"
FROM "Order"
WHERE
  "cake2Type"   IS NOT NULL OR
  "cake2Weight" IS NOT NULL OR
  "cake2Shape"  IS NOT NULL OR
  "cake2Floors" IS NOT NULL;

-- Drop legacy cake columns and noCake flag
ALTER TABLE "Order"
  DROP COLUMN "noCake",
  DROP COLUMN "cakeType",
  DROP COLUMN "weight",
  DROP COLUMN "customWeight",
  DROP COLUMN "shape",
  DROP COLUMN "floors",
  DROP COLUMN "cake2Type",
  DROP COLUMN "cake2Weight",
  DROP COLUMN "cake2CustomWeight",
  DROP COLUMN "cake2Shape",
  DROP COLUMN "cake2Floors";
