-- Fix: PayrollInput override columns were declared NOT NULL DEFAULT 0.
-- Because they could never be NULL, application code doing
-- `input?.field ?? computedValue` always resolved to 0 the moment a
-- PayrollInput row existed for an employee/period — silently discarding
-- computed values from EmployeeBonus / EmployeeAdvance / EmployeePenalty /
-- attendance aggregation. This made these columns genuinely nullable so
-- "never touched" (NULL) is distinguishable from an explicit "0" override.

-- AlterTable: bonusAdjustment
ALTER TABLE "payroll_inputs" ALTER COLUMN "bonusAdjustment" DROP DEFAULT;
ALTER TABLE "payroll_inputs" ALTER COLUMN "bonusAdjustment" DROP NOT NULL;

-- AlterTable: penaltyAmount
ALTER TABLE "payroll_inputs" ALTER COLUMN "penaltyAmount" DROP DEFAULT;
ALTER TABLE "payroll_inputs" ALTER COLUMN "penaltyAmount" DROP NOT NULL;

-- AlterTable: advanceAmount
ALTER TABLE "payroll_inputs" ALTER COLUMN "advanceAmount" DROP DEFAULT;
ALTER TABLE "payroll_inputs" ALTER COLUMN "advanceAmount" DROP NOT NULL;

-- AlterTable: absenceDays
ALTER TABLE "payroll_inputs" ALTER COLUMN "absenceDays" DROP DEFAULT;
ALTER TABLE "payroll_inputs" ALTER COLUMN "absenceDays" DROP NOT NULL;

-- Data backfill: rows currently sitting at the untouched default (0) become
-- NULL. This is behavior-neutral (0 and NULL both currently fall back to the
-- computed value under the application-level workaround), but it lets a
-- genuine explicit-zero override be honored going forward.
UPDATE "payroll_inputs" SET "bonusAdjustment" = NULL WHERE "bonusAdjustment" = 0;
UPDATE "payroll_inputs" SET "penaltyAmount" = NULL WHERE "penaltyAmount" = 0;
UPDATE "payroll_inputs" SET "advanceAmount" = NULL WHERE "advanceAmount" = 0;
UPDATE "payroll_inputs" SET "absenceDays" = NULL WHERE "absenceDays" = 0;