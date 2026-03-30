# MongoDB Setup & Initialization Guide

## Prerequisites

- MongoDB 5.0 or higher
- MongoDB CLI tools (mongosh or mongo shell)
- Node.js 18+ (for application)

---

## 1. Database Creation

```bash
# Connect to MongoDB
mongosh  # or: mongo

# Switch to warehouse_system database
use warehouse_system
```

---

## 2. Create Collections with Validation

### Create Employees Collection

```javascript
db.createCollection("employees", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["employeeId", "name", "hourlyRate", "roleId"],
      properties: {
        _id: { bsonType: "objectId" },
        employeeId: {
          bsonType: "string",
          pattern: "^EMP[0-9]{3,}$"
        },
        name: {
          bsonType: "string",
          minLength: 2,
          maxLength: 100
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        hourlyRate: {
          bsonType: "decimal",
          minimum: 0
        },
        scheduledStart: {
          bsonType: "string",
          pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
        },
        scheduledEnd: {
          bsonType: "string",
          pattern: "^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
        },
        department: {
          enum: ["Warehouse", "HR", "Admin", "Finance", "Sales", "Operations"]
        },
        roleId: { bsonType: "objectId" },
        status: {
          bsonType: "string",
          enum: ["active", "inactive", "on_leave", "terminated"],
          default: "active"
        },
        joinDate: { bsonType: "date" },
        terminationDate: { bsonType: "date" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});
```

### Create Attendance Records Collection

```javascript
db.createCollection("attendance_records", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["employeeId", "timestamp", "type"],
      properties: {
        _id: { bsonType: "objectId" },
        employeeId: {
          bsonType: "string",
          pattern: "^EMP[0-9]{3,}$"
        },
        timestamp: { bsonType: "date" },
        type: {
          bsonType: "string",
          enum: ["IN", "OUT"]
        },
        deviceId: { bsonType: "string" },
        location: { bsonType: "string" },
        source: {
          bsonType: "string",
          enum: ["device", "manual", "import", "api"],
          default: "device"
        },
        verified: { bsonType: "bool", default: false },
        date: {
          bsonType: "string",
          pattern: "^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$"
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});
```

### Create Devices Collection

```javascript
db.createCollection("devices", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["deviceId", "name", "location"],
      properties: {
        _id: { bsonType: "objectId" },
        deviceId: {
          bsonType: "string",
          pattern: "^DEV[0-9]{3,}$"
        },
        name: { bsonType: "string" },
        location: {
          enum: ["Front Gate", "Warehouse Door", "Admin Office", "Parking"]
        },
        ip: {
          bsonType: "string",
          pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"
        },
        port: { bsonType: "int", minimum: 1, maximum: 65535 },
        model: {
          enum: ["ZK Teco", "Hikvision", "Suprema", "Anviz", "Other"]
        },
        status: {
          enum: ["active", "inactive", "maintenance", "offline"],
          default: "active"
        },
        lastSync: { bsonType: "date" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});
```

### Create Device Events Collection

```javascript
db.createCollection("device_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["deviceId", "employeeId", "timestamp", "direction"],
      properties: {
        _id: { bsonType: "objectId" },
        eventId: {
          bsonType: "string",
          pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
        },
        deviceId: { bsonType: "string" },
        employeeId: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        direction: { enum: ["IN", "OUT"] },
        verificationMethod: {
          enum: ["fingerprint", "rfid", "face", "card", "password", "manual"],
          default: "fingerprint"
        },
        quality: { bsonType: "int", minimum: 0, maximum: 100 },
        status: {
          enum: ["pending", "processed", "ignored", "anomaly"],
          default: "pending"
        },
        isDuplicate: { bsonType: "bool", default: false },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});
```

### Create Payroll Collections

```javascript
db.createCollection("payroll_runs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["periodStart", "periodEnd", "status"],
      properties: {
        _id: { bsonType: "objectId" },
        runId: {
          bsonType: "string",
          pattern: "^PAY[0-9]{8}$"
        },
        periodStart: { bsonType: "date" },
        periodEnd: { bsonType: "date" },
        periodType: {
          enum: ["weekly", "biweekly", "monthly", "custom"],
          default: "monthly"
        },
        runDate: { bsonType: "date" },
        status: {
          enum: ["draft", "processing", "completed", "approved", "paid", "archived"],
          default: "draft"
        },
        totalEmployees: { bsonType: "int" },
        totalGrossPay: { bsonType: "decimal" },
        totalDeductions: { bsonType: "decimal" },
        totalNetPay: { bsonType: "decimal" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("payroll_items", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["payrollRunId", "employeeId", "hoursWorked", "grossPay", "netPay"],
      properties: {
        _id: { bsonType: "objectId" },
        payrollRunId: { bsonType: "objectId" },
        employeeId: { bsonType: "string" },
        hoursWorked: { bsonType: "decimal", minimum: 0 },
        hourlyRate: { bsonType: "decimal", minimum: 0 },
        basePay: { bsonType: "decimal" },
        allowances: { bsonType: "decimal" },
        grossPay: { bsonType: "decimal" },
        totalDeductions: { bsonType: "decimal" },
        netPay: { bsonType: "decimal" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});
```

### Create Inventory Collections

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sku", "name", "category", "unitPrice"],
      properties: {
        _id: { bsonType: "objectId" },
        sku: {
          bsonType: "string",
          pattern: "^[A-Z0-9-]{3,20}$"
        },
        name: { bsonType: "string" },
        category: {
          enum: ["T-Shirts", "Shirts", "Pants", "Jackets", "Sweaters", "Accessories", "Other"]
        },
        size: {
          enum: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "One Size"]
        },
        color: { bsonType: "string" },
        unitPrice: { bsonType: "decimal", minimum: 0 },
        costPrice: { bsonType: "decimal", minimum: 0 },
        status: {
          enum: ["active", "discontinued", "pending"],
          default: "active"
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("stock_levels", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sku", "location", "quantity"],
      properties: {
        _id: { bsonType: "objectId" },
        sku: { bsonType: "string" },
        productId: { bsonType: "objectId" },
        location: {
          enum: ["MainWarehouse", "SecondaryWarehouse", "DisplayShelf", "Stockroom", "Transit"]
        },
        quantity: { bsonType: "int", minimum: 0 },
        reserved: { bsonType: "int", minimum: 0 },
        available: { bsonType: "int", minimum: 0 },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});
```

### Create Support Collections

```javascript
db.createCollection("roles");
db.createCollection("users");
db.createCollection("audit_logs");
db.createCollection("import_jobs");
db.createCollection("settings");
```

---

## 3. Create All Indexes

```javascript
// ===== EMPLOYEES INDEXES =====
db.employees.createIndex({ "employeeId": 1 }, { unique: true });
db.employees.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.employees.createIndex({ "roleId": 1 });
db.employees.createIndex({ "department": 1, "status": 1 });

// ===== ATTENDANCE INDEXES =====
db.attendance_records.createIndex({ "employeeId": 1, "timestamp": -1 });
db.attendance_records.createIndex({ "date": 1, "employeeId": 1 });
db.attendance_records.createIndex({ "deviceId": 1, "timestamp": -1 });
db.attendance_records.createIndex({ "verified": 1, "date": -1 });

// ===== DEVICES INDEXES =====
db.devices.createIndex({ "deviceId": 1 }, { unique: true });
db.devices.createIndex({ "location": 1, "status": 1 });
db.devices.createIndex({ "ip": 1 }, { unique: true, sparse: true });

// ===== DEVICE EVENTS INDEXES =====
db.device_events.createIndex({ "eventId": 1 }, { unique: true });
db.device_events.createIndex({ "deviceId": 1, "timestamp": -1 });
db.device_events.createIndex({ "employeeId": 1, "timestamp": -1 });
db.device_events.createIndex({ "status": 1 });
db.device_events.createIndex(
  { "deviceId": 1, "employeeId": 1, "timestamp": 1, "direction": 1 },
  { unique: true, sparse: true }  // Composite idempotency key
);

// ===== PAYROLL INDEXES =====
db.payroll_runs.createIndex({ "runId": 1 }, { unique: true });
db.payroll_runs.createIndex({ "periodStart": 1, "periodEnd": 1 });
db.payroll_runs.createIndex({ "status": 1 });
db.payroll_runs.createIndex({ "runDate": -1 });

db.payroll_items.createIndex({ "payrollRunId": 1, "employeeId": 1 }, { unique: true });
db.payroll_items.createIndex({ "employeeId": 1 });
db.payroll_items.createIndex({ "department": 1 });

// ===== PRODUCTS & INVENTORY INDEXES =====
db.products.createIndex({ "sku": 1 }, { unique: true });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "status": 1 });

db.stock_levels.createIndex({ "sku": 1, "location": 1 }, { unique: true });
db.stock_levels.createIndex({ "location": 1 });
db.stock_levels.createIndex({ "available": 1 });
db.stock_levels.createIndex({ "productId": 1 });

// ===== SUPPORT INDEXES =====
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });

db.audit_logs.createIndex({ "entity": 1, "entityId": 1 });
db.audit_logs.createIndex({ "timestamp": -1 });
db.audit_logs.createIndex({ "userId": 1 });

db.import_jobs.createIndex({ "entity": 1, "uploadedAt": -1 });
db.import_jobs.createIndex({ "status": 1 });

// ===== TTL INDEXES (Auto-deletion) =====
// Delete device_events after 90 days
db.device_events.createIndex(
  { "serverReceivedAt": 1 },
  { expireAfterSeconds: 7776000 }  // 90 days × 24 × 3600
);

// Trim old audit logs after 5 years (optional)
// db.audit_logs.createIndex(
//   { "timestamp": 1 },
//   { expireAfterSeconds: 157680000 }  // 5 years × 365 × 24 × 3600
// );
```

---

## 4. Seed Initial Data

### Insert Roles

```javascript
db.roles.insertMany([
  {
    name: "admin",
    description: "Full system access",
    permissions: [
      "manage_all",
      "view_employees",
      "edit_employees",
      "delete_employees",
      "view_attendance",
      "edit_attendance",
      "view_payroll",
      "run_payroll",
      "approve_payroll",
      "view_inventory",
      "edit_inventory",
      "view_devices",
      "manage_devices",
      "view_audit_logs",
      "manage_users",
      "manage_roles"
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "finance_manager",
    description: "Manage payroll and approvals",
    permissions: [
      "view_employees",
      "view_attendance",
      "view_payroll",
      "run_payroll",
      "approve_payroll",
      "view_audit_logs"
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "hr_manager",
    description: "Manage employees and imports",
    permissions: [
      "view_employees",
      "edit_employees",
      "view_attendance",
      "view_payroll",
      "view_imports",
      "run_imports"
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "warehouse_manager",
    description: "Manage inventory and devices",
    permissions: [
      "view_employees",
      "view_inventory",
      "edit_inventory",
      "view_devices",
      "manage_devices"
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "staff",
    description: "Basic staff access",
    permissions: [
      "view_own_attendance",
      "view_inventory"
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Verify
db.roles.find().pretty();
```

### Insert Settings

```javascript
db.settings.insertMany([
  {
    key: "grace_period_minutes",
    value: 5,
    dataType: "number",
    category: "attendance",
    description: "Minutes allowed before marking as late",
    updatedAt: new Date()
  },
  {
    key: "tax_rate_percent",
    value: 10,
    dataType: "number",
    category: "payroll",
    description: "Income tax percentage",
    updatedAt: new Date()
  },
  {
    key: "social_security_rate_percent",
    value: 5,
    dataType: "number",
    category: "payroll",
    description: "Social security deduction percentage",
    updatedAt: new Date()
  },
  {
    key: "overtime_multiplier",
    value: 1.25,
    dataType: "number",
    category: "payroll",
    description: "Multiplier for overtime hours",
    updatedAt: new Date()
  },
  {
    key: "default_payroll_period",
    value: "monthly",
    dataType: "string",
    category: "payroll",
    description: "Default payroll period type",
    updatedAt: new Date()
  }
]);

// Verify
db.settings.find().pretty();
```

---

## 5. Verify Setup

```javascript
// Check all collections exist
db.getCollectionNames();

// Sample query: Get all active employees
db.employees.find({ status: "active" });

// Check indexes
db.employees.getIndexes();
db.attendance_records.getIndexes();

// Database stats
db.stats();
```

---

## 6. Backup & Restore

### Backup

```bash
mongodump --db warehouse_system --out ./backups/$(date +%Y%m%d_%H%M%S)
```

### Restore

```bash
mongorestore --db warehouse_system ./backups/20260328_100000/warehouse_system
```

---

## Troubleshooting

### Issue: Duplicate Key Error on Insert

**Cause**: Unique index constraint violation.

**Solution**:
```javascript
// Check existing indexes
db.collection_name.getIndexes();

// Drop problematic data if needed
db.collection_name.deleteMany({ /* query */ });

// Re-insert with corrected values
```

### Issue: Validation Error

**Cause**: Document doesn't match schema validator.

**Solution**:
- Review the schema in schema JSON files
- Ensure required fields present
- Verify enum values match allowed options
- Check data types (string vs number, etc)

### Issue: Slow Queries

**Cause**: Missing indexes.

**Solution**:
```javascript
// Use explain() to check query plan
db.attendance_records.find({ employeeId: "EMP001" }).explain("executionStats");

// Create missing indexes (see section 3)
```

---

## Next Steps

1. ✅ Collections created with validation
2. ✅ Indexes applied for performance
3. ✅ Master data (roles, settings) seeded
4. ⏳ **Next**: Deploy backend API
5. ⏳ **Next**: Implement import endpoints
6. ⏳ **Next**: Build frontend dashboards

---

**Database**: warehouse_system  
**Collections**: 13  
**Indexes**: 50+  
**Status**: ✅ Ready for Application Development
