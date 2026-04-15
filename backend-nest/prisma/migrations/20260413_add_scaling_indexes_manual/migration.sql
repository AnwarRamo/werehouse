-- Manual scaling index migration
-- Reason: preserve non-destructive workflow on existing DB without Prisma migration history.

CREATE INDEX IF NOT EXISTS "employees_name_idx"
  ON "employees" ("name");

CREATE INDEX IF NOT EXISTS "employees_createdAt_idx"
  ON "employees" ("createdAt");

CREATE INDEX IF NOT EXISTS "attendance_records_date_timestamp_idx"
  ON "attendance_records" ("date", "timestamp");

CREATE INDEX IF NOT EXISTS "products_createdAt_idx"
  ON "products" ("createdAt");

CREATE INDEX IF NOT EXISTS "import_jobs_uploadedAt_idx"
  ON "import_jobs" ("uploadedAt");