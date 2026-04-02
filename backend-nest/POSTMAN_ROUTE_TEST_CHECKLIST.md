# Backend Route Test Checklist (Postman)

Use this checklist to test all main backend routes in order.

## 1) Setup

- Base URL: `http://localhost:5001`
- API prefix: `/api`
- Login account:
	- username: `admin`
	- password: `password123`

Postman variables to create:

- `baseUrl` = `http://localhost:5001/api`
- `token` = (set after login)
- `roleId` = (set after roles request)
- `employeeId` = (set after employee create)
- `deviceId` = (set after device create)
- `attendanceId` = (set after attendance create)
- `payrollRunId` = (set after payroll calculate)
- `productId` = (set after product create)
- `sku` = `SKU-TEST-001`
- `importJobId` = (set after import)

Auth header for protected routes:

- `Authorization: Bearer {{token}}`

## 2) Authentication

1. `POST {{baseUrl}}/auth/login`
Body:

```json
{
	"username": "admin",
	"password": "password123"
}
```

Expected: `200`

Postman Tests snippet:

```javascript
pm.test("login ok", function () {
	pm.response.to.have.status(200);
});
const json = pm.response.json();
pm.environment.set("token", json.token);
```

2. `GET {{baseUrl}}/auth/me` -> expect `200`
3. `GET {{baseUrl}}/auth/roles` -> expect `200` and save one role id

Roles Tests snippet:

```javascript
const roles = pm.response.json();
pm.environment.set("roleId", roles[0].id);
```

## 3) Employees

1. `POST {{baseUrl}}/employees`

```json
{
	"employeeId": "EMP900001",
	"name": "Postman Employee",
	"email": "postman.employee@warehouse.local",
	"hourlyRate": 15.5,
	"roleId": "{{roleId}}",
	"department": "Warehouse",
	"scheduledStart": "08:00",
	"scheduledEnd": "16:00"
}
```

Expected: `201`

2. `GET {{baseUrl}}/employees` -> expect `200`
3. `GET {{baseUrl}}/employees/stats` -> expect `200`
4. `PUT {{baseUrl}}/employees/EMP900001`

```json
{
	"department": "Operations",
	"hourlyRate": 16.25
}
```

Expected: `200`

5. `GET {{baseUrl}}/employees/EMP900001` -> expect `200`

Set variable:

- `employeeId = EMP900001`

## 4) Devices

1. `POST {{baseUrl}}/devices`

```json
{
	"deviceId": "DEV900001",
	"name": "Postman Device",
	"location": "Gate A",
	"model": "ZK Teco",
	"ip": "192.168.1.10",
	"port": 4370
}
```

Expected: `201`

2. `PUT {{baseUrl}}/devices/DEV900001`

```json
{
	"location": "Gate B"
}
```

Expected: `200`

3. `GET {{baseUrl}}/devices` -> expect `200`
4. `GET {{baseUrl}}/devices/DEV900001` -> expect `200`
5. `GET {{baseUrl}}/devices/DEV900001/stats` -> expect `200`

Set variable:

- `deviceId = DEV900001`

## 5) Attendance

1. `POST {{baseUrl}}/attendance`

```json
{
	"employeeId": "{{employeeId}}",
	"timestamp": "2026-04-02T08:00:00.000Z",
	"type": "IN",
	"deviceId": "{{deviceId}}",
	"location": "Gate B",
	"source": "manual",
	"verified": true,
	"notes": "postman checkin"
}
```

Expected: `201`

Save returned id as `attendanceId`.

2. `PUT {{baseUrl}}/attendance/{{attendanceId}}`

```json
{
	"notes": "postman note updated"
}
```

Expected: `200`

3. `GET {{baseUrl}}/attendance` -> expect `200`
4. `GET {{baseUrl}}/attendance/stats` -> expect `200`
5. `GET {{baseUrl}}/attendance/anomalies` -> expect `200`
6. `GET {{baseUrl}}/attendance/employee/{{employeeId}}/date/2026-04-02` -> expect `200`
7. `GET {{baseUrl}}/attendance/{{attendanceId}}` -> expect `200`

## 6) Inventory

1. `POST {{baseUrl}}/inventory/products`

```json
{
	"sku": "{{sku}}",
	"name": "Postman Product",
	"category": "General",
	"unitPrice": 100,
	"costPrice": 70,
	"reorderLevel": 5
}
```

Expected: `201`

Save `product.id` as `productId`.

2. `PUT {{baseUrl}}/inventory/products/{{productId}}`

```json
{
	"name": "Postman Product Updated",
	"unitPrice": 110
}
```

Expected: `200`

3. `POST {{baseUrl}}/inventory/stock/adjust`

```json
{
	"sku": "{{sku}}",
	"location": "A1",
	"change": 50,
	"reason": "initial load"
}
```

Expected: `201`

4. `POST {{baseUrl}}/inventory/stock/reserve`

```json
{
	"sku": "{{sku}}",
	"location": "A1",
	"quantity": 10,
	"reason": "order"
}
```

Expected: `201`

5. `POST {{baseUrl}}/inventory/stock/release`

```json
{
	"sku": "{{sku}}",
	"location": "A1",
	"quantity": 5,
	"reason": "order changed"
}
```

Expected: `201`

6. `GET {{baseUrl}}/inventory/products` -> expect `200`
7. `GET {{baseUrl}}/inventory/products/{{productId}}` -> expect `200`
8. `GET {{baseUrl}}/inventory/stock/{{sku}}` -> expect `200`
9. `GET {{baseUrl}}/inventory/alerts/low-stock` -> expect `200`
10. `GET {{baseUrl}}/inventory/stats` -> expect `200`

## 7) Payroll

1. `POST {{baseUrl}}/payroll/calculate`

```json
{
	"periodStart": "2026-03-25",
	"periodEnd": "2026-04-02",
	"gracePeriodMinutes": 5
}
```

Expected: `201`

Save `payrollRun.id` as `payrollRunId`.

2. `PUT {{baseUrl}}/payroll/{{payrollRunId}}/approve` -> expect `200`
3. `PUT {{baseUrl}}/payroll/{{payrollRunId}}/reject`

```json
{
	"reason": "postman rejection test"
}
```

Expected: `200`

4. `GET {{baseUrl}}/payroll` -> expect `200`
5. `GET {{baseUrl}}/payroll/summary` -> expect `200`
6. `GET {{baseUrl}}/payroll/{{payrollRunId}}` -> expect `200`
7. `GET {{baseUrl}}/payroll/{{payrollRunId}}/anomalies` -> expect `200`
8. `GET {{baseUrl}}/payroll/{{payrollRunId}}/export` -> expect `200`
9. `GET {{baseUrl}}/payroll/employee/{{employeeId}}` -> expect `200`

## 8) Imports (CSV)

1. `GET {{baseUrl}}/imports/templates/employees` -> expect `200`
2. `GET {{baseUrl}}/imports/templates/products` -> expect `200`

3. `POST {{baseUrl}}/imports/employees/validate`
- Body type: `form-data`
- Key: `file` (type: File)
- Use employees CSV template content
- Expected: `200`

4. `POST {{baseUrl}}/imports/employees`
- Body type: `form-data`
- Key: `file` (type: File)
- Expected: `201`
- Save `jobId` as `importJobId`

5. `POST {{baseUrl}}/imports/products/validate`
- Body type: `form-data`
- Key: `file` (type: File)
- Expected: `200`

6. `POST {{baseUrl}}/imports/products`
- Body type: `form-data`
- Key: `file` (type: File)
- Expected: `201`

7. `GET {{baseUrl}}/imports/history` -> expect `200`
8. `GET {{baseUrl}}/imports/stats` -> expect `200`
9. `GET {{baseUrl}}/imports/jobs/{{importJobId}}` -> expect `200`
10. `POST {{baseUrl}}/imports/jobs/{{importJobId}}/retry` -> expect `201`

## 9) Expected Negative Tests

1. `GET {{baseUrl}}/auth/me` without token -> expect `401`
2. `POST {{baseUrl}}/imports/employees/validate` without file -> expect `400`
3. `POST {{baseUrl}}/inventory/stock/reserve` with quantity too high -> expect `400`
4. `GET {{baseUrl}}/employees/EMP000000` -> expect `404`

## 10) Notes

- Attendance stats and payroll summary now support missing dates by using a default recent range.
- Protected endpoints require a valid JWT in `Authorization` header.
- CSV upload routes require multipart `file` field.
