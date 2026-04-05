/**
 * Full seed — fills every empty table with realistic data.
 * Safe to re-run (uses upsert / findFirst guards).
 */
require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── helpers ────────────────────────────────────────────────────────────────
const dec = (n) => new Prisma.Decimal(n);
const 