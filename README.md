# Warehouse Management System - MongoDB Schema Design

**MERN Stack Application** for Apparel Warehouse + Biometric Attendance + Payroll Management

---

## 📋 Overview

This project provides a complete database schema design for a comprehensive warehouse management system with:

- ✅ **Employee Management** - Staff records, roles, departments
- ✅ **Biometric Attendance** - Device integration, clock IN/OUT tracking, late detection
- ✅ **Payroll Processing** - Automated salary calculations with deductions, allowances
- ✅ **Inventory Management** - Multi-location stock tracking, product catalog
- ✅ **RBAC & Security** - Role-based access control, audit logging, immutable change history
- ✅ **Excel Import** - Bulk data import from Excel/CSV with validation and error handling

---

## 🗂️ Project Structure

```
warehouse-system/
├── schemas/
│   ├── employees.schema.json           # Employee master data
│   ├── attendance_records.schema.json   # Clock IN/OUT records
│   ├── devices_and_events.schema.json   # Biometric devices & raw logs
│   ├── payroll.schema.json              # Payroll runs & itemized payments
│   ├── inventory.schema.json            # Products & stock levels
│   └── support.schema.json              # Users, roles, audit logs, settings
├── docs/
│   ├── ERD.md                          # Entity Relationship Diagram with Mermaid
│   ├── SETUP.md                        # MongoDB setup and initialization
│   ├── API_SPECIFICATION.md            # REST API endpoints
│   └── DATA_FLOW.md                    # System data flow & integration
├── backend/                            # Node.js/Express backend (to be populated)
├── frontend/                           # React/Vue frontend (to be populated)
└── README.md                           # This file
```

---

## 📊 Collections Overview

| Collection | Purpose | Key Relationships |
|-----------|---------|------------------|
| **employees** | Staff master data | 1 → many attendance_records, payroll_items |
| **attendance_records** | Daily clock IN/OUT logs | FK: employeeId, FK: deviceId |
| **device_events** | Raw biometric events | FK: deviceId, FK: employeeId |
| **devices** | Biometric hardware | 1 → many device_events |
| **products** | Apparel catalog | 1 → many stock_levels |
| **stock_levels** | Quantity per location | FK: productId |
| **payroll_runs** | Monthly/weekly pay cycles | 1 → many payroll_items |
| **payroll_items** | Employee salary lines | FK: payrollRunId, FK: employeeId |
| **users** | System accounts | FK: roleId |
| **roles** | Permission groups | 1 → many users |
| **audit_logs** | Change history (immutable) | Tracks all entity modifications |
| **import_jobs** | Excel/CSV import tracking | Status, errors, row counts |
| **settings** | Global configuration | Business rules (grace period, tax rate, etc) |

---

## 🔄 Data Flow Architecture

```
Excel Files (Source Data)
    ↓
POST /api/import/:entity (Validation & Staging)
    ↓
import_jobs collection (Track progress)
    ↓
MongoDB Collections (Normalized)
    ├── Devices → deviceEvents → Attendance (Normalization)
    └── Products → StockLevels (Inventory)
    ↓
Background Jobs → Payroll Processing
    ├── Attendance aggregation
    ├── Hours calculation
    ├── Deduction & allowance application
    └── Payroll reports
    ↓
API Endpoints (REST / GraphQL)
    ↓
Frontend (React/Vue dashboards)
    ↓
Audit Logs (Immutable change trail)
```

---

## 💼 Key Workflows

### 1. **Attendance → Payroll Pipeline**

```
Device events (raw) 
  → Normalize to attendance_records (cleaned, paired IN/OUT)
  → Calculate hours_worked & minutes_late
  → Aggregate per employee per period
  → Execute payroll formulas
  → Generate payroll_items & payroll_runs
  → Audit log all changes
```

### 2. **Payroll Calculation Formula**

```
basePay = hoursWorked × hourlyRate
allowances = transportation + meal + bonuses
grossPay = basePay + allowances

latePenalty = max(minutesLate - gracePeriod, 0) × (hourlyRate / 60)
socialSecurity = grossPay × 5%  (configurable)
taxes = grossPay × taxRate%      (configurable)

totalDeductions = latePenalty + socialSecurity + taxes + other
netPay = grossPay - totalDeductions

Example: 158.75 hrs × $20/hr - $3.33 (10 min late) = $3,171.67
```

### 3. **Device Event Reconciliation**

```
Raw Event → Validate → Deduplicate → Match Pair → Normalize → Audit
  ↓          ↓           ↓            ↓            ↓            ↓
device_     Check       eventId/    IN→OUT      attendance_ audit_
events      FK refs     composite   same day    records      logs
                        key
```

### 4. **Multi-Location Inventory**

```
products (SKU master) → stock_levels (quantity per location)
  ↓
Reorder alerts: available < reorderLevel
  ↓
Purchase orders → Receiving → Inventory adjustment
  ↓
Audit trail of all movements
```

---

## 🔑 Critical Indexes for Performance

### High-Priority Indexes

```javascript
// Attendance queries (most frequent)
db.attendance_records.createIndex({ "employeeId": 1, "timestamp": -1 });
db.attendance_records.createIndex({ "date": 1, "employeeId": 1 });

// Device event reconciliation
db.device_events.createIndex({ "deviceId": 1, "timestamp": -1 });
db.device_events.createIndex({ "employeeId": 1, "timestamp": -1 });
db.device_events.createIndex({ "deviceId": 1, "employeeId": 1, "timestamp": 1, "direction": 1 }, { unique: true });

// Payroll lookups
db.payroll_items.createIndex({ "payrollRunId": 1, "employeeId": 1 }, { unique: true });
db.payroll_runs.createIndex({ "periodStart": 1, "periodEnd": 1 });

// Inventory queries
db.stock_levels.createIndex({ "sku": 1, "location": 1 }, { unique: true });

// Audit trail searches
db.audit_logs.createIndex({ "entity": 1, "entityId": 1 });
db.audit_logs.createIndex({ "timestamp": -1 });
```

---

## 🔐 Security & Compliance

### Authentication & Authorization (RBAC)

**Roles defined in `support.schema.json`:**

- **Admin**: Full system access
- **Finance Manager**: View/run/approve payroll
- **HR Manager**: Manage employees & imports
- **Warehouse Manager**: Inventory & devices
- **Staff**: View own data + shared catalog

### Audit Logging

Every record change (create, update, delete) logged to `audit_logs`:
- **Who**: userId of modifier
- **What**: entity type and ID
- **When**: timestamp
- **Why**: reason/notes
- **Old/New Value**: before and after state

### Encryption

- **In Transit**: TLS 1.3 for all API calls
- **At Rest**: MongoDB Enterprise encryption or application-level encryption for sensitive fields (passwordHash, sensitive PII)

### Data Retention

- **Attendance**: 3 years (regulatory requirement)
- **Payroll**: 7+ years (tax/compliance)
- **Device Events**: 90 days then archive
- **Audit Logs**: Indefinite (compliance)

---

## 📥 Excel Import Specification

### Template: Employees.csv

```csv
employeeId,name,email,hourlyRate,scheduledStart,scheduledEnd,department,roleId
EMP001,أحمد محمد,ahmad@company.local,25.50,09:00,17:00,Warehouse,ROLE_STAFF
EMP002,فاطمة علي,fatima@company.local,30.00,08:00,16:00,Admin,ROLE_HR
```

### Template: Attendance.csv

```csv
employeeId,timestamp,type,deviceId
EMP001,2026-03-01T09:05:00Z,IN,DEV001
EMP001,2026-03-01T17:30:00Z,OUT,DEV001
```

### Validation Rules

- Non-null required fields
- FK references must exist (e.g., employeeId in employees)
- Unique constraints enforced (e.g., sku in products)
- Data type validation (numeric, date, enum)
- Composite key uniqueness (e.g., sku+location in stock_levels)

### Import Endpoint

```bash
POST /api/import/employees
Content-Type: multipart/form-data

Form Data:
  file: employees.csv

Response:
{
  "jobId": "uuid",
  "status": "processing",
  "totalRows": 150,
  "successRows": 0,
  "errorRows": 0
}

GET /api/import/jobs/:jobId
Response:
{
  "jobId": "uuid",
  "status": "completed",
  "totalRows": 150,
  "successRows": 148,
  "errorRows": 2,
  "errors": [
    { "row": 5, "column": "hourlyRate", "error": "Must be positive decimal" },
    { "row": 12, "column": "roleId", "error": "Role not found" }
  ]
}
```

---

## 🚀 Getting Started

### 1. **Install MongoDB**

```bash
# Windows: Download MongoDB Community Edition
# https://www.mongodb.com/try/download/community

# macOS (Homebrew)
brew tap mongodb/brew && brew install mongodb-community

# Start MongoDB
mongod --dbpath /data/db
```

### 2. **Initialize Collections**

```bash
# Connect to MongoDB
mongo

# Switch to database
use warehouse_system

# Create collections (MongoDB will auto-create, but explicit is better)
db.createCollection("employees")
db.createCollection("attendance_records")
db.createCollection("devices")
db.createCollection("device_events")
# ... etc.
```

### 3. **Apply Validation Schemas**

See `docs/SETUP.md` for complete schema validation setup with `db.runCommand()`.

### 4. **Create Indexes**

Run all index creation commands listed in section above.

### 5. **Seed Master Data**

```bash
# Insert roles
db.roles.insertMany([
  { name: "admin", permissions: [...] },
  { name: "finance_manager", permissions: [...] },
  # ... etc.
])

# Insert settings
db.settings.insertMany([
  { key: "grace_period_minutes", value: 5, category: "attendance" },
  { key: "tax_rate_percent", value: 10, category: "payroll" },
  # ... etc.
])
```

---

## 📈 Scaling Considerations

### Sharding Strategy (if needed for high volume)

**By Employee ID** (recommended for payroll-heavy workload):
- Distribute attendance records and payroll items across shards
- Allows parallel processing of multiple employees

**By Date** (alternative, for time-series):
- Each shard holds one month's data
- Useful for archival and retention policies

### TTL Indexes (Automatic Data Expiration)

```javascript
// Auto-delete device_events after 90 days
db.device_events.createIndex(
  { "serverReceivedAt": 1 },
  { expireAfterSeconds: 7776000 }  // 90 days
);

// Trim audit logs older than 5 years
db.audit_logs.createIndex(
  { "timestamp": 1 },
  { expireAfterSeconds: 157680000 }  // 5 years
);
```

### Backup Strategy

```bash
# Daily backup
mongodump --db warehouse_system --out /backups/$(date +%Y%m%d)

# Restore from backup
mongorestore --db warehouse_system /backups/20260328/warehouse_system
```

---

## 📝 Schema Design Decisions

### 1. **Why Separate device_events and attendance_records?**

- **device_events**: Raw, immutable audit trail (never modified)
- **attendance_records**: Normalized, paired IN/OUT with derived fields (hoursWorked, minutesLate)
- Separation ensures data integrity and allows for reconciliation

### 2. **Why Decimal Type for Money?**

- Avoids floating-point precision errors (e.g., `0.1 + 0.2 ≠ 0.3` in float)
- MongoDB's `NumberDecimal` type necessary for financial calculations

### 3. **Why Denormalize employeeName in payroll_items?**

- Payroll is historical; employee name may change after run
- Denormalization ensures reports show accurate data at pay time
- Reduces JOIN complexity in reporting queries

### 4. **Why Multiple Indexes on timestamps?**

- Different query patterns: recent events, employee history, device logs
- Composite indexes optimize common WHERE clauses
- Indexes cost write performance, but read performance critical here

### 5. **Why Immutable audit_logs?**

- Compliance & legal hold requirements
- No deletes/updates (only inserts)
- Application layer prevents modification attempts

---

## 🔗 Related Documentation

- [ERD Diagram](docs/ERD.md) - Visual entity relationships (Mermaid)
- [Setup Guide](docs/SETUP.md) - MongoDB initialization & validation
- [API Specification](docs/API_SPECIFICATION.md) - REST endpoint definitions
- [Data Flow Guide](docs/DATA_FLOW.md) - System workflows & integration points

---

## 🛠️ Tech Stack

- **Database**: MongoDB 5.0+
- **Backend**: Node.js 18+, Express.js
- **Frontend**: React 18+ or Vue 3+
- **Auth**: JWT or OAuth 2.0
- **Deployment**: Docker, Kubernetes (optional)
- **CI/CD**: GitHub Actions or GitLab CI

---

## 📞 Support & Contribution

For issues, questions, or contributions:
1. Check the schema files in `schemas/` for detailed documentation
2. Review the `docs/` folder for guides
3. Inspect sample documents in each schema file for real-world examples

---

## 📄 License

[Your License Here]

---

**Last Updated**: March 28, 2026  
**Version**: 1.0.0 (Initial Release)  
**Status**: ✅ Schema Design Complete | ⏳ Backend Implementation Pending
