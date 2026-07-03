-- CreateTable
CREATE TABLE "payroll_receipts" (
    "id" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "payrollRunId" UUID,
    "isReceived" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" DATE,
    "receivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_receipts_employeeId_month_key" ON "payroll_receipts"("employeeId", "month");

-- CreateIndex
CREATE INDEX "payroll_receipts_month_idx" ON "payroll_receipts"("month");

-- CreateIndex
CREATE INDEX "payroll_receipts_payrollRunId_idx" ON "payroll_receipts"("payrollRunId");

-- CreateIndex
CREATE INDEX "payroll_receipts_month_isReceived_idx" ON "payroll_receipts"("month", "isReceived");

-- AddForeignKey
ALTER TABLE "payroll_receipts" ADD CONSTRAINT "payroll_receipts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_receipts" ADD CONSTRAINT "payroll_receipts_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
