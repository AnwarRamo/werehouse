# Warehouse Backend (NestJS)

## Quick Start
1. npm install
2. copy `.env.example` to `.env`
3. npm run dev

Alternative (if PostgreSQL/Redis already run on your machine):
- npm run start:dev

Server default:
- http://localhost:5001
- API prefix: /api

Health:
- GET /api/health

Default bootstrap admin (created automatically):
- username: admin
- password: password123

## Database Configuration
This backend uses SQL only.

- SQL (PostgreSQL + Prisma): auth, employees, devices, attendance, payroll, inventory, imports
- File-based CSV/XLSX imports are handled without MongoDB dependencies.

Create a .env file in backend-nest and set:

- PORT=5001
- JWT_SECRET=change_me
- JWT_EXPIRE=24h
- DATABASE_URL=postgres://postgres:postgres@localhost:5432/warehouse_system
- REDIS_URL=redis://127.0.0.1:6379

## Useful Commands
- `npm run dev` starts PostgreSQL + Redis (Docker) then runs API in watch mode.
- `npm run infra:up` starts PostgreSQL + Redis only.
- `npm run infra:down` stops local infrastructure containers.
- `npm run start:dev` runs the API only.

## Implemented Modules
- auth
- employees
- devices
- attendance
- payroll
- inventory
- imports
- health

## Related Arabic Migration Guide
See:
- ../docs/NEST_MIGRATION_AR.md

## Documentation Map

- Core backend explanation (Arabic): `docs/BACKEND_EXPLAINED_AR.md`
- Backend comparison (Arabic): `docs/AR_BACKEND_COMPARISON.md`
- Postman assets and checklist: `docs/postman/`
	- `docs/postman/postman.nest.collection.json`
	- `docs/postman/postman.nest.environment.json`
	- `docs/postman/postman.nest.ready.environment.json`
	- `docs/postman/POSTMAN_ROUTE_TEST_CHECKLIST.md`
- CSV sample files for imports: `docs/samples/`
	- `docs/samples/employees.csv`
	- `docs/samples/products.csv`
- Deployment runbook: `docs/operations/DEPLOYMENT_RUNBOOK.md`

## Docker

### Run With Docker Compose (API + PostgreSQL)
From this folder:

1. Build and start:
	- `docker compose up --build -d`
2. Check logs:
	- `docker compose logs -f api`
3. Health check:
	- `GET http://localhost:5001/api/health`
4. Stop:
	- `docker compose down`

The API container runs Prisma schema sync on startup:
- `npx prisma db push`

### Build Image Only
1. `docker build -t warehouse-backend:latest .`
2. `docker run --rm -p 5001:5001 --env-file .env warehouse-backend:latest`

### Push To Docker Hub
1. `docker login`
2. `docker tag warehouse-backend:latest <dockerhub-username>/warehouse-backend:latest`
3. `docker push <dockerhub-username>/warehouse-backend:latest`
