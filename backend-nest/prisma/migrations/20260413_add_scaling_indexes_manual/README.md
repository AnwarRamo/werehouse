# 20260413_add_scaling_indexes_manual

This migration is manual by design.

Why manual:
- The target database already exists and has no Prisma migration history in this repository.
- `prisma migrate dev` can require reset on drifted environments, which is destructive.

How to apply safely:
1. Review `migration.sql`.
2. Apply with:

```bash
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260413_add_scaling_indexes_manual/migration.sql
```

Notes:
- All statements use `CREATE INDEX IF NOT EXISTS`.
- Re-running is safe (idempotent).