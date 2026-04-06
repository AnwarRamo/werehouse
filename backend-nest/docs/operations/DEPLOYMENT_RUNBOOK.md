# Backend Deployment Runbook

This runbook is for deploying the NestJS backend in production.

## 1. Current Readiness Status

- TypeScript config errors are resolved.
- `npm run build` passes.
- `docker compose config` passes.
- Docker image build is currently blocked locally because Docker engine is not running.

## 2. Prerequisites

- Docker Desktop (or Docker Engine) is installed and running.
- A production PostgreSQL and Redis endpoint (or use compose-managed services).
- A strong JWT secret.

## 3. Production Environment Checklist

Create a `.env.production` (or equivalent secret store) with at least:

```env
NODE_ENV=production
PORT=5001

JWT_SECRET=<strong-random-secret>
JWT_EXPIRE=24h
JWT_COOKIE_NAME=warehouse_access_token
JWT_COOKIE_SECURE=true
JWT_COOKIE_SAME_SITE=lax
JWT_COOKIE_MAX_AGE_MS=86400000

DATABASE_URL=postgresql://<user>:<password>@<host>:5432/warehouse_system?schema=public
REDIS_URL=redis://<host>:6379

CORS_ORIGIN=https://<your-frontend-domain>

ADMIN_USERNAME=<secure-admin-user>
ADMIN_EMAIL=<secure-admin-email>
ADMIN_BOOTSTRAP_PASSWORD=<strong-bootstrap-password>
```

## 4. Build and Tag Image

Run from backend root:

```powershell
Set-Location "c:/Users/anwar/Downloads/work/warehouse-system/backend-nest"
docker build -t warehouse-backend:prod .
docker tag warehouse-backend:prod <dockerhub-user>/warehouse-backend:prod
```

If needed, publish:

```powershell
docker login
docker push <dockerhub-user>/warehouse-backend:prod
```

## 5. Deploy with Docker Compose

Use one of these patterns.

### Option A: Build on server

```powershell
docker compose down
docker compose up --build -d
docker compose logs -f api
```

### Option B: Pull prebuilt image

Replace `api.build` with `api.image` in compose, then:

```powershell
docker compose pull
docker compose down
docker compose up -d
docker compose logs -f api
```

## 6. Post-Deploy Verification

```powershell
curl http://localhost:5001/api/health
```

Expected: HTTP 200 with healthy response.

Also verify:

- API container is running.
- Prisma schema push completed in startup logs.
- Auth login works with production credentials.

## 7. Rollback

If using tagged images:

```powershell
docker pull <dockerhub-user>/warehouse-backend:<previous-tag>
```

Update compose to previous tag, then:

```powershell
docker compose down
docker compose up -d
```

## 8. Known Risk

- `xlsx` has a reported high severity advisory with no upstream fix at the moment.
- Recommended mitigation now:
  - Only accept trusted import files.
  - Enforce strict file size limits and content validation before parse.
  - Restrict import endpoint access by role.
  - Monitor for upstream `xlsx` release and patch immediately.
