require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
    });

    const adminRole = roles.find((r) => (r.name || '').toLowerCase() === 'admin');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        status: true,
      },
      take: 50,
    });

    const adminUsers = adminRole ? users.filter((u) => u.roleId === adminRole.id) : [];

    console.log(
      JSON.stringify(
        {
          adminRole,
          userCount: users.length,
          adminUsers,
          users,
        },
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
