# Warehouse Backend (NestJS)

## Quick Start
1. npm install
2. npm run start:dev

Server default:
- http://localhost:5001
- API prefix: /api

Health:
- GET /api/health

Default bootstrap admin (created automatically):
- username: admin
- password: password123

## Database Configuration
This project is now in a phased migration to SQL.

- SQL (PostgreSQL + TypeORM): auth, employees, devices
- MongoDB (Mongoose): attendance, payroll, inventory, imports

Note: Imports still reads MongoDB collections for employee/product/role import flows.

Create a .env file in backend-nest and set:

- PORT=5001
- JWT_SECRET=change_me
- JWT_EXPIRE=24h
- DATABASE_URL=postgres://postgres:postgres@localhost:5432/warehouse_system
- DB_SYNCHRONIZE=true
- MONGODB_URI=mongodb://localhost:27017/warehouse_system

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
