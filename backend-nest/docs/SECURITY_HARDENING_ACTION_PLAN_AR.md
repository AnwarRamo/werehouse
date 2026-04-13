# خطة التحصين الأمني - Backend NestJS

هذه الوثيقة تحول قائمة التهديدات الأمنية إلى خطة تنفيذ عملية داخل المشروع.

## حالة التنفيذ السريعة

- تم التنفيذ الآن:
  - Brute Force: قفل الحساب المؤقت بعد محاولات فاشلة.
  - CSRF: فحص Origin/Referer لطلبات التعديل عند استخدام Cookie auth.
  - MitM: تفعيل HSTS بشكل صريح في الإنتاج عبر helmet.
  - Sensitive Data Exposure: الحفاظ على عزل بيانات كلمة المرور في الردود، مع .env ضمن gitignore.

- يحتاج تنفيذ لاحق:
  - Broken Access Control (Ownership checks أدق لكل دومين).
  - MFA/2FA.
  - SSRF safeguards (whitelist صارمة لأي outbound fetch مستقبلية).
  - Vulnerable Components automation (Dependabot/Snyk).
  - Logging & SIEM expansion (Winston/ELK/OTel).

---

## 1) CSRF - Cross-Site Request Forgery

الخطر:
- إرسال طلبات تغيير حالة من موقع خارجي عبر Cookie session.

المطبق:
- حماية Cookie بـ SameSite configurable + Secure.
- Middleware يتحقق من Origin/Referer في الطلبات غير الآمنة (POST/PUT/PATCH/DELETE) عندما تكون المصادقة عبر Cookie.

الضبط:
- CSRF_PROTECTION_ENABLED=true
- JWT_COOKIE_SAME_SITE=lax أو strict عندما يكون frontend/backend نفس النطاق.
- عند cross-site: استخدم none مع الحماية الإضافية (Origin check).

---

## 2) Broken Access Control / IDOR

الخطر:
- قراءة/تعديل سجل لا يملكه المستخدم بتغيير identifier في المسار.

الموجود:
- Permissions Guard + role-based checks.

الخطوة المطلوبة:
- إضافة Ownership policy على endpoints الحساسة حيث يلزم:
  - attendance/employee/:employeeId
  - payroll/employee/:employeeId
  - salary/:employeeId
  - advances?employeeId=
- قاعدة التنفيذ: لا يكفي التحقق من token والصلاحية العامة؛ يجب التحقق من ملكية السجل أو نطاق الإدارة.

---

## 3) MitM - Man in the Middle

الخطر:
- التنصت أو التلاعب بالبيانات أثناء النقل.

المطبق:
- Helmet مع HSTS صريح في الإنتاج.
- Cookie secure في production.

ملاحظة تشغيل:
- يلزم HTTPS فعلي عبر reverse proxy أو المنصة المستضيفة.

---

## 4) Phishing

الخطر:
- سرقة بيانات الدخول عبر صفحات مزيفة.

الخطوة المطلوبة:
- إضافة MFA/2FA.
- تطبيق سياسات login UX واضحة (تحذير جلسات جديدة/أجهزة جديدة).

---

## 5) Brute Force

الخطر:
- تخمين كلمة المرور عبر محاولات متعددة.

المطبق:
- ThrottlerModule عالمي.
- Account lockout policy داخل AuthService:
  - AUTH_MAX_LOGIN_ATTEMPTS
  - AUTH_LOCKOUT_MINUTES

---

## 6) OS Command Injection

الخطر:
- تمرير أوامر نظام عبر مدخلات المستخدم.

الموجود:
- لا يوجد اعتماد على exec/eval في المسارات الحالية.
- رفع الملفات عبر نهج آمن نسبيًا مع تسمية مخزنة عشوائية.

الخطوة المطلوبة:
- المحافظة على نفس القاعدة: منع أي shell execution بمدخلات مستخدم.

---

## 7) Sensitive Data Exposure

الخطر:
- تسريب password hash أو secrets.

الموجود:
- عدم إرجاع passwordHash في responses.
- .env مستبعد من Git.

الخطوة المطلوبة:
- عند إضافة Entities/Serializers مستقبلاً: استخدم exclude واضح للحقول الحساسة.

---

## 8) SSRF - Server-Side Request Forgery

الخطر:
- إجبار السيرفر على استدعاء عناوين داخلية حساسة.

الموجود:
- لا يوجد الآن endpoint يسمح fetch URL حر من المستخدم.

الخطوة المطلوبة:
- إذا تمت إضافة webhook/import from URL مستقبلاً:
  - whitelist domains
  - منع private IP ranges
  - timeout + response size limits

---

## 9) Vulnerable Components

الخطر:
- مكتبات تحتوي CVEs.

الموجود:
- يمكن استخدام npm audit محلياً.

الخطوة المطلوبة:
- تفعيل Dependabot أو Snyk.
- مراجعة شهرية للإصدارات الحساسة (auth, parser, upload, jwt).

---

## 10) Insufficient Logging & Monitoring

الخطر:
- اختراق أو إساءة استخدام بدون تتبع كاف.

الموجود:
- Request correlation logging middleware.
- Audit logs لعمليات حساسة.
- Slow query logging عبر Prisma events.

الخطوة المطلوبة:
- تصدير logs إلى منصة مركزية.
- قواعد تنبيه (failed login burst, lockouts, authorization denials, slow queries spikes).

---

## أوامر تشغيل/تحقق سريعة

```bash
npm run build
npm run start:dev
npm run start:worker:payroll
```

تطبيق SQL migration اليدوي الآمن:

```bash
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260412_add_query_indexes_manual/migration.sql
```
