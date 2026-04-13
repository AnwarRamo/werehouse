-- Manual index migration
-- Reason: prisma migrate dev requires reset due drift on an existing database without migration history.
-- This script is idempotent and can be applied safely with prisma db execute.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "lockoutUntil" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_lockoutUntil_idx"
  ON "users" ("lockoutUntil");

CREATE INDEX IF NOT EXISTS "employees_status_createdAt_idx"
  ON "employees" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "employees_status_employeeId_idx"
  ON "employees" ("status", "employeeId");

CREATE INDEX IF NOT EXISTS "employees_department_status_createdAt_idx"
  ON "employees" ("department", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "devices_status_createdAt_idx"
  ON "devices" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "devices_location_status_createdAt_idx"
  ON "devices" ("location", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "attendance_records_employeeId_date_timestamp_idx"
  ON "attendance_records" ("employeeId", "date", "timestamp");

CREATE INDEX IF NOT EXISTS "attendance_records_date_idx"
  ON "attendance_records" ("date");

CREATE INDEX IF NOT EXISTS "attendance_records_employeeId_type_date_idx"
  ON "attendance_records" ("employeeId", "type", "date");

CREATE INDEX IF NOT EXISTS "attendance_records_type_date_idx"
  ON "attendance_records" ("type", "date");

CREATE INDEX IF NOT EXISTS "products_status_createdAt_idx"
  ON "products" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "products_category_status_createdAt_idx"
  ON "products" ("category", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "payroll_runs_runDate_idx"
  ON "payroll_runs" ("runDate");

CREATE INDEX IF NOT EXISTS "payroll_runs_status_runDate_idx"
  ON "payroll_runs" ("status", "runDate");

CREATE INDEX IF NOT EXISTS "payroll_runs_approvalStatus_runDate_idx"
  ON "payroll_runs" ("approvalStatus", "runDate");

CREATE INDEX IF NOT EXISTS "payroll_runs_periodStart_idx"
  ON "payroll_runs" ("periodStart");

CREATE INDEX IF NOT EXISTS "payroll_runs_periodStart_periodEnd_idx"
  ON "payroll_runs" ("periodStart", "periodEnd");

CREATE INDEX IF NOT EXISTS "payroll_items_employeeId_createdAt_idx"
  ON "payroll_items" ("employeeId", "createdAt");

CREATE INDEX IF NOT EXISTS "employee_advances_employeeId_issueDate_idx"
  ON "employee_advances" ("employeeId", "issueDate");

CREATE INDEX IF NOT EXISTS "employee_advances_employeeId_remainingAmount_idx"
  ON "employee_advances" ("employeeId", "remainingAmount");

CREATE INDEX IF NOT EXISTS "deleted_record_history_entityType_restoredAt_deletedAt_idx"
  ON "deleted_record_history" ("entityType", "restoredAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "employee_bonuses_employeeId_period_idx"
  ON "employee_bonuses" ("employeeId", "period");

CREATE INDEX IF NOT EXISTS "employee_bonuses_period_createdAt_idx"
  ON "employee_bonuses" ("period", "createdAt");
