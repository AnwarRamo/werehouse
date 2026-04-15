-- Manual employee profile fields migration
-- Reason: add missing contact and HR lifecycle fields without destructive reset.

ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "mobile" TEXT;

ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "nationalId" TEXT;

ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "employmentStartDate" DATE;

ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "terminationDate" DATE;

CREATE UNIQUE INDEX IF NOT EXISTS "employees_nationalId_key"
  ON "employees" ("nationalId");
