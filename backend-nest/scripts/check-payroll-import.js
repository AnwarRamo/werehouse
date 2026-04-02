require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [runs, items, lastRun] = await Promise.all([
      prisma.payrollRun.count(),
      prisma.payrollItem.count(),
      prisma.payrollRun.findFirst({ orderBy: { runDate: 'desc' } }),
    ]);

    console.log('runs', runs);
    console.log('items', items);
    console.log(
      'lastRun',
      lastRun
        ? {
            runId: lastRun.runId,
            totalEmployees: lastRun.totalEmployees,
            notes: lastRun.notes,
            runDate: lastRun.runDate,
          }
        : null,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
