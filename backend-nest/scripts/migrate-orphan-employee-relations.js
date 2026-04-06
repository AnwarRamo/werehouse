const { Client } = require('pg');
const { randomUUID } = require('crypto');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS deleted_record_history (
        id uuid PRIMARY KEY,
        "entityType" text NOT NULL,
        "recordId" text NOT NULL,
        payload jsonb NOT NULL,
        "deletedBy" text,
        "deletedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "restoredBy" text,
        "restoredAt" timestamp(3)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS deleted_record_history_entity_record_idx
      ON deleted_record_history ("entityType", "recordId");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS deleted_record_history_entity_deleted_idx
      ON deleted_record_history ("entityType", "deletedAt");
    `);

    const orphanAdvances = await client.query(`
      SELECT a.id, to_jsonb(a) AS payload
      FROM employee_advances a
      LEFT JOIN employees e
        ON e."employeeId" = a."employeeId"
      WHERE e."employeeId" IS NULL;
    `);

    const orphanAttendance = await client.query(`
      SELECT a.id, to_jsonb(a) AS payload
      FROM attendance_records a
      LEFT JOIN employees e
        ON e."employeeId" = a."employeeId"
      WHERE e."employeeId" IS NULL;
    `);

    for (const row of orphanAdvances.rows) {
      await client.query(
        `
          INSERT INTO deleted_record_history (
            id,
            "entityType",
            "recordId",
            payload,
            "deletedBy"
          )
          VALUES ($1, $2, $3, $4, $5);
        `,
        [randomUUID(), 'advance', row.id, row.payload, 'system_migration'],
      );
    }

    for (const row of orphanAttendance.rows) {
      await client.query(
        `
          INSERT INTO deleted_record_history (
            id,
            "entityType",
            "recordId",
            payload,
            "deletedBy"
          )
          VALUES ($1, $2, $3, $4, $5);
        `,
        [randomUUID(), 'attendance', row.id, row.payload, 'system_migration'],
      );
    }

    const deletedAdvances = await client.query(`
      DELETE FROM employee_advances a
      WHERE NOT EXISTS (
        SELECT 1
        FROM employees e
        WHERE e."employeeId" = a."employeeId"
      );
    `);

    const deletedAttendance = await client.query(`
      DELETE FROM attendance_records a
      WHERE NOT EXISTS (
        SELECT 1
        FROM employees e
        WHERE e."employeeId" = a."employeeId"
      );
    `);

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          orphanAdvances: orphanAdvances.rowCount,
          orphanAttendance: orphanAttendance.rowCount,
          deletedAdvances: deletedAdvances.rowCount,
          deletedAttendance: deletedAttendance.rowCount,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
