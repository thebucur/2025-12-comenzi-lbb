-- Add order column to control display ordering of config groups/items
ALTER TABLE "GlobalConfig" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

