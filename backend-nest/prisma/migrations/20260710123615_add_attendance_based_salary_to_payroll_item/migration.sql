/*
  Warnings:

  - Added the required column `attendanceBasedSalary` to the `payroll_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "attendance_records_type_date_idx";

-- DropIndex
DROP INDEX "employees_department_status_createdAt_idx";

-- DropIndex
DROP INDEX "payroll_items_employeeId_createdAt_idx";

-- DropIndex
DROP INDEX "payroll_items_employeeId_period_idx";

-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "attendanceBasedSalary" DECIMAL(14,2) NOT NULL;

-- CreateIndex
CREATE INDEX "payroll_items_payrollRunId_employeeId_idx" ON "payroll_items"("payrollRunId", "employeeId");

-- AddForeignKey
ALTER TABLE "employee_insurance" ADD CONSTRAINT "employee_insurance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE CASCADE ON UPDATE CASCADE;
