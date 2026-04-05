/**
 * Seed script — loads spreadsheet data into the new payroll tables:
 *   employee_salaries, employee_advances, employee_insurance, employee_bonuses
 *
 * Run: node scripts/seed-payroll-data.js
 */
require('dotenv/config');

const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ---------------------------------------------------------------------------
// Data from spreadsheet
// ---------------------------------------------------------------------------

const SALARY_DATA = [
  { employeeId: 'EMP003', profession: 'Finance Manager', department: 'Administration', baseSalary: 750_000, responsibilityAllowance: 4_619_000, productionIncentive: 0, transportAllowance: 0 },
  { employeeId: 'EMP064', profession: 'Admin',           department: 'Administration', baseSalary: 750_000, responsibilityAllowance: 1_119_000, productionIncentive: 0, transportAllowance: 0 },
  { employeeId: 'EMP070', profession: 'Designer',        department: 'Administration', baseSalary: 750_000, responsibilityAllowance: 3_619_000, productionIncentive: 0, transportAllowance: 0 },
  { employeeId: 'EMP083', profession: 'Presser',         department: 'Packaging',      baseSalary: 750_000, responsibilityAllowance: 1_119_000, productionIncentive: 0, transportAllowance: 0 },
];

// Attendance deductions are derived from the Attendance (Calculated) tab
// delayMin, earlyDepMin, absenceDays, overtimeMin stored as attendance records
// Here we store the calculated deduction amounts in the salary table as overrides
// (the payroll engine will use these when present)

const ADVANCE_DATA = [
  { employeeId: 'EMP003', advanceType: 'salary',   totalAmount: 1_000_000, installmentAmount: 0, remainingAmount: 1_000_000, notes: null },
  { employeeId: 'EMP003', advanceType: 'clothing',  totalAmount: 140_000,   installmentAmount: 0, remainingAmount: 140_000,   notes: 'Penalties/Clothes' },
  { employeeId: 'EMP064', advanceType: 'salary',   totalAmount: 725_000,   installmentAmount: 0, remainingAmount: 725_000,   notes: null },
  { employeeId: 'EMP064', advanceType: 'clothing',  totalAmount: 108_500,   installmentAmount: 0, remainingAmount: 108_500,   notes: 'Penalties/Clothes' },
  { employeeId: 'EMP021', advanceType: 'clothing',  totalAmount: 100_000,   installmentAmount: 0, remainingAmount: 100_000,   notes: 'Penalties/Clothes - Nabil Sabasbi' },
];

const INSURANCE_DATA = [
  // Social security numbers and registration dates not provided in the sample —
  // placeholders used; update with real values when available.
  { employeeId: 'EMP003', insuranceSalary: 750_000, socialSecurityNumber: null, registrationDate: null },
  { employeeId: 'EMP064', insuranceSalary: 750_000, socialSecurityNumber: null, registrationDate: null },
  { employeeId: 'EMP070', insuranceSalary: 750_000, socialSecurityNumber: null, registrationDate: null },
  { employeeId: 'EMP083', insuranceSalary: 750_000, socialSecurityNumber: null, registrationDate: null },
];

const BONUS_DATA = [
  // No bonus/assistance amounts in the sample data — rows present with zero values
  { employeeId: 'EMP003', bonusAmount: 0, bonusReason: null, assistanceAmount: 0, period: '2026-04' },
  { employeeId: 'EMP064', bonusAmount: 0, bonusReason: null, assistanceAmount: 0, period: '2026-04' },
  { employeeId: 'EMP070', bonusAmount: 0, bonusReason: null, assistanceAmount: 0, period: '2026-04' },
  { employeeId: 'EMP083', bonusAmount: 0, bonusReason: null, assistanceAmount: 0, period: '2026-04' },
];

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedSalaries() {
  let upserted = 0;
  for (const row of SALARY_DATA) {
    await prisma.employeeSalary.upsert({
      where: { employeeId: row.employeeId },
      update: {
        profession: row.profession,
        baseSalary: new Prisma.Decimal(row.baseSalary),
        responsibilityAllowance: new Prisma.Decimal(row.responsibilityAllowance),
        productionIncentive: new Prisma.Decimal(row.productionIncentive),
        transportAllowance: new Prisma.Decimal(row.transportAllowance),
      },
      create: {
        employeeId: row.employeeId,
        profession: row.profession,
        baseSalary: new Prisma.Decimal(row.baseSalary),
        responsibilityAllowance: new Prisma.Decimal(row.responsibilityAllowance),
        productionIncentive: new Prisma.Decimal(row.productionIncentive),
        transportAllowance: new Prisma.Decimal(row.transportAllowance),
      },
    });
    upserted++;
  }
  console.log(`  employee_salaries: ${upserted} rows`);
}

async function seedAdvances() {
  // Advances are not unique per employee (multiple advances allowed),
  // so we only insert if no existing record with same employeeId + advanceType + totalAmount
  let inserted = 0;
  for (const row of ADVANCE_DATA) {
    const existing = await prisma.employeeAdvance.findFirst({
      where: {
        employeeId: row.employeeId,
        advanceType: row.advanceType,
        totalAmount: new Prisma.Decimal(row.totalAmount),
      },
    });
    if (!existing) {
      await prisma.employeeAdvance.create({
        data: {
          employeeId: row.employeeId,
          advanceType: row.advanceType,
          totalAmount: new Prisma.Decimal(row.totalAmount),
          installmentAmount: new Prisma.Decimal(row.installmentAmount),
          remainingAmount: new Prisma.Decimal(row.remainingAmount),
          notes: row.notes,
        },
      });
      inserted++;
    }
  }
  console.log(`  employee_advances: ${inserted} rows inserted`);
}

async function seedInsurance() {
  let upserted = 0;
  for (const row of INSURANCE_DATA) {
    await prisma.employeeInsurance.upsert({
      where: { employeeId: row.employeeId },
      update: {
        insuranceSalary: new Prisma.Decimal(row.insuranceSalary),
        socialSecurityNumber: row.socialSecurityNumber,
        registrationDate: row.registrationDate ? new Date(row.registrationDate) : null,
      },
      create: {
        employeeId: row.employeeId,
        insuranceSalary: new Prisma.Decimal(row.insuranceSalary),
        socialSecurityNumber: row.socialSecurityNumber,
        registrationDate: row.registrationDate ? new Date(row.registrationDate) : null,
      },
    });
    upserted++;
  }
  console.log(`  employee_insurance: ${upserted} rows`);
}

async function seedBonuses() {
  let inserted = 0;
  for (const row of BONUS_DATA) {
    const existing = await prisma.employeeBonus.findFirst({
      where: { employeeId: row.employeeId, period: row.period },
    });
    if (!existing) {
      await prisma.employeeBonus.create({
        data: {
          employeeId: row.employeeId,
          bonusAmount: new Prisma.Decimal(row.bonusAmount),
          bonusReason: row.bonusReason,
          assistanceAmount: new Prisma.Decimal(row.assistanceAmount),
          period: row.period,
        },
      });
      inserted++;
    }
  }
  console.log(`  employee_bonuses: ${inserted} rows inserted`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding payroll spreadsheet data...');
  await seedSalaries();
  await seedAdvances();
  await seedInsurance();
  await seedBonuses();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
