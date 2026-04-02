require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {
      description: 'System administrator',
      permissions: [
        'view_employees',
        'edit_employees',
        'delete_employees',
        'view_devices',
        'manage_devices',
        'manage_users',
        'manage_roles',
        'view_attendance',
        'edit_attendance',
        'view_payroll',
        'run_payroll',
        'approve_payroll',
        'view_inventory',
        'edit_inventory',
        'view_imports',
        'run_imports',
      ],
    },
    create: {
      name: 'admin',
      description: 'System administrator',
      permissions: [
        'view_employees',
        'edit_employees',
        'delete_employees',
        'view_devices',
        'manage_devices',
        'manage_users',
        'manage_roles',
        'view_attendance',
        'edit_attendance',
        'view_payroll',
        'run_payroll',
        'approve_payroll',
        'view_inventory',
        'edit_inventory',
        'view_imports',
        'run_imports',
      ],
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'staff' },
    update: {
      description: 'Standard warehouse staff',
      permissions: [
        'view_employees',
        'view_devices',
        'view_attendance',
        'view_payroll',
        'view_inventory',
      ],
    },
    create: {
      name: 'staff',
      description: 'Standard warehouse staff',
      permissions: [
        'view_employees',
        'view_devices',
        'view_attendance',
        'view_payroll',
        'view_inventory',
      ],
    },
  });

  await prisma.employee.upsert({
    where: { employeeId: 'EMP900001' },
    update: {
      name: 'Demo Employee',
      email: 'demo.employee@warehouse.local',
      hourlyRate: new Prisma.Decimal(18.5),
      currency: 'SYP',
      department: 'Warehouse',
      roleId: staffRole.id,
      status: 'active',
      scheduledStart: '08:00',
      scheduledEnd: '16:00',
    },
    create: {
      employeeId: 'EMP900001',
      name: 'Demo Employee',
      email: 'demo.employee@warehouse.local',
      hourlyRate: new Prisma.Decimal(18.5),
      currency: 'SYP',
      department: 'Warehouse',
      roleId: staffRole.id,
      status: 'active',
      scheduledStart: '08:00',
      scheduledEnd: '16:00',
    },
  });

  await prisma.device.upsert({
    where: { deviceId: 'DEV900001' },
    update: {
      name: 'Demo Device',
      location: 'Main Gate',
      model: 'ZK Teco',
      ip: '192.168.1.10',
      port: 4370,
      status: 'active',
      lastSync: new Date(),
    },
    create: {
      deviceId: 'DEV900001',
      name: 'Demo Device',
      location: 'Main Gate',
      model: 'ZK Teco',
      ip: '192.168.1.10',
      port: 4370,
      status: 'active',
      lastSync: new Date(),
    },
  });

  const product = await prisma.product.upsert({
    where: { sku: 'SKU-TEST-001' },
    update: {
      name: 'Demo Product',
      category: 'General',
      unitPrice: new Prisma.Decimal(100),
      costPrice: new Prisma.Decimal(70),
      reorderLevel: 10,
      status: 'active',
    },
    create: {
      sku: 'SKU-TEST-001',
      name: 'Demo Product',
      category: 'General',
      unitPrice: new Prisma.Decimal(100),
      costPrice: new Prisma.Decimal(70),
      reorderLevel: 10,
      status: 'active',
    },
  });

  await prisma.stockLevel.upsert({
    where: { sku_location: { sku: product.sku, location: 'A1' } },
    update: {
      quantity: 50,
      reserved: 5,
      available: 45,
    },
    create: {
      sku: product.sku,
      location: 'A1',
      quantity: 50,
      reserved: 5,
      available: 45,
    },
  });

  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  const attendanceExists = await prisma.attendanceRecord.findFirst({
    where: {
      employeeId: 'EMP900001',
      date,
      type: 'IN',
    },
  });

  if (!attendanceExists) {
    await prisma.attendanceRecord.create({
      data: {
        employeeId: 'EMP900001',
        timestamp: today,
        type: 'IN',
        deviceId: 'DEV900001',
        location: 'Main Gate',
        source: 'seed',
        verified: true,
        notes: 'Seeded attendance record',
        date,
      },
    });
  }

  const run = await prisma.payrollRun.upsert({
    where: { runId: 'PAY-DEMO-2026-04' },
    update: {
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2026-04-30'),
      periodType: 'monthly',
      status: 'draft',
      approvalStatus: 'pending',
      totalEmployees: 1,
      totalGrossPay: new Prisma.Decimal(2960),
      totalDeductions: new Prisma.Decimal(236.8),
      totalNetPay: new Prisma.Decimal(2723.2),
      currency: 'SYP',
      notes: 'Seed payroll run',
    },
    create: {
      runId: 'PAY-DEMO-2026-04',
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2026-04-30'),
      periodType: 'monthly',
      runBy: null,
      status: 'draft',
      approvalStatus: 'pending',
      totalEmployees: 1,
      totalGrossPay: new Prisma.Decimal(2960),
      totalDeductions: new Prisma.Decimal(236.8),
      totalNetPay: new Prisma.Decimal(2723.2),
      currency: 'SYP',
      notes: 'Seed payroll run',
    },
  });

  await prisma.payrollItem.upsert({
    where: {
      payrollRunId_employeeId: {
        payrollRunId: run.id,
        employeeId: 'EMP900001',
      },
    },
    update: {
      employeeName: 'Demo Employee',
      department: 'Warehouse',
      hoursWorked: new Prisma.Decimal(160),
      hourlyRate: new Prisma.Decimal(18.5),
      grossPay: new Prisma.Decimal(2960),
      totalDeductions: new Prisma.Decimal(236.8),
      netPay: new Prisma.Decimal(2723.2),
      anomalies: [],
    },
    create: {
      payrollRunId: run.id,
      employeeId: 'EMP900001',
      employeeName: 'Demo Employee',
      department: 'Warehouse',
      hoursWorked: new Prisma.Decimal(160),
      hourlyRate: new Prisma.Decimal(18.5),
      grossPay: new Prisma.Decimal(2960),
      totalDeductions: new Prisma.Decimal(236.8),
      netPay: new Prisma.Decimal(2723.2),
      anomalies: [],
    },
  });

  await prisma.importJob.upsert({
    where: { jobId: 'IMP-DEMO-001' },
    update: {
      entity: 'employees',
      fileName: 'demo-employees.csv',
      uploadedBy: 'seed-script',
      status: 'completed',
      totalRows: 1,
      successRows: 1,
      errorRows: 0,
      errors: [],
    },
    create: {
      jobId: 'IMP-DEMO-001',
      entity: 'employees',
      fileName: 'demo-employees.csv',
      uploadedBy: 'seed-script',
      status: 'completed',
      totalRows: 1,
      successRows: 1,
      errorRows: 0,
      errors: [],
    },
  });

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
  };

  console.log('Seed complete. Current row counts:');
  for (const [key, value] of Object.entries(counts)) {
    console.log(`- ${key}: ${value}`);
  }

  console.log(`Admin role id: ${adminRole.id}`);
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
