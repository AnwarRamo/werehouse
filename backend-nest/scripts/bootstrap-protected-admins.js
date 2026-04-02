require('dotenv/config');

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const ADMIN_PERMISSIONS = [
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
];

async function upsertProtectedUser(prisma, input) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: input.username, mode: 'insensitive' } },
        { email: { equals: input.email, mode: 'insensitive' } },
      ],
    },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    return prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        roleId: input.roleId,
        status: 'active',
      },
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      username: input.username,
      email: input.email,
      passwordHash,
      roleId: input.roleId,
      status: 'active',
    },
  });
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@warehouse.local').toLowerCase();
    const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'password123';

    const devUsername = (process.env.DEV_ADMIN_USERNAME || 'developer').toLowerCase();
    const devEmail = (process.env.DEV_ADMIN_EMAIL || 'developer@warehouse.local').toLowerCase();
    const devPassword = process.env.DEV_ADMIN_PASSWORD || 'DevAdmin@2026!';

    let adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          description: 'System administrator',
          permissions: ADMIN_PERMISSIONS,
        },
      });
    } else {
      const mergedPermissions = Array.from(
        new Set([...(adminRole.permissions || []), ...ADMIN_PERMISSIONS]),
      );

      if (mergedPermissions.length !== (adminRole.permissions || []).length) {
        adminRole = await prisma.role.update({
          where: { id: adminRole.id },
          data: { permissions: mergedPermissions },
        });
      }
    }

    const adminUser = await upsertProtectedUser(prisma, {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      roleId: adminRole.id,
    });

    const devUser = await upsertProtectedUser(prisma, {
      username: devUsername,
      email: devEmail,
      password: devPassword,
      roleId: adminRole.id,
    });

    console.log('Protected admins ensured.');
    console.log('admin:', { id: adminUser.id, username: adminUser.username, email: adminUser.email });
    console.log('developer:', { id: devUser.id, username: devUser.username, email: devUser.email });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
