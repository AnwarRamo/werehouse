# 🔍 Employee Bus Assignment Diagnostic Guide

## Quick Diagnostic Steps

### Step 1: Run Diagnostic Script

```bash
cd backend-nest
node scripts/diagnose-employee-bus.js <employeeId>
```

**Example:**
```bash
node scripts/diagnose-employee-bus.js EMP001
```

This will show:
- ✅ Employee details (name, residence, status)
- 🚌 All active/inactive bus subscriptions
- 🚫 Blocking reasons (if any)
- 📋 Available buses with capacity
- 📝 Recommended API calls

---

## 🚨 Common Blocking Reasons

### 1. Employee Already on Another Bus (Most Common)

**Error Message (HTTP 409):**
```
الموظف EMP001 مشترك بالفعل بالباص "صحنايا - الكسوة" (123456). يرجى إزالة اشتراكه من الباص الآخر أولاً.
```

**Frontend Behavior:**
- Employee appears **disabled** in AddPassengerModal
- Red badge shows: "مشترك بباص 'route' (plateNumber)"
- Checkbox is unclickable

**Solution:**
```bash
# Option A: Use automated script (removes + adds in one step)
node scripts/reassign-employee-bus.js EMP001 <targetBusId> 2026-06-24

# Option B: Manual API calls
# Step 1: Remove from current bus
curl -X DELETE http://localhost:3000/api/transportation/buses/<currentBusId>/passengers/EMP001

# Step 2: Add to target bus
curl -X POST http://localhost:3000/api/transportation/buses/<targetBusId>/passengers \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "EMP001", "subscriptionDate": "2026-06-24"}'
```

---

### 2. Bus is at Full Capacity

**Error Message (HTTP 400):**
```
Bus is at full capacity (50 passengers)
```

**Frontend Behavior:**
- "إضافة موظف للباص" button is disabled (grayed out)
- Shows capacity indicator

**Solution:**
```bash
# Option A: Increase bus capacity via API
curl -X PUT http://localhost:3000/api/transportation/buses/<busId> \
  -H "Content-Type: application/json" \
  -d '{"capacity": 60}'

# Option B: Remove some passengers first
curl -X DELETE http://localhost:3000/api/transportation/buses/<busId>/passengers/<employeeId>
```

---

### 3. Employee Already on This Bus

**Error Message (HTTP 409):**
```
Employee EMP001 is already on this bus
```

**Frontend Behavior:**
- Employee doesn't appear in the list (filtered out)

**Solution:**
- Employee is already assigned - no action needed
- If you need to change the date, remove and re-add them

---

### 4. Employee Not Found

**Error Message (HTTP 404):**
```
Employee not found: EMP001
```

**Solution:**
```bash
# Check if employee exists
curl http://localhost:3000/api/employees/EMP001

# Or list all employees
curl http://localhost:3000/api/employees
```

---

## 🔧 API Endpoints Reference

### Check Active Subscribers (All Employees)
```bash
GET /api/transportation/active-subscribers
```

**Response:**
```json
{
  "EMP001": { "route": "صحنايا - الكسوة", "plateNumber": "123456" },
  "EMP002": { "route": "دمشق - المزة", "plateNumber": "789012" }
}
```

---

### Get Bus Details with Passengers
```bash
GET /api/transportation/buses/<busId>
```

**Response:**
```json
{
  "id": "uuid-123",
  "busId": "BUS001",
  "route": "صحنايا - الكسوة",
  "plateNumber": "123456",
  "capacity": 50,
  "totalCost": 20000,
  "companyDeductionPct": 20,
  "passengers": [
    { "employeeId": "EMP001", "name": "أحمد محمد", "status": "active" }
  ]
}
```

---

### Add Passenger
```bash
POST /api/transportation/buses/<busId>/passengers
Content-Type: application/json

{
  "employeeId": "EMP001",
  "subscriptionDate": "2026-06-24"  // optional, defaults to today
}
```

**Validation Order:**
1. ✅ Bus exists
2. ✅ Bus has capacity
3. ✅ Employee exists
4. ✅ Employee not on another bus (409 if violated)
5. ✅ Employee not already on this bus (409 if violated)

**Success Response:**
```json
{
  "id": "passenger-uuid",
  "employeeId": "EMP001",
  "busId": "bus-uuid",
  "subscriptionDate": "2026-06-24",
  "status": "active"
}
```

---

### Remove Passenger
```bash
DELETE /api/transportation/buses/<busId>/passengers/<employeeId>
```

**What happens:**
1. ✅ Sets `busPassenger.status` to `'inactive'`
2. 🗑️ Deletes associated `employeeSalaryDiscount` record
3. 💰 Recalculates discounts for remaining passengers
4. 🔄 Invalidates frontend cache

**Success Response:**
```json
{ "message": "Passenger removed successfully" }
```

---

## 🛠️ Automated Scripts

### Script 1: Diagnose Employee Bus Status

```bash
node scripts/diagnose-employee-bus.js <employeeId>
```

**Output includes:**
- Employee details
- Active subscriptions (blocking)
- Inactive subscriptions (historical)
- All available buses with status
- Exact API calls needed

---

### Script 2: Reassign Employee Bus

```bash
# Remove from all buses only
node scripts/reassign-employee-bus.js <employeeId>

# Remove from current + add to target
node scripts/reassign-employee-bus.js <employeeId> <targetBusId>

# With specific date
node scripts/reassign-employee-bus.js <employeeId> <targetBusId> 2026-06-24
```

**What it does:**
1. ✅ Finds all active subscriptions
2. 🗑️ Sets them to inactive
3. 🗑️ Deletes associated discounts
4. ➕ Creates/updates subscription on target bus
5. 💰 Recalculates discounts for all passengers
6. 📊 Shows summary of changes

---

## 🔍 Manual Database Queries (Prisma Studio)

If you need to check directly in the database:

```sql
-- Find employee's active bus subscriptions
SELECT 
  bp.employeeId,
  bp.status,
  bp.subscriptionDate,
  b.route,
  b.plateNumber,
  b.capacity
FROM bus_passengers bp
JOIN buses b ON bp.busId = b.id
WHERE bp.employeeId = 'EMP001'
  AND bp.status = 'active';

-- Count passengers per bus
SELECT 
  b.route,
  b.plateNumber,
  COUNT(bp.id) as passengerCount,
  b.capacity,
  (b.capacity - COUNT(bp.id)) as available
FROM buses b
LEFT JOIN bus_passengers bp ON b.id = bp.busId AND bp.status = 'active'
WHERE b.status = 'active'
GROUP BY b.id, b.route, b.plateNumber, b.capacity;

-- Find employees on multiple buses (should be 0)
SELECT employeeId, COUNT(*) as busCount
FROM bus_passengers
WHERE status = 'active'
GROUP BY employeeId
HAVING COUNT(*) > 1;
```

---

## 🐛 Troubleshooting

### Issue: Frontend shows employee as available, but backend rejects

**Cause:** Frontend cache is stale

**Fix:**
```bash
# Refresh the page (hard refresh: Ctrl+Shift+R)
# Or clear TanStack Query cache:
# - Open browser DevTools
# - Go to Application > Storage > Clear site data
```

---

### Issue: Employee removed but still shows as subscribed

**Cause:** Frontend hasn't invalidated queries

**Fix:**
```bash
# Wait 2-3 seconds for cache invalidation
# Or manually trigger refresh in Transportation page
```

---

### Issue: Discount not updating after reassignment

**Cause:** Discount calculation failed silently

**Fix:**
```bash
# Check backend logs for errors
# Manually recalculate via discounts API:
GET /api/discounts?employeeId=EMP001

# Or delete old discount and let system recreate:
DELETE /api/discounts/<discountId>
```

---

## 📊 Validation Rules Summary

| Rule | HTTP Status | Error Message |
|------|-------------|---------------|
| Employee on another bus | 409 | "الموظف مشترك بالفعل بالباص X..." |
| Bus at full capacity | 400 | "Bus is at full capacity (X passengers)" |
| Employee already on this bus | 409 | "Employee X is already on this bus" |
| Employee not found | 404 | "Employee not found: X" |
| Bus not found | 404 | "Bus not found: X" |

---

## 🎯 Quick Reference: Move Employee Between Buses

### Via UI (Recommended):
1. Go to Transportation page
2. Find current bus → Click "إزالة" next to employee
3. Wait for success toast
4. Go to target bus → Click "إضافة موظف للباص"
5. Select employee → Click "تأكيد الاشتراك"

### Via API:
```bash
# Step 1: Remove
curl -X DELETE http://localhost:3000/api/transportation/buses/BUS_A/passengers/EMP001

# Step 2: Add
curl -X POST http://localhost:3000/api/transportation/buses/BUS_B/passengers \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "EMP001", "subscriptionDate": "2026-06-24"}'
```

### Via Script (Fastest):
```bash
node scripts/reassign-employee-bus.js EMP001 BUS_B 2026-06-24
```

---

## 📞 Support

If you're still stuck:
1. Run the diagnostic script and share the output
2. Check browser console for frontend errors
3. Check backend logs (`server.log` or terminal output)
4. Verify database state with Prisma Studio
