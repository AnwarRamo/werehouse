# System Data Flow & Integration Guide

---

## 1. High-Level Architecture

```
┌─────────────────┐
│  Excel Source   │
│  (Employees,    │
│  Attendance,    │
│  Products, etc) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│    Import API Layer                     │
│  POST /api/import/:entity               │
│  - Validate                             │
│  - Stage                                │
│  - Report errors                        │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  MongoDB (Normalized Collections)       │
│  - employees                            │
│  - devices                              │
│  - products                             │
│  - ... (13 collections)                 │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Background Jobs & Scheduled Tasks                      │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Device Event Normalization (Real-time)           │   │
│ │ HR→ attendance_records reconciliation            │   │
│ └──────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Daily Attendance Aggregation (Scheduled 8 PM)    │   │
│ │ Pair IN/OUT → compute hours_worked              │   │
│ └──────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Payroll Processing (Monthly 1st)                 │   │
│ │ Aggregate hours → calculate pay → generate items │   │
│ └──────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Stock Reorder Alerts (Scheduled 6 AM)            │   │
│ │ Check available < reorderLevel → notify HR      │   │
│ └──────────────────────────────────────────────────┘   │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  REST API Layer                     │
│  - GET /api/employees/{id}          │
│  - PUT /api/attendance/{id}         │
│  - POST /api/payroll/approve        │
│  - GET /api/inventory/status        │
│  - ... (50+ endpoints)              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Frontend (React/Vue)               │
│  - Employee Dashboard               │
│  - Attendance Reports               │
│  - Payroll Management               │
│  - Inventory Tracking               │
│  - Admin Settings                   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Audit Logging                      │
│  Every change → audit_logs          │
│  (Immutable, compliance)            │
└─────────────────────────────────────┘
```

---

## 2. Core Workflows

### 2.1 Device Event → Attendance Record Pipeline

```
[Device]  device_events (raw)
   │
   │ POST /api/devices/events
   │ - eventId: uuid
   │ - deviceId: DEV001
   │ - employeeId: EMP001
   │ - timestamp: 2026-03-01T09:05:00Z
   │ - direction: IN
   ▼
┌─────────────────────────────────────┐
│ Validation & Deduplication          │
│ - Check employeeId exists           │
│ - Check deviceId exists             │
│ - Composite key: (dev, emp, ts, dir)│
│ - Mark duplicates                   │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Normalization (Real-time)           │
│ - Convert device TZ to UTC          │
│ - Store in device_events (status)   │
│ - Trigger pairing algorithm         │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Automated Pair Matching (Daily 8 PM)│
│ - Find IN at 09:05                  │
│ - Find OUT at 17:30 (same day)      │
│ - Compute: hoursWorked, minutesLate │
│ - Create attendance_record          │
│ - Flag unpaired events              │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Manager Review UI                   │
│ "5 unmatched events - review?"      │
│ - Manual override IF needed         │
│ - Pair IN→OUT manually              │
│ - Delete fraudulent events          │
└─────────────────────────────────────┘
   │
   ▼
[attendance_records] (finalized)
- employeeId: EMP001
- date: 2026-03-01
- hoursWorked: 8.42
- minutesLate: 5
- verified: true
```

### 2.2 Attendance → Payroll Pipeline

```
[attendance_records] (Daily)
   │
   │ Aggregate per employee
   │ - Group by employeeId
   │ - Sum hoursWorked
   │ - Max minutesLate
   │ - Count daysWorked
   ▼
┌─────────────────────────────────────┐
│ Payroll Run Creation (1st of month) │
│ - runId: PAY20260301                │
│ - periodStart: 2026-03-01           │
│ - periodEnd: 2026-03-31             │
│ - status: draft                     │
│ - runBy: user_id                    │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Payroll Item Calculation Per Employee│
│                                     │
│ 1. Fetch employee record            │
│    - hourlyRate: 25.00              │
│    - department: Warehouse          │
│                                     │
│ 2. Calculate base pay               │
│    basePay = 158.75 × 25.00 = ... │
│                                     │
│ 3. Add allowances                   │
│    allowances = 100.00 (configured) │
│    grossPay = basePay + allowances  │
│                                     │
│ 4. Calculate deductions             │
│    - latePenalty = (45 - 5) ×       │
│      (25 / 60) = 16.67              │
│    - socialSecurity = gross × 5%    │
│    - taxes = gross × 10%            │
│    - totalDeductions = sum          │
│                                     │
│ 5. Calculate net pay                │
│    netPay = grossPay - deductions   │
│                                     │
│ 6. Store in payroll_items           │
│ - payrollRunId: (ref payroll_runs)  │
│ - employeeId: EMP001                │
│ - hoursWorked, hourlyRate, ...      │
│ - grossPay, netPay                  │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Payroll Items Complete              │
│ - 42 employees processed            │
│ - Total Net Pay: 110,370.25 SYP     │
│ - Anomalies detected: 3             │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Manager Review (HR/Finance)         │
│ - Review anomalies                  │
│ - Approve specific items IF changes │
│ - Reject IF corrections needed      │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Finance Approval                    │
│ runId: PAY20260301                  │
│ - status: approved (by finance mgr) │
│ - approvalDate: 2026-04-01 14:00    │
│ - approvedBy: finance_user_id       │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Payment Processing                  │
│ - Generate bank transfer file       │
│ - Update status: paid               │
│ - Archive run                       │
│ - Log to audit_logs                 │
└─────────────────────────────────────┘
   │
   ▼
[Employees Paid]
```

### 2.3 Excel Import Workflow

```
[Excel File: employees.csv]
EmployeeID,Name,HourlyRate, ...
EMP001,أحمد,25.50, ...
EMP002,فاطمة,30.00, ...
... (150 rows)
   │
   ▼
┌─────────────────────────────────────┐
│ POST /api/import/employees          │
│ Content-Type: multipart/form-data   │
│ - file: employees.csv               │
│ - uploadedBy: user_id               │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Pre-validation (in-memory)          │
│ - Parse CSV header                  │
│ - Check required columns present    │
│ - Preview first 5 rows              │
│ - Report missing/invalid columns    │
└─────────────────────────────────────┘
   │
   ▼ (if valid)
┌─────────────────────────────────────┐
│ Create import_job (draft)           │
│ - jobId: uuid                       │
│ - entity: employees                 │
│ - fileName: employees.csv           │
│ - status: pending                   │
│ - totalRows: 150                    │
└─────────────────────────────────────┘
   │
   ▼ (background process starts)
┌─────────────────────────────────────┐
│ Row-by-Row Processing               │
│                                     │
│ For each row (1..150):              │
│  1. Parse values                    │
│  2. Validate:                       │
│     - Non-null required fields      │
│     - Data types (numeric, date)    │
│     - FK refs (roleId exists?)      │
│     - Unique constraints (dup ID?)  │
│                                     │
│  3. If valid:                       │
│     - Batch insert/upsert operation │
│     - Mark row: success             │
│                                     │
│  4. If invalid:                     │
│     - Record error:                 │
│       { row: 5, col: hourlyRate,   │
│         error: "Must be positive" } │
│     - Mark row: failed              │
│     - Continue                      │
│                                     │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Bulk Insert/Upsert                  │
│ db.employees.bulkWrite([            │
│   { insertOne: doc1 },              │
│   { updateOne: doc2 },              │
│   { insertOne: doc3 },              │
│   ...                               │
│ ])                                  │
│ - ordered: false (continue on error)│
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ Update import_job (completed)       │
│ - status: completed                 │
│ - successRows: 148                  │
│ - errorRows: 2                      │
│ - errors: [{ row, col, error }, ...]│
│ - completedAt: now                  │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│ API Response                        │
│ {                                   │
│   "jobId": "uuid",                  │
│   "status": "completed",            │
│   "successRows": 148,               │
│   "errorRows": 2,                   │
│   "errors": [                       │
│     { "row": 5, "col": "hourlyRate",│
│       "error": "Must be positive" } │
│   ]                                 │
│ }                                   │
└─────────────────────────────────────┘
   │
   ▼
[User Reviews Errors]
OR [Retries & Manual Fixes]
```

### 2.4 Device Event Deduplication

```
Multiple requests with same event (network retry):

Request 1: eventId="UUID-123", DEV001, EMP001, ts=09:05, direction=IN
  ▼
  [Inserted] device_events._1 = doc

Request 2 (retry): eventId="UUID-123", ... (identical)
  ▼
┌─────────────────────────────────────┐
│ Idempotency Check                   │
│ Composite key:                      │
│ (deviceId, employeeId, timestamp,   │
│  direction)                         │
│                                     │
│ Query existing:                     │
│  WHERE deviceId=DEV001              │
│    AND employeeId=EMP001            │
│    AND timestamp=09:05              │
│    AND direction=IN                 │
│                                     │
│ Result: Found matching doc          │
│ Decision: Skip insert, return OK    │
└─────────────────────────────────────┘

Request 3: (another retry)
  ▼ Same idempotency check, already exists
  ▼ Return OK (client thinks all succeeded)

Result: Only 1 attendance record created (not 3)
✅ Idempotency achieved
```

---

## 3. Database Operation Sequences

### Sequence 1: Daily Attendance Processing

```
Time: 20:00 (8 PM) - Automatic job trigger

Step 1: Query all device_events from today with status="pending"
  Query: device_events.find({
    status: "pending",
    timestamp: { $gte: 2026-03-01T00:00Z, $lte: 2026-03-01T23:59Z }
  })

Step 2: For each employee ID group:
  - Query all events (IN/OUT mixed)
  - Sort by timestamp ascending
  - Assume pattern: IN at start, OUT at end
  - If multiple IN/OUT, flag anomaly

Step 3: Create attendance_record for matched pairs:
  db.attendance_records.insertOne({
    employeeId: EMP001,
    timestamp: ...,
    type: "IN",  // Creates 2 records: IN and OUT
    ...
  })

Step 4: Update device_events status:
  db.device_events.updateMany(
    { _id: { $in: [eventId1, eventId2] } },
    { $set: { status: "processed", normalizedTo: attendance_record_id } }
  )

Step 5: Flag anomalies:
  device_events with no match → status="anomaly"
  Alert HR: "3 unpaired events found"

Step 6: Log all operations:
  db.audit_logs.insertMany([
    { entity: "attendance_records", action: "create", ... },
    { entity: "device_events", action: "update", ... },
  ])
```

### Sequence 2: Running Payroll

```
Date: 2026-04-01 08:00 - Finance initiates payroll

Step 1: Create payroll_run (draft)
  db.payroll_runs.insertOne({
    runId: "PAY20260301",
    periodStart: 2026-03-01T00:00Z,
    periodEnd: 2026-03-31T23:59Z,
    status: "processing",
    runBy: finance_user_id
  })

Step 2: Query employees (active)
  Query: employees.find({ status: "active" })
  Result: [EMP001, EMP002, EMP003, ..., EMP042]

Step 3: For each employee, calculate payroll
  FOR emp IN employees:
    a) Sum hours from attendance_records
       WHERE employeeId=emp AND date BETWEEN 2026-03-01 AND 2026-03-31
       SUM(hoursWorked) → hoursWorked

    b) Get hourlyRate from employee record

    c) Calculate basePay, allowances, deductions

    d) Create payroll_item:
       db.payroll_items.insertOne({
         payrollRunId: run_oid,
         employeeId: emp,
         hoursWorked: ...,
         grossPay: ...,
         netPay: ...,
         ...
       })

    e) Add to running totals

Step 4: Update payroll_run (completed)
  db.payroll_runs.updateOne(
    { _id: run_oid },
    { $set: {
      status: "completed",
      totalEmployees: 42,
      totalGrossPay: 125430.50,
      totalDeductions: 15060.25,
      totalNetPay: 110370.25
    } }
  )

Step 5: Notify finance manager
  "Payroll PAY20260301 ready for review"

Step 6: Log changes
  db.audit_logs.insertOne({
    entity: "payroll_run",
    action: "create",
    newValue: { runId, status, ... }
  })
```

---

## 4. Key Data Consistency Patterns

### Pattern 1: Atomicity in Payroll

```
Problem: What if system crashes mid-payroll?

Solution: Transactions (MongoDB 4.0+)

session = db.startSession()
session.startTransaction()

try {
  db.payroll_runs.insertOne(run_doc, { session })
  
  for each employee:
    db.payroll_items.insertOne(item_doc, { session })
    
  db.audit_logs.insertOne(log_doc, { session })
  
  session.commitTransaction()
} catch (e) {
  session.abortTransaction()
  throw e
}
```

### Pattern 2: Referential Integrity (via Application)

```
MongoDB doesn't support foreign key constraints natively.
Application layer ensures FK integrity:

Before inserting payroll_item:
  1. Verify employeeId exists in employees
  2. Verify payrollRunId exists in payroll_runs
  3. If not found, throw error

Before inserting device_event:
  1. Verify deviceId exists in devices
  2. Verify employeeId exists in employees
  3. If not found, mark for quarantine/manual review
```

### Pattern 3: Immutable Audit Logs

```
Rule: audit_logs are WRITE-ONCE, never updated/deleted

Enforcement:
  1. Application layer: No update/delete operations on audit_logs
  2. Database: No DELETE or UPDATE permissions for app user on audit_logs
  3. Monitoring: Alert if any attempted modification

Example:
  ✅ db.audit_logs.insertOne(log_doc)    // OK
  ❌ db.audit_logs.updateOne(...)        // Blocked
  ❌ db.audit_logs.deleteOne(...)        // Blocked
```

---

## 5. Error Handling & Recovery

### Error: Device Event Duplicate

```
Error Condition:
  Composite key (deviceId, emp, ts, dir) violation

Handling:
  1. Check if eventId already in device_events
  2. If yes:
     a) Compare quality scores
     b) Keep higher quality record
     c) Mark lower as duplicate_of
  3. If no but composite key exists:
     a) Likely timing issue (timestamps in ms)
     b) Flag for manual review
```

### Error: Unpaired Attendance Event

```
Problem: Employee clocked IN but no OUT

Scenarios:
  1. Day not finished (time <= shift end + 2 hours)
     → Hold until next day processing
  
  2. Day finished, still no OUT
     → Alert manager: "Check if left building"
     → Options: Manual OUT, delete IN, merge with next day

  3. OUT found but device recorded late/duplicate
     → Anomaly queue for manager review
```

### Error: Import Validation Failure

```
Row #5: hourlyRate="invalid"

Response:
  {
    "jobId": "uuid",
    "status": "partial",
    "successRows": 4,
    "errorRows": 1,
    "errors": [
      {
        "row": 5,
        "column": "hourlyRate",
        "value": "invalid",
        "error": "Must be numeric decimal"
      }
    ]
  }

User Action:
  - Fix source Excel
  - Re-import entire file OR just row 5
  - Upsert mode: update if already exists
```

---

## 6. Performance Optimization

### Query: "Get today's attendance for department"

```
Naive (slow):
  db.attendance_records.find({
    date: "2026-03-28",
  })
  
Result: 2000 documents
Then join with employees in app layer

Optimized (use index + projection):
  db.attendance_records
    .find(
      { date: "2026-03-28" },
      { employeeId: 1, type: 1, timestamp: 1, verified: 1 }
    )
    .hint({ date: 1, employeeId: 1 })
    .batchSize(500)
    
Use stored employeeId to lookup department once (cached)
Result: Same data, much faster (index scan + projection)
```

### Aggregation Pipeline: "Attendance report for March"

```
db.attendance_records.aggregate([
  {
    $match: {
      date: { $gte: "2026-03-01", $lte: "2026-03-31" }
    }
  },
  {
    $group: {
      _id: "$employeeId",
      daysWorked: { $sum: 1 },
      avgLateness: { $avg: "$minutesLate" }
    }
  },
  {
    $sort: { avgLateness: -1 }
  },
  {
    $limit: 10
  }
])

Result: Top 10 most-late employees in March (very fast)
```

---

## 7. Monitoring & Maintenance

### Health Checks

```
Daily tasks:
  - Check unprocessed device_events count
  - Alert if > 100 pending events
  - Verify last successful payroll completion
  - Check import_jobs for failed imports
  - Validate backup completion
```

### Slow Query Capture

```
MongoDB profiler:
  db.setProfilingLevel(1, { slowms: 100 })
  
Captures all queries taking > 100ms

Review:
  db.system.profile.find().sort({ ts: -1 }).limit(10)
  
Fix: Create missing indexes or optimize query
```

---

## Integration Checklist

- [ ] Devices sending raw events to POST /api/devices/events
- [ ] Device event deduplication working (composite key)
- [ ] Daily batch reconciliation running (pairing IN/OUT)
- [ ] Manager anomaly review UI functional
- [ ] Excel import accepting all required entities
- [ ] Validation catching errors with clear messages
- [ ] Payroll calculation formula tested with sample data
- [ ] Payroll approval workflow functional
- [ ] Audit logs capturing all changes
- [ ] RBAC enforced at API layer
- [ ] Indexes created and performance validated
- [ ] Backups scheduled and tested
- [ ] Monitoring/alerting in place

---

**Version**: 1.0.0  
**Last Updated**: March 28, 2026  
**Status**: Complete ✅
