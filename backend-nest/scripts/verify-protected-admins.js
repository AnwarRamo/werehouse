require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: [
            (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
            (process.env.DEV_ADMIN_USERNAME || 'developer').toLowerCase(),
          ],
        },
      },
      include: { role: true },
      orderBy: { username: 'asc' },
    });

    console.log(
      JSON.stringify(
        users.map((u) => ({
          username: u.username,
          email: u.email,
          status: u.status,
          role: u.role?.name || null,
        })),
        null,
        2,
      ),
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
