require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
async function main() {
  const counts = {
    roles: await prisma.role.count(),
    users: await prisma.user.count(),
    employees: await prisma.employee.count(),
    devices: await prisma.device.count(),
    attendance_records: await prisma.attendanceRecord.count(),
    products: await prisma.product.count(),
    stock_levels: await prisma.stockLevel.count(),
    payroll_runs: await prisma.payrollRun.count(),
    payroll_items: await prisma.payrollItem.count(),
    import_jobs: await prisma.importJob.count(),
    employee_salaries: await prisma.employeeSalary.count(),
    employee_advances: await prisma.employeeAdvance.count(),
    employee_insurance: await prisma.employeeInsurance.count(),
    employee_bonuses: await prisma.employeeBonus.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); await pool.end(); });
