# Implementation Roadmap & Checklist

---

## 📊 Project Summary

**Project**: Warehouse Management System (MERN Stack)  
**Database**: MongoDB (13 Collections)  
**Collections**: 13  
**Total Indexes**: 50+  
**Relationships**: 1:N (mostly), with audit trail  
**Estimated Implementation**: 6-8 weeks

---

## 🗂️ Collections Reference

| # | Collection | Purpose | Est. Docs | TTL |
|----|-----------|---------|-----------|-----|
| 1 | **employees** | Staff master data | 100-500 | None |
| 2 | **attendance_records** | Daily clock IN/OUT | 50K-500K | 3 years |
| 3 | **device_events** | Raw biometric logs | 100K-1M | 90 days |
| 4 | **devices** | Hardware machines | 5-20 | None |
| 5 | **payroll_runs** | Monthly pay cycles | 50-100 | 7+ years |
| 6 | **payroll_items** | Employee salary lines | 5K-10K | 7+ years |
| 7 | **products** | Apparel catalog | 500-5K | None |
| 8 | **stock_levels** | Inventory by location | 2K-10K | None |
| 9 | **roles** | RBAC permission groups | 5-10 | None |
| 10 | **users** | System accounts | 10-50 | None |
| 11 | **audit_logs** | Change history (immutable) | 500K-2M | 5+ years |
| 12 | **import_jobs** | Excel/CSV import tracking | 1K-5K | None |
| 13 | **settings** | Global config & rules | 20-50 | None |

---

## 🚀 Phase 1: Foundation (Week 1-2)

### 1.1 Database Setup
- [ ] Install MongoDB Community Edition
- [ ] Create `warehouse_system` database
- [ ] Create all 13 collections with validators
- [ ] Create all indexes (50+)
- [ ] Seed master data (roles, settings)

**Effort**: 2-3 days  
**Owner**: DevOps/DBA

### 1.2 Project Structure & Environment
- [ ] Initialize Node.js project (npm init)
- [ ] Install dependencies (Express, Mongoose, JWT, etc)
- [ ] Create `.env` for MongoDB connection string
- [ ] Set up git repository & .gitignore
- [ ] Configure ESLint & Prettier

**Effort**: 1 day  
**Owner**: Backend Lead

### 1.3 Core Models & Schemas
- [ ] Create Mongoose schemas for all 13 collections
- [ ] Add validation & pre-hooks
- [ ] Test schema creation & validation

**Effort**: 2-3 days  
**Owner**: Backend Developer

**Deliverable**: Ready-to-use MongoDB instance + Node project scaffold

---

## 🏃 Phase 2: Device Integration (Week 2-3)

### 2.1 Device Event Ingestion
- [ ] Create POST /api/devices/events endpoint
- [ ] Implement idempotency (composite key check)
- [ ] Add duplicate detection
- [ ] Error handling & logging

**Effort**: 2-3 days  
**Owner**: Backend Developer (API)

### 2.2 Event Normalization Job
- [ ] Create batch job for device_events → attendance_records
- [ ] Implement IN/OUT pairing logic
- [ ] Add late detection & computation
- [ ] Flag anomalies & unpaired events

**Effort**: 2-3 days  
**Owner**: Backend Developer (Jobs)

### 2.3 Anomaly Manager UI
- [ ] Create React component for unpaired events
- [ ] Manual IN/OUT pair override
- [ ] Delete fraudulent event capability
- [ ] Audit logging of overrides

**Effort**: 2-3 days  
**Owner**: Frontend Developer

**Deliverable**: Real-time device event pipeline working + manager review UI

---

## 💰 Phase 3: Payroll Engine (Week 3-4)

### 3.1 Payroll Run Management
- [ ] POST /api/payroll/runs (create monthly run)
- [ ] GET /api/payroll/runs/:id (details)
- [ ] Payroll calculation service (hours, deductions, net)
- [ ] Bulk payroll_items creation

**Effort**: 3-4 days  
**Owner**: Backend Developer (Payroll Service)

### 3.2 Payroll Approval Workflow
- [ ] POST /api/payroll/runs/:id/approve (manager)
- [ ] POST /api/payroll/runs/:id/finalize (finance)
- [ ] Audit logging at each stage
- [ ] Error handling & rollback

**Effort**: 2-3 days  
**Owner**: Backend Developer

### 3.3 Payroll UI Dashboard
- [ ] Monthly payroll overview
- [ ] Individual employee salary breakdown
- [ ] Approval & rejection workflows
- [ ] Export payroll report (PDF/Excel)

**Effort**: 3-4 days  
**Owner**: Frontend Developer

**Deliverable**: Complete payroll processing pipeline (calculation → approval → export)

---

## 📥 Phase 4: Excel Import System (Week 4-5)

### 4.1 Import API
- [ ] POST /api/import/:entity (file upload)
- [ ] CSV parser & header validation
- [ ] Row-by-row validation with error collection
- [ ] FK & unique constraint checks

**Effort**: 2-3 days  
**Owner**: Backend Developer (Import Service)

### 4.2 Bulk Operations
- [ ] Upsert logic (insert or update)
- [ ] Transactional operations (all-or-nothing)
- [ ] Partial success handling
- [ ] Error reporting with row/column precision

**Effort**: 2-3 days  
**Owner**: Backend Developer

### 4.3 Import UI & Monitoring
- [ ] File upload component
- [ ] Progress bar & live status
- [ ] Error table with row-level details
- [ ] GET /api/import/jobs/:jobId endpoint

**Effort**: 2-3 days  
**Owner**: Frontend Developer

**Deliverable**: End-to-end bulk import for Employees, Attendance, Products, Stock

---

## 📦 Phase 5: Inventory Management (Week 5-6)

### 5.1 Product & Stock APIs
- [ ] GET /api/products (list with filters)
- [ ] POST /api/products (create)
- [ ] GET /api/inventory/stock/:sku (by location)
- [ ] PUT /api/inventory/adjust (quantity update)

**Effort**: 2-3 days  
**Owner**: Backend Developer

### 5.2 Reorder & Alerts
- [ ] Scheduled job for reorder alerts
- [ ] GET /api/inventory/alerts (items below reorderLevel)
- [ ] Notification system (email/SMS)

**Effort**: 1-2 days  
**Owner**: Backend Developer

### 5.3 Inventory Dashboard
- [ ] Product catalog view
- [ ] Stock by location
- [ ] Reorder alerts
- [ ] Movement history (last IN/OUT)

**Effort**: 2-3 days  
**Owner**: Frontend Developer

**Deliverable**: Complete inventory tracking system

---

## 🔐 Phase 6: Security & RBAC (Week 6-7)

### 6.1 Authentication & JWT
- [ ] Login endpoint (POST /api/auth/login)
- [ ] Refresh token logic
- [ ] Logout (token blacklist)
- [ ] Password hashing (bcrypt)

**Effort**: 2-3 days  
**Owner**: Backend Developer (Auth)

### 6.2 RBAC Middleware
- [ ] Role-based route protection
- [ ] Permission checks at endpoint level
- [ ] Resource-level authorization (own data vs all)
- [ ] Audit logging of access

**Effort**: 2-3 days  
**Owner**: Backend Developer

### 6.3 Data Encryption
- [ ] TLS for all API calls
- [ ] Encrypt sensitive fields (passwordHash, PII)
- [ ] Key rotation strategy (if needed)

**Effort**: 1-2 days  
**Owner**: DevOps/Security

**Deliverable**: Secure authentication + authorization system

---

## 📊 Phase 7: Reporting & Analytics (Week 7-8)

### 7.1 Report APIs
- [ ] Attendance report (by employee/date/department)
- [ ] Payroll history export
- [ ] Device event logs
- [ ] Inventory movement report

**Effort**: 2-3 days  
**Owner**: Backend Developer (Reports Service)

### 7.2 Dashboard & Visualization
- [ ] Executive summary dashboard
- [ ] Attendance trends (line charts)
- [ ] Payroll statistics (pie charts)
- [ ] Inventory heatmap

**Effort**: 3-4 days  
**Owner**: Frontend Developer (Charts/Dashboards)

### 7.3 Export Functionality
- [ ] Export to PDF/Excel
- [ ] Scheduled report delivery (email)
- [ ] CSV download for third-party integrations

**Effort**: 2-3 days  
**Owner**: Backend Developer

**Deliverable**: Comprehensive reporting suite

---

## 🧪 Phase 8: Testing & Deployment (Week 8)

### 8.1 Unit Tests
- [ ] Models & validators
- [ ] Business logic (payroll formulas)
- [ ] Utility functions

**Effort**: 2-3 days  
**Owner**: QA / Backend Developers

### 8.2 Integration Tests
- [ ] API endpoint tests
- [ ] Database operations
- [ ] Import/Export workflows

**Effort**: 2-3 days  
**Owner**: QA Engineer

### 8.3 End-to-End Tests
- [ ] Full device→attendance→payroll flow
- [ ] Import with error scenarios
- [ ] RBAC & permissions

**Effort**: 2-3 days  
**Owner**: QA Engineer

### 8.4 Deployment
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging environment test
- [ ] Production deployment

**Effort**: 2-3 days  
**Owner**: DevOps Engineer

**Deliverable**: Tested, containerized, production-ready application

---

## 📋 Detailed Tasks Checklist

<details>
<summary><b>Phase 1: Foundation</b></summary>

- [ ] Install MongoDB Community Edition on server
- [ ] Create warehouse_system database
- [ ] Create collection: employees
- [ ] Create collection: attendance_records
- [ ] Create collection: devices
- [ ] Create collection: device_events
- [ ] Create collection: payroll_runs
- [ ] Create collection: payroll_items
- [ ] Create collection: products
- [ ] Create collection: stock_levels
- [ ] Create collection: roles
- [ ] Create collection: users
- [ ] Create collection: audit_logs
- [ ] Create collection: import_jobs
- [ ] Create collection: settings
- [ ] Create all indexes (attendance, devices, payroll, etc)
- [ ] Seed roles (admin, finance_manager, hr_manager, etc)
- [ ] Seed settings (grace_period, tax_rate, etc)
- [ ] Test MongoDB connection
- [ ] Initialize Node.js + Express project
- [ ] Install core dependencies (mongoose, express, joi, bcryptjs, jsonwebtoken)
- [ ] Create .env file with DATABASE_URL
- [ ] Initialize git repository
- [ ] Create project directory structure
- [ ] Setup ESLint & Prettier config

</details>

<details>
<summary><b>Phase 2: Device Integration</b></summary>

- [ ] Design POST /api/devices/events schema
- [ ] Create request validation (deviceId, employeeId, timestamp)
- [ ] Implement idempotency check (composite key)
- [ ] Create device_events service layer
- [ ] Insert device event into MongoDB
- [ ] Handle duplicate scenario
- [ ] Create error response format
- [ ] Add request logging
- [ ] Test with sample POST requests
- [ ] Create attendance normalization job
- [ ] Implement IN/OUT pairing algorithm
- [ ] Add late detection (compare to scheduledStart)
- [ ] Test pairing logic with sample data
- [ ] Create GET /api/attendance/anomalies endpoint
- [ ] Create React component: AnomalyManager
- [ ] Implement manual pair override
- [ ] Add delete fraudulent event capability
- [ ] Implement audit logging for overrides
- [ ] Test UI workflows

</details>

<details>
<summary><b>Phase 3: Payroll Engine</b></summary>

- [ ] Create Payroll service class
- [ ] Implement payroll calculation (basePay, deductions, net)
- [ ] Create POST /api/payroll/runs endpoint
- [ ] Implement payroll_run creation
- [ ] Create payroll_items for all employees
- [ ] Test calculations with sample data
- [ ] Create GET /api/payroll/runs/:id endpoint
- [ ] Create PUT /api/payroll/runs/:id/approve endpoint
- [ ] Add manager approval workflow
- [ ] Create PUT /api/payroll/runs/:id/finalize endpoint
- [ ] Add finance approval
- [ ] Implement audit logging for approvals
- [ ] Create React component: PayrollRuns list
- [ ] Create React component: PayrollRunDetail
- [ ] Create React component: PayrollItemBreakdown
- [ ] Implement approval workflow UI
- [ ] Add PDF export for payroll report
- [ ] Test end-to-end payroll processing

</details>

<details>
<summary><b>Phase 4: Excel Import System</b></summary>

- [ ] Install file upload library (multer)
- [ ] Create POST /api/import/:entity endpoint
- [ ] Implement CSV parser
- [ ] Add header validation
- [ ] Create validation rules for each entity
- [ ] Implement row-by-row validation
- [ ] Create error collection mechanism
- [ ] Add FK constraint checking
- [ ] Add unique constraint checking
- [ ] Implement upsert logic
- [ ] Create transaction wrapper
- [ ] Add partial success handling
- [ ] Create import_jobs document
- [ ] Implement GET /api/import/jobs/:jobId endpoint
- [ ] Add status polling (pending→processing→completed)
- [ ] Create React component: FileUpload
- [ ] Create React component: ImportProgress
- [ ] Create React component: ErrorReport
- [ ] Test import with sample CSV files

</details>

<details>
<summary><b>Phase 5: Inventory Management</b></summary>

- [ ] Create products service
- [ ] Create GET /api/products endpoint
- [ ] Implement product search/filter
- [ ] Create POST /api/products endpoint
- [ ] Create product creation validation
- [ ] Create stock_levels service
- [ ] Create GET /api/inventory/stock/:sku endpoint
- [ ] Create PUT /api/inventory/adjust endpoint
- [ ] Implement quantity update logic
- [ ] Add movement history tracking
- [ ] Create reorder alert job (scheduled daily)
- [ ] Implement GET /api/inventory/alerts endpoint
- [ ] Create notification service
- [ ] Create React component: ProductCatalog
- [ ] Create React component: StockByLocation
- [ ] Create React component: ReorderAlerts
- [ ] Implement movement history view
- [ ] Test inventory workflows

</details>

<details>
<summary><b>Phase 6: Security & RBAC</b></summary>

- [ ] Create POST /api/auth/login endpoint
- [ ] Implement password hashing (bcrypt)
- [ ] Generate JWT tokens
- [ ] Create POST /api/auth/refresh endpoint
- [ ] Implement token verification middleware
- [ ] Create POST /api/auth/logout endpoint
- [ ] Implement token blacklist
- [ ] Create RBAC middleware
- [ ] Implement resource-level authorization
- [ ] Add audit logging for all auth events
- [ ] Enable TLS for API (HTTPS)
- [ ] Encrypt sensitive fields in MongoDB
- [ ] Create key management strategy
- [ ] Test authentication flows
- [ ] Test RBAC enforcement
- [ ] Test permission denial scenarios

</details>

<details>
<summary><b>Phase 7: Reporting & Analytics</b></summary>

- [ ] Create attendance report service
- [ ] Create payroll history export
- [ ] Create device event log report
- [ ] Create inventory movement report
- [ ] Create React dashboard component
- [ ] Add attendance chart (line/bar)
- [ ] Add payroll statistics (pie chart)
- [ ] Add inventory heatmap
- [ ] Implement PDF export
- [ ] Implement Excel export
- [ ] Create scheduled report delivery (email)
- [ ] Test report generation
- [ ] Test export formats
- [ ] Test dashboard performance

</details>

<details>
<summary><b>Phase 8: Testing & Deployment</b></summary>

- [ ] Write unit tests for models
- [ ] Write unit tests for business logic
- [ ] Setup Jest/Mocha test framework
- [ ] Write integration tests for APIs
- [ ] Write integration tests for database ops
- [ ] Write E2E tests for critical flows
- [ ] Create test data factories
- [ ] Setup CI/CD pipeline (GitHub Actions)
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Setup production environment
- [ ] Run security audit
- [ ] Performance test (load testing)
- [ ] Backup testing
- [ ] Disaster recovery testing
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Setup monitoring & alerting
- [ ] Create runbooks & documentation

</details>

---

## 📈 Effort Estimation Summary

| Phase | Description | Duration | Team |
|-------|-------------|----------|------|
| 1 | Foundation & Setup | 2 weeks | 2 (DevOps, Backend) |
| 2 | Device Integration | 2 weeks | 2 (Backend, Frontend) |
| 3 | Payroll Engine | 2 weeks | 2 (Backend, Frontend) |
| 4 | Excel Import | 2 weeks | 2 (Backend, Frontend) |
| 5 | Inventory Mgmt | 2 weeks | 2 (Backend, Frontend) |
| 6 | Security & RBAC | 1.5 weeks | 2 (Backend, Security) |
| 7 | Reporting | 1.5 weeks | 2 (Backend, Frontend) |
| 8 | Testing & Deploy | 1 week | 3 (QA, DevOps, Backend) |
| **TOTAL** | **Complete System** | **~8 weeks** | **3-4 people** |

---

## 🎯 Success Criteria

- [ ] All 13 collections created with validators
- [ ] 50+ indexes created and performance validated
- [ ] Device events flowing successfully (0 duplicates)
- [ ] Attendance records properly paired (IN/OUT)
- [ ] Payroll calculations accurate within 0.01 precision
- [ ] Payroll approval workflow functional
- [ ] Excel imports handling errors gracefully
- [ ] Inventory tracking functional across locations
- [ ] RBAC enforcement at all endpoints
- [ ] Audit logs capturing all changes
- [ ] 90%+ code coverage in tests
- [ ] Performance: API response < 200ms P95
- [ ] System uptime: 99.5% (measured over 1 month)
- [ ] Zero security vulnerabilities (OWASP Top 10)
- [ ] Documentation complete (API, DB, UI)

---

## 🔗 Documentation Status

- [x] ERD Diagram (Mermaid)
- [x] Schema Design (JSON)
- [x] Setup Guide (MongoDB)
- [x] Data Flow Guide (Workflows)
- [ ] API Specification (OpenAPI/Swagger)
- [ ] Frontend Component Library
- [ ] Deployment Guide
- [ ] Operations Runbook
- [ ] Troubleshooting Guide

---

## 📞 Communication Plan

- **Daily Standup**: 10 AM (15 min) - Team sync
- **Weekly Review**: Friday 3 PM (30 min) - Demo + retrospective
- **Bi-weekly Stakeholder**: Every other Monday (30 min)
- **Escalation**: Direct to Tech Lead if blocked

---

## 🚨 Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Late device events | High | Add 2-hour grace window for OUT matching |
| Duplicate device events | High | Composite key idempotency + monitoring |
| Payroll calculation errors | Critical | Unit test all formulas + staged rollout |
| Import data quality | Medium | Validation framework + error reporting |
| RBAC bypasses | Critical | Security review + penetration testing |
| Database overload | Medium | Indexing + sharding plan + caching |
| Data loss | Critical | Daily backups + WAL archiving + testing |

---

## 📅 Timeline Gantt

```
Phase 1 (Weeks 1-2):  [Foundation Setup               ]
Phase 2 (Weeks 2-3):  [Device Integration        ]
Phase 3 (Weeks 3-4):  [Payroll Engine          ]
Phase 4 (Weeks 4-5):  [Excel Import      ]
Phase 5 (Weeks 5-6):  [Inventory Mgmt          ]
Phase 6 (Weeks 6-7):  [Security & RBAC   ]
Phase 7 (Weeks 7-8):  [Reporting      ]
Phase 8 (Week 8):     [Testing & Deploy]
```

---

**Project Status**: ✅ Design Complete  
**Next Phase**: Kick-off Development (Post Approval)  
**Last Updated**: March 28, 2026
