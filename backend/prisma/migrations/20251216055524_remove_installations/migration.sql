-- Drop InstallationConfig table first (has foreign keys)
DROP TABLE IF EXISTS "InstallationConfig";

-- Remove installationId column from Order table
ALTER TABLE "Order" DROP COLUMN IF EXISTS "installationId";

-- Remove installationId column from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "installationId";

-- Drop Installation table
DROP TABLE IF EXISTS "Installation";