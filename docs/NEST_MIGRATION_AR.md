# دليل التحويل من Express إلى NestJS (بالعربي)

## لماذا أنشأنا Backend جديد بـ NestJS؟
أنت طلبت الانتقال إلى NestJS مع فهم الفروقات، لذلك تم إنشاء Backend جديد داخل المشروع بدل تكسير الكود القديم مباشرة.

- Express الحالي بقي موجود للتشغيل القديم.
- Nest الجديد موجود في مجلد مستقل: backend-nest.
- هذا يسمح لك تتعلم وتختبر خطوة خطوة بدون تعطيل شغلك الحالي.

## أين الكود الجديد؟
- backend-nest/package.json
- backend-nest/src/main.ts
- backend-nest/src/app.module.ts
- backend-nest/src/auth/*
- backend-nest/src/employees/*
- backend-nest/src/devices/*
- backend-nest/src/health/*

## ما الذي تم نقله فعليا؟
تم نقل النظام على مرحلتين:

### المرحلة الأولى

1. الاتصال بـ MongoDB Atlas عبر Mongoose
2. إعداد JWT Authentication
3. Role/Permission Guards
4. Module مستقل لـ Auth
5. Module مستقل لـ Employees
6. Module مستقل لـ Devices
7. Health Endpoint

### المرحلة الثانية (تم تنفيذها الآن)
1. Attendance module كامل بالمسارات الأساسية
2. Payroll module كامل بالمسارات الأساسية
3. Inventory module كامل بالمسارات الأساسية
4. Imports module كامل بالمسارات الأساسية + CSV parser فعلي (مع تتبع أخطاء لكل صف)
5. تحديث Postman Collection خاص بـ Nest

## الفكرة المعمارية: Express vs Nest

### Express (القديم)
- بنية حرة: Routes + Controllers + Services
- أنت المسؤول عن ترتيب كل شيء بنفسك
- ممتاز للبدايات، لكن يكبر بسرعة ويصير التنظيم أصعب

### NestJS (الجديد)
- بنية منظمة جدًا: Module -> Controller -> Service
- Dependency Injection مدمج
- Guards / Pipes / Interceptors بشكل رسمي
- مناسب جدًا للمشاريع الكبيرة والفرق

## الفرق العملي في الكود

### 1) نقطة البداية
Express:
- server.js
- app.use, app.get, app.listen

Nest:
- main.ts + app.module.ts
- app.setGlobalPrefix('api')
- app.useGlobalPipes(ValidationPipe)

### 2) تنظيم الملفات
Express:
- routes/auth.js
- controllers/AuthController.js
- services/...

Nest:
- auth/auth.module.ts
- auth/auth.controller.ts
- auth/auth.service.ts
- auth/jwt.strategy.ts

### 3) الحماية والصلاحيات
Express:
- middleware/auth.js
- authenticate + requirePermission

Nest:
- JwtAuthGuard
- PermissionsGuard
- Decorator @Permissions(...)

### 4) التحقق من الـ DTO
Express:
- تحقق يدوي غالبا داخل controller

Nest:
- DTO + class-validator
- ValidationPipe عالمي

## مسارات API في Nest الجديد (المطبقة حاليا)

### Health
- GET /api/health

### Auth
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/users
- GET /api/auth/users
- GET /api/auth/roles

### Employees
- GET /api/employees
- GET /api/employees/stats
- GET /api/employees/department/:department
- POST /api/employees
- GET /api/employees/:employeeId
- PUT /api/employees/:employeeId
- DELETE /api/employees/:employeeId

### Devices
- GET /api/devices
- POST /api/devices
- GET /api/devices/:deviceId
- PUT /api/devices/:deviceId
- GET /api/devices/:deviceId/stats

### Attendance
- GET /api/attendance
- GET /api/attendance/stats
- GET /api/attendance/anomalies
- POST /api/attendance
- GET /api/attendance/:recordId
- PUT /api/attendance/:recordId
- GET /api/attendance/employee/:employeeId/date/:date
- GET /api/attendance/employee/:employeeId/period

### Payroll
- GET /api/payroll
- GET /api/payroll/summary
- POST /api/payroll/calculate
- GET /api/payroll/:runId
- GET /api/payroll/:runId/anomalies
- PUT /api/payroll/:runId/approve
- PUT /api/payroll/:runId/reject
- GET /api/payroll/:runId/export
- GET /api/payroll/employee/:employeeId

### Inventory
- GET /api/inventory/products
- POST /api/inventory/products
- GET /api/inventory/products/:productId
- PUT /api/inventory/products/:productId
- GET /api/inventory/stock/:sku
- POST /api/inventory/stock/adjust
- POST /api/inventory/stock/reserve
- POST /api/inventory/stock/release
- GET /api/inventory/alerts/low-stock
- GET /api/inventory/stats

### Imports
- GET /api/imports/history
- GET /api/imports/stats
- GET /api/imports/jobs/:jobId
- GET /api/imports/templates/employees
- GET /api/imports/templates/products
- POST /api/imports/employees
- POST /api/imports/employees/validate
- POST /api/imports/products
- POST /api/imports/products/validate
- POST /api/imports/jobs/:jobId/retry

## ملاحظة مهمة عن المتغيرات (IDs)
في نسخة Express القديمة بعض المسارات تسمي الباراميتر employeeId أو deviceId لكنها أحيانا تستخدم Mongo _id داخليا.
في Nest الحالي تم الحفاظ على نفس نمط المسارات لتسهيل الانتقال، لكن داخليا تحتاج تنتبه هل المطلوب _id أم business id.

## كيف تشغل Nest الجديد؟
من داخل backend-nest:

1. npm install
2. npm run start:dev

المنفذ الافتراضي:
- PORT=5001

الـ Base URL:
- http://localhost:5001/api

## ماذا عن المستخدم Admin؟
داخل AuthService يوجد bootstrap تلقائي عند تشغيل النظام لأول مرة:
- username: admin
- password: password123

## ما الفرق الحقيقي الذي ستشعر به كمطور مبتدئ؟

1. في Nest كل شيء أوضح (Module/Service/Controller)
2. أسهل بكثير إضافة feature جديدة بدون فوضى
3. أسهل كتابة Tests لاحقا
4. Guards/Pipes تقلل الأخطاء الأمنية والمنطقية
5. منحنى تعلم أعلى قليلا بالبداية، لكن الربح كبير بعد أول أسبوع

## ماذا تبقى لنكمل migration 100%؟
تم نقل كل الموديولات الرئيسية، والمتبقي الآن هو تحسينات العمق فقط:

1. منطق Payroll الحسابي المتقدم مطابق 100% مع خدمة Express القديمة
2. تحسين Parser/Mappings لملفات CSV داخل imports (النسخة الحالية تعمل، والمتبقي هو قواعد mapping اعمق حسب بياناتك الفعلية)
3. إضافة Audit logs متطابقة بالكامل مع النسخة القديمة
4. تحسين id strategy (تمييز أوضح بين business id وMongo _id)
5. إضافة اختبارات e2e لكل Module

## صيغة CSV المدعومة حاليا في Nest

### employees import
- الحقول الاساسية: employeeId, name, email, hourlyRate
- حقول اختيارية: currency, department, status, scheduledStart, scheduledEnd, roleId

### products import
- الحقول الاساسية: sku, name, category, unitPrice, costPrice
- حقول اختيارية: reorderLevel, status

ملاحظة: الرفع يتم عبر multipart/form-data في حقل اسمه file.

## قوالب CSV جاهزة للتحميل

- employees template: GET /api/imports/templates/employees
- products template: GET /api/imports/templates/products

هذه القوالب تساعدك تتجنب اخطاء تنسيق الاعمدة قبل الرفع.

## فحص Dry-Run قبل الكتابة في قاعدة البيانات

- employees dry-run: POST /api/imports/employees/validate
- products dry-run: POST /api/imports/products/validate

ميزة Dry-Run تعمل validation كامل وترجع اخطاء الصفوف بدون حفظ اي بيانات في MongoDB.

## التحقق الصارم من رؤوس الاعمدة (Headers)

نسخة الاستيراد الحالية تتحقق من وجود الاعمدة الاساسية قبل معالجة الصفوف.
اذا header اساسي مفقود سترجع API خطأ واضح من نوع Bad Request.

## خريطة تعلم Nest لك (مقترحة)
1. افهم Module/Controller/Service بعينة auth.
2. افهم Guards من auth + permissions.
3. جرب تضيف endpoint جديد داخل employees.
4. جرب تضيف DTO جديد مع validation.
5. بعدها انتقل لـ attendance/payroll.

## الخلاصة
تم تنفيذ Backend جديد بـ NestJS فعليا داخل مشروعك بدون حذف Express.
بهذا أنت تستطيع:
- تكمل الشغل القديم فورًا (Express)
- وتتعلم/تطور النسخة الجديدة (Nest) بشكل آمن ومنظم.

## الأخطاء الشائعة وكيف تحلها بسرعة

### ENOENT على package.json
- السبب: تشغيل اوامر npm من مجلد غير backend-nest.
- الحل:

```bash
cd c:/Users/anwar/Downloads/work/warehouse-system/backend-nest
npm install
npm run build
npm run start:dev
```

### EADDRINUSE (المنفذ مستخدم)
- السبب: عملية اخرى شغالة على نفس المنفذ.
- الحل (Windows PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 5001 -State Listen
Stop-Process -Id <PID> -Force
```

### Unauthorized بعد تسجيل الدخول
- السبب: عدم ارسال Authorization Bearer token او انتهاء التوكن.
- الحل:
1. نفذ POST /api/auth/login
2. انسخ token من الاستجابة
3. ارسله في كل طلب محمي بصيغة: Authorization: Bearer <token>

## اوامر فحص سريعة (Smoke Test)

```bash
# Health
curl http://localhost:5001/api/health

# Login
curl -X POST http://localhost:5001/api/auth/login \
	-H "Content-Type: application/json" \
	-d '{"username":"admin","password":"password123"}'

# Protected endpoint
curl http://localhost:5001/api/attendance \
	-H "Authorization: Bearer <TOKEN>"
```
