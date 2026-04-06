# شرح الباك إند — نظام المستودع

> **اللغة:** عربي | **المنصة:** NestJS + PostgreSQL (Neon) + Prisma + BullMQ  
> **المنفذ الافتراضي:** `5001` | **Base URL:** `http://localhost:5001/api`

---

## 1. نظرة عامة على المشروع

نظام إدارة مستودع متكامل يشمل:
- إدارة الموظفين والأدوار والصلاحيات
- تتبع الحضور والانصراف عبر أجهزة البصمة
- حساب الرواتب (راتب أساسي، بدلات، خصومات، أوفرتايم)
- إدارة السلف والتأمينات والمكافآت
- إدارة المخزون والمنتجات
- استيراد البيانات عبر CSV
- نظام صلاحيات دقيق مبني على JWT

---

## 2. هيكل المشروع

```
src/
├── auth/           ← تسجيل الدخول، المستخدمين، الأدوار
├── employees/      ← إدارة الموظفين
├── attendance/     ← سجلات الحضور
├── payroll/        ← حساب الرواتب والتقارير
├── salary/         ← الراتب الأساسي والبدلات لكل موظف
├── advances/       ← السلف (سلفة راتب / ملابس / أخرى)
├── insurance/      ← بيانات التأمينات الاجتماعية
├── bonuses/        ← المكافآت والمساعدات
├── inventory/      ← المنتجات ومستويات المخزون
├── imports/        ← استيراد CSV للموظفين والمنتجات
├── devices/        ← أجهزة البصمة
├── common/         ← Guards, Decorators, Filters, Utils
└── prisma/         ← خدمة قاعدة البيانات
```

---

## 3. المصادقة والصلاحيات

### آلية العمل
- عند تسجيل الدخول يُرجع النظام **JWT token** ويضعه أيضاً في **HttpOnly Cookie**.
- كل طلب محمي يحتاج إلى الـ token في الـ header: `Authorization: Bearer <token>` أو عبر الـ cookie تلقائياً.
- كل endpoint يتطلب **permission** محددة مُعرَّفة على الدور.

### الأدوار المدمجة

| الدور | الوصف |
|---|---|
| `admin` | صلاحيات كاملة على كل شيء |
| `staff` | صلاحيات عرض فقط |

### الحسابات المحمية (لا يمكن حظرها أبداً)

| المستخدم | الإيميل | كلمة المرور الافتراضية |
|---|---|---|
| `admin` | `admin@warehouse.local` | `password123` |
| `developer` | `developer@warehouse.local` | `DevAdmin@2026!` |
| `superadmin` | `superadmin@warehouse.local` | `SuperAdmin@2026!` |

> هذه الحسابات تُعاد تفعيلها تلقائياً عند كل تسجيل دخول حتى لو تم تعطيلها.

### قائمة الصلاحيات الكاملة

```
view_employees      edit_employees      delete_employees
view_devices        manage_devices
manage_users        manage_roles
view_attendance     edit_attendance
view_payroll        run_payroll         approve_payroll
view_inventory      edit_inventory
view_imports        run_imports
manage_salary       manage_advances     manage_insurance    manage_bonuses
```

---

## 4. نقاط النهاية (Endpoints)

### 4.1 الصحة — `/api/health`

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/health` | فحص عام |
| GET | `/health/live` | هل الخادم يعمل؟ |
| GET | `/health/ready` | هل قاعدة البيانات متصلة؟ |

---

### 4.2 المصادقة — `/api/auth`

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| POST | `/auth/login` | — | تسجيل الدخول |
| POST | `/auth/logout` | — | تسجيل الخروج (يمسح الـ cookie) |
| GET | `/auth/me` | مسجّل دخول | بيانات المستخدم الحالي |
| POST | `/auth/register` | — | تسجيل مستخدم جديد (دور staff) |
| POST | `/auth/users` | `manage_users` | إنشاء مستخدم بدور محدد |
| GET | `/auth/users` | `manage_users` | قائمة كل المستخدمين |
| GET | `/auth/roles` | `manage_roles` | قائمة الأدوار |

**مثال تسجيل الدخول:**
```json
POST /api/auth/login
{
  "username": "superadmin",
  "password": "SuperAdmin@2026!"
}
```

---

### 4.3 الموظفون — `/api/employees`

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/employees` | `view_employees` | قائمة الموظفين (مع pagination وفلترة) |
| GET | `/employees/stats` | `view_employees` | إحصائيات الموظفين |
| GET | `/employees/department/:dept` | `view_employees` | موظفو قسم معين |
| GET | `/employees/:employeeId` | `view_employees` | موظف واحد |
| POST | `/employees` | `edit_employees` | إضافة موظف |
| PUT | `/employees/:employeeId` | `edit_employees` | تعديل موظف |
| DELETE | `/employees/:employeeId` | `delete_employees` | حذف موظف |

**Query params للقائمة:** `page`, `limit`, `department`, `status`, `search`

---

### 4.4 الأجهزة — `/api/devices`

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/devices` | `view_devices` | قائمة الأجهزة |
| GET | `/devices/:deviceId` | `view_devices` | جهاز واحد |
| GET | `/devices/:deviceId/stats` | `view_devices` | إحصائيات الجهاز |
| POST | `/devices` | `manage_devices` | إضافة جهاز |
| PUT | `/devices/:deviceId` | `manage_devices` | تعديل جهاز |
| DELETE | `/devices/:deviceId` | `manage_devices` | حذف جهاز |

---

### 4.5 الحضور — `/api/attendance`

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/attendance` | `view_attendance` | سجلات الحضور |
| GET | `/attendance/stats` | `view_attendance` | إحصائيات الحضور |
| GET | `/attendance/anomalies` | `view_attendance` | حالات الشذوذ |
| GET | `/attendance/employee/:employeeId/period` | `view_attendance` | حضور موظف في فترة |
| POST | `/attendance` | `edit_attendance` | إضافة سجل حضور |
| POST | `/attendance/restore/:historyId` | `edit_attendance` | استرجاع سجل حضور محذوف |
| GET | `/attendance/deleted/history` | `edit_attendance` | سجل الحذف الخاص بالحضور |
| PUT | `/attendance/:recordId` | `edit_attendance` | تعديل سجل |
| DELETE | `/attendance/:recordId` | `edit_attendance` | حذف سجل مع حفظ نسخة للاسترجاع |

**نوع الحضور:** `IN` أو `OUT`

---

### 4.6 الرواتب — `/api/payroll`

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/payroll` | `view_payroll` | قائمة دورات الرواتب |
| GET | `/payroll/summary` | `view_payroll` | ملخص الرواتب لفترة |
| GET | `/payroll/:runId` | `view_payroll` | تفاصيل دورة راتب |
| GET | `/payroll/:runId/export` | `view_payroll` | تصدير CSV |
| GET | `/payroll/:runId/export/pdf` | `view_payroll` | تصدير PDF |
| GET | `/payroll/:runId/anomalies` | `view_payroll` | شذوذات الدورة |
| GET | `/payroll/employee/:employeeId/history` | `view_payroll` | تاريخ راتب موظف |
| POST | `/payroll/calculate` | `run_payroll` | حساب الرواتب (متزامن) |
| POST | `/payroll/calculate/async` | `run_payroll` | حساب الرواتب (غير متزامن عبر Queue) |
| PUT | `/payroll/:runId/approve` | `approve_payroll` | اعتماد دورة الراتب |
| PUT | `/payroll/:runId/reject` | `approve_payroll` | رفض دورة الراتب |

---

### 4.7 الراتب الأساسي والبدلات — `/api/salary`

> يخزن الراتب الأساسي، بدل المسؤولية، حافز الإنتاج، بدل النقل لكل موظف.

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/salary` | `manage_salary` | قائمة كل سجلات الرواتب |
| GET | `/salary/:employeeId` | `manage_salary` | راتب موظف محدد |
| PUT | `/salary/:employeeId` | `manage_salary` | إنشاء أو تحديث راتب موظف |
| DELETE | `/salary/:employeeId` | `manage_salary` | حذف سجل الراتب |

**مثال:**
```json
PUT /api/salary/EMP003
{
  "profession": "مدير مالي",
  "baseSalary": 750000,
  "responsibilityAllowance": 4619000,
  "productionIncentive": 0,
  "transportAllowance": 0
}
```

---

### 4.8 السلف — `/api/advances`

> يدير سلف الرواتب وخصومات الملابس والسلف الأخرى.

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/advances` | `manage_advances` | كل السلف (فلترة بـ `?employeeId=`) |
| GET | `/advances/summary/:employeeId` | `manage_advances` | ملخص سلف موظف |
| GET | `/advances/:id` | `manage_advances` | سلفة واحدة |
| POST | `/advances` | `manage_advances` | إضافة سلفة |
| POST | `/advances/restore/:historyId` | `manage_advances` | استرجاع سلفة محذوفة |
| GET | `/advances/deleted/history` | `manage_advances` | سجل الحذف الخاص بالسلف |
| PUT | `/advances/:id` | `manage_advances` | تحديث سلفة (المبلغ المتبقي، القسط) |
| DELETE | `/advances/:id` | `manage_advances` | حذف سلفة مع حفظ نسخة للاسترجاع |

**أنواع السلفة:** `salary` | `clothing` | `other`

**مثال:**
```json
POST /api/advances
{
  "employeeId": "EMP003",
  "advanceType": "salary",
  "totalAmount": 1000000,
  "installmentAmount": 100000,
  "notes": "سلفة أبريل 2026"
}
```

---

### 4.9 التأمينات — `/api/insurance`

> يخزن بيانات التأمين الاجتماعي لكل موظف.

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/insurance` | `manage_insurance` | قائمة كل سجلات التأمين |
| GET | `/insurance/:employeeId` | `manage_insurance` | تأمين موظف محدد |
| PUT | `/insurance/:employeeId` | `manage_insurance` | إنشاء أو تحديث تأمين موظف |
| DELETE | `/insurance/:employeeId` | `manage_insurance` | حذف سجل التأمين |

**مثال:**
```json
PUT /api/insurance/EMP003
{
  "insuranceSalary": 750000,
  "socialSecurityNumber": "123456789",
  "registrationDate": "2024-01-01"
}
```

---

### 4.10 المكافآت والمساعدات — `/api/bonuses`

> يدير مكافآت الموظفين ومبالغ المساعدة لكل فترة.

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/bonuses` | `manage_bonuses` | كل المكافآت (فلترة بـ `?employeeId=` و `?period=`) |
| GET | `/bonuses/summary/:period` | `manage_bonuses` | ملخص مكافآت فترة كاملة |
| GET | `/bonuses/:id` | `manage_bonuses` | مكافأة واحدة |
| POST | `/bonuses` | `manage_bonuses` | إضافة مكافأة |
| PUT | `/bonuses/:id` | `manage_bonuses` | تعديل مكافأة |
| DELETE | `/bonuses/:id` | `manage_bonuses` | حذف مكافأة |

**مثال:**
```json
POST /api/bonuses
{
  "employeeId": "EMP003",
  "bonusAmount": 500000,
  "bonusReason": "أداء متميز",
  "assistanceAmount": 200000,
  "period": "2026-04"
}
```

---

### 4.11 المخزون — `/api/inventory`

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/inventory/products` | `view_inventory` | قائمة المنتجات |
| GET | `/inventory/products/:id` | `view_inventory` | منتج واحد |
| GET | `/inventory/stats` | `view_inventory` | إحصائيات المخزون |
| GET | `/inventory/stock/:sku` | `view_inventory` | مستوى مخزون منتج |
| POST | `/inventory/products` | `edit_inventory` | إضافة منتج |
| PUT | `/inventory/products/:id` | `edit_inventory` | تعديل منتج |
| POST | `/inventory/stock/adjust` | `edit_inventory` | تعديل الكمية |
| POST | `/inventory/stock/reserve` | `edit_inventory` | حجز كمية |
| POST | `/inventory/stock/release` | `edit_inventory` | تحرير حجز |

---

### 4.12 الاستيراد — `/api/imports`

| الطريقة | المسار | الصلاحية | الوصف |
|---|---|---|---|
| GET | `/imports/history` | `view_imports` | سجل عمليات الاستيراد |
| GET | `/imports/stats` | `view_imports` | إحصائيات الاستيراد |
| GET | `/imports/templates/employees` | `view_imports` | تحميل قالب CSV للموظفين |
| GET | `/imports/templates/products` | `view_imports` | تحميل قالب CSV للمنتجات |
| GET | `/imports/jobs/:jobId` | `view_imports` | حالة عملية استيراد |
| POST | `/imports/employees/validate` | `run_imports` | التحقق من ملف CSV قبل الاستيراد |
| POST | `/imports/employees` | `run_imports` | استيراد موظفين (متزامن) |
| POST | `/imports/employees/async` | `run_imports` | استيراد موظفين (غير متزامن) |
| POST | `/imports/products/validate` | `run_imports` | التحقق من ملف CSV للمنتجات |
| POST | `/imports/products` | `run_imports` | استيراد منتجات (متزامن) |
| POST | `/imports/products/async` | `run_imports` | استيراد منتجات (غير متزامن) |
| POST | `/imports/jobs/:jobId/retry` | `run_imports` | إعادة محاولة استيراد فاشل |

---

## 5. نماذج قاعدة البيانات

| الجدول | الوصف |
|---|---|
| `roles` | الأدوار والصلاحيات |
| `users` | حسابات تسجيل الدخول |
| `employees` | بيانات الموظفين الأساسية |
| `employee_salaries` | الراتب الأساسي والبدلات |
| `employee_advances` | السلف |
| `employee_insurance` | بيانات التأمين الاجتماعي |
| `employee_bonuses` | المكافآت والمساعدات |
| `attendance_records` | سجلات الحضور والانصراف |
| `deleted_record_history` | سجل النسخ المحفوظة قبل الحذف مع معلومات الاسترجاع |
| `payroll_runs` | دورات حساب الرواتب |
| `payroll_items` | تفاصيل راتب كل موظف في الدورة |
| `devices` | أجهزة البصمة |
| `products` | المنتجات |
| `stock_levels` | مستويات المخزون |
| `import_jobs` | سجل عمليات الاستيراد |

---

## 6. تشغيل المشروع

```bash
# تثبيت الحزم
npm install

# مزامنة قاعدة البيانات
npx prisma db push

# توليد Prisma Client
npx prisma generate

# إنشاء الحسابات المحمية
node scripts/bootstrap-protected-admins.js

# بيانات تجريبية
node scripts/seed-demo.js

# بيانات الرواتب من الجدول
node scripts/seed-payroll-data.js

# تشغيل الخادم
npm run start:dev
```

---

## 7. متغيرات البيئة المهمة

| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | رابط قاعدة البيانات PostgreSQL |
| `JWT_SECRET` | مفتاح تشفير الـ JWT |
| `ADMIN_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD` | بيانات حساب admin |
| `DEV_ADMIN_USERNAME` / `DEV_ADMIN_PASSWORD` | بيانات حساب developer |
| `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` | بيانات حساب superadmin |
| `REDIS_URL` | رابط Redis لـ BullMQ (طوابير المهام) |
| `PORT` | منفذ الخادم (افتراضي: 5001) |

---

## 8. ملاحظات مهمة

- **الحسابات المحمية** لا يمكن حظرها — النظام يُعيد تفعيلها تلقائياً عند كل تسجيل دخول.
- **BullMQ** يستخدم Redis لمعالجة الرواتب والاستيراد بشكل غير متزامن — إذا لم يكن Redis متاحاً يعمل النظام بشكل متزامن تلقائياً.
- **Prisma** يستخدم `@prisma/adapter-pg` مع connection pool لأداء أفضل.
- تم ربط `attendance_records` و`employee_advances` مع `employees` بعلاقة مرجعية على `employeeId` مع `onDelete: Cascade` لضمان عدم بقاء بيانات يتيمة عند الحذف.
- قبل حذف السجل من الحضور أو السلف، يتم حفظ نسخة كاملة في جدول `deleted_record_history` مع `deletedAt/deletedBy`، ويمكن استرجاعها لاحقاً عبر endpoints الاسترجاع.
- جميع الأسعار والرواتب مخزنة كـ `Decimal` بدقة عالية لتجنب أخطاء الأرقام العشرية.
- الـ `employeeId` في جداول الرواتب والسلف والتأمين هو المعرف المنطقي (مثل `EMP003`) وليس الـ UUID.
