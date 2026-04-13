# الدليل الشامل للباك إند (NestJS) — مشروع warehouse-system

> هذا الملف مرجع تعليمي عملي مبني على الباك إند الموجود عندك فعلياً.
> الهدف: تتعلم NestJS بعمق انطلاقاً من خبرتك بـ Express، وتعرف ماذا تستخدم الآن وماذا يجب أن تعتمده لاحقاً.

---

## 1) الملخص التنفيذي

### ما تستخدمه الآن فعلياً
- NestJS 11
- PostgreSQL + Prisma
- JWT auth (Cookie + Bearer حسب البيئة)
- ConfigModule + Joi validation لمتغيرات البيئة
- Global ValidationPipe
- Global Exception Filter
- Helmet + Compression + Cookie Parser
- ThrottlerGuard بشكل global
- BullMQ + Redis (مفعّل حسب البيئة عبر `QUEUES_ENABLED`)
- بنية domain modules قوية (employees/attendance/payroll/inventory/imports...)

### ما يجب أن تلتزم به لتطوير المستوى
- اعتماد تصميم قائم على use-cases داخل كل module (service boundaries أوضح)
- تشديد اختبارات e2e للـ auth/permissions/financial flows
- تحسين observability (structured logging + tracing)
- اعتماد migration discipline أفضل في production
- توحيد response/error contract بين كل endpoints

---

## 2) خريطة مشروعك الحالي (Backend)

### Modules الأساسية الموجودة فعلاً
- `auth`
- `employees`
- `devices`
- `attendance`
- `payroll`
- `salary`
- `advances`
- `insurance`
- `bonuses`
- `inventory`
- `imports`
- `files`
- `health`
- `prisma`
- `queues`
- `common`

### المعنى المعماري
هذا التقسيم ممتاز لأنه Domain-Oriented:
- كل مجال أعمال له Module خاص
- قابلية التوسع أعلى من بنية Express المسطحة
- سهولة فرض الصلاحيات والاختبارات حسب الدومين

---

## 3) مفاهيم NestJS التي تحتاج إتقانها (مترجمة من Express mindset)

## 3.1 من Express Router إلى Nest Module System
في Express غالباً نربط routes + handlers مباشرة.
في Nest:
- `Controller`: تعريف endpoints
- `Service`: منطق الأعمال
- `Module`: تجميع واعتماديات
- `Provider`: خدمات قابلة للحقن

هذا يفرض فصل مسؤوليات واضح جداً.

## 3.2 Dependency Injection (DI)
Nest يوفر DI افتراضياً.
المكاسب:
- اختبار أسهل (mock providers)
- استبدال تنفيذات أسرع
- تقليل الترابط بين الطبقات

## 3.3 Guards + Decorators + Permissions
بدل `if role !== admin` داخل كل route:
- Guards مركزية
- Decorators للصلاحيات
- سياسات موحدة على مستوى النظام

هذا يعطيك أمان أعلى وصيانة أسهل.

## 3.4 Pipes + DTO Validation
`ValidationPipe` العالمي في مشروعك نقطة ممتازة:
- تنظيف payload (`whitelist: true`)
- منع حقول غير مسموحة (`forbidNonWhitelisted`)
- تحويل أنواع تلقائي (`transform: true`)

يعني endpoint أقوى ضد بيانات خاطئة.

## 3.5 Filters + Middleware
- GlobalExceptionFilter: توحيد الأخطاء
- RequestLoggingMiddleware: تتبع الطلبات

هذه أدوات أساسية للإنتاج وليس فقط للتطوير.

---

## 4) دورة الطلب Request Lifecycle عندك

الطلب يمر تقريباً بهذا الترتيب:
1. Middleware (تسجيل الطلب)
2. Guards (auth + permissions + throttling)
3. Pipes (validation + transformation)
4. Controller
5. Service (business logic)
6. Prisma/Queue/Storage
7. Exception Filter (إذا حدث خطأ)
8. Response موحد

فهم هذا التسلسل مهم جداً لاختيار المكان الصحيح لكل منطق.

---

## 5) الأمان في الباك إند (مطبق حالياً + المطلوب)

### مطبق حالياً بشكل جيد
- Joi schema قوي لمتغيرات البيئة
- JWT cookie config + bearer support
- CORS مضبوط بقائمة origins (مع fallback dev)
- Helmet + Compression
- Throttler global
- حسابات محمية bootstrap + سياسات auth

### يجب تحسينه
1. Security headers policy أدق:
- إضافة CSP ملائمة حسب الواجهة والنشر

2. توحيد audit trail:
- ربط كل العمليات الحساسة بـ actor + request id

3. تشديد الإنتاج:
- تأكيد `JWT_COOKIE_SECURE=true`
- تأكيد `JWT_COOKIE_SAME_SITE=none` عند cross-site
- تفعيل token revocation strategy المناسبة

4. تعزيز authorization tests:
- اختبار رفض الوصول لكل endpoint حسب role matrix

---

## 6) البيانات وقاعدة البيانات (Prisma + PostgreSQL)

## 6.1 لماذا Prisma مناسب هنا
- Type-safe queries
- schema موحد واضح
- تكامل ممتاز مع TypeScript

## 6.2 قواعد يجب اتباعها
- استخدم `Decimal` للرواتب والمبالغ المالية (موجود عندك وهذا ممتاز)
- استخدم transactions للعمليات متعددة الجداول (خصوصاً payroll)
- لا تعتمد `db push` كاستراتيجية production دائمة

## 6.3 سياسة migration المقترحة
- Dev: `prisma migrate dev` أو `db push` عند الحاجة السريعة
- Prod: migrations ثابتة + مراجعة قبل التطبيق
- تجنب تغييرات schema المباشرة غير المتتبعة

---

## 7) المهام غير المتزامنة (BullMQ + Redis)

مشروعك يدعم نمطين:
- Sync endpoints
- Async endpoints عبر Queue

هذا ممتاز للاستيراد وحساب الرواتب الثقيلة.

### قواعد تشغيل صحيحة
- Local development: `QUEUES_ENABLED=false` إن كنت لا تحتاج Redis
- Production: يفضل `QUEUES_ENABLED=true`
- تأكد من retry/backoff مخصصين لكل job type
- راقب failed jobs مع dashboard/alerts

---

## 8) الجودة والاختبارات

### الموجود حالياً
- e2e tests موجودة لعدة مجالات (`security`, `imports`, `files`)
- بنية مناسبة للتوسع في التغطية

### المطلوب للوصول لمستوى قوي جداً
1. Contract Tests:
- تثبيت شكل response والأخطاء لكل endpoint رئيسي

2. Authorization Matrix Tests:
- لكل role ما المسموح والممنوع

3. Financial Integrity Tests:
- payroll calculation consistency
- approval/reject transitions

4. Import Robustness Tests:
- ملفات كبيرة
- صفوف فيها أخطاء متعددة
- retry logic

---

## 9) الأداء وObservability

## 9.1 تحسينات أداء مباشرة
- Pagination إجباري لكل list endpoint كبير
- indices مناسبة في PostgreSQL (مراجعة دورية)
- تجنب over-fetching (select fields)
- نقل العمليات الثقيلة إلى queue

## 9.2 تحسينات observability لازمة
- Structured logs (JSON) مع correlation id
- Metrics:
  - latency لكل endpoint
  - queue depth
  - failed jobs rate
  - DB slow queries
- Alerts على health/ready/failure spikes

---

## 10) ماذا تستخدم الآن vs ماذا يجب استخدامه

| المحور | مستخدم الآن | يجب الاستمرار | يجب إضافته |
|---|---|---|---|
| Framework | NestJS + Modules | نعم | تقسيم use-cases أوضح داخل services |
| Validation | Global ValidationPipe + DTO | نعم | توحيد رسائل الأخطاء وتنسيقها |
| Auth | JWT + Cookie + Guards | نعم | توسيع اختبارات الصلاحيات |
| DB | Prisma + PostgreSQL | نعم | migration discipline للإنتاج |
| Async | BullMQ (شرطي) | نعم | مراقبة jobs وقياسات queue |
| Security | Helmet + Throttle + CORS | نعم | CSP + audit tracking أقوى |
| Testing | e2e جزئي | نعم | تغطية أوسع للمسارات الحساسة |

---

## 11) خطة تعلم عملية NestJS (مخصصة لخبرتك بـ Express)

## المرحلة 1 (3-5 أيام): Nest core architecture
- فهم Modules/Controllers/Services/Providers
- تحويل route منطقياً إلى use-case layers
- تدريب على custom decorators + guards

## المرحلة 2 (5-7 أيام): Validation & Security
- DTO متقدمة + class-validator patterns
- authorization matrix واضحة لكل endpoint
- hardening إعدادات JWT/CORS/Cookies للإنتاج

## المرحلة 3 (5-7 أيام): Data & Async
- Prisma transactions للعميات المركبة
- تحسين تصميم jobs في BullMQ
- retry/dead-letter strategy

## المرحلة 4 (5 أيام): Testing & Operations
- e2e للأولويات المالية والأمان
- structured logs + metrics أساسية
- runbook أعطال جاهز

---

## 12) Checklist إلزامي قبل أي تسليم Backend

- [ ] `npm run build` يمر بدون أخطاء
- [ ] `npm run test:e2e` للمسارات الحرجة يمر
- [ ] فحص auth/me + login/logout + permission denial
- [ ] فحص import validation قبل التشغيل الفعلي
- [ ] فحص payroll sync/async وتطابق النتائج
- [ ] فحص health/live/ready
- [ ] مراجعة env الإنتاج (JWT, CORS, QUEUES, DATABASE_URL)

---

## 13) مقارنة نهائية شاملة (Next.js vs NestJS)

> هذه المقارنة موجهة لك تحديداً لأن خلفيتك React + Express.

| البند | Next.js (Frontend) | NestJS (Backend) |
|---|---|---|
| ما يمثله في النظام | واجهة وتجربة مستخدم | عقل النظام وقواعد العمل |
| نقطة البداية الذهنية | React Components + App Router | Express مطوّر إلى بنية مؤسسية منظمة |
| الوحدة الأساسية | Component / Route Segment | Module / Controller / Service |
| إدارة الحالة | Zustand (محلي) + React Query (سيرفر) | لا "state UI"؛ يوجد state business + DB |
| البيانات | استهلاك API وعرضها | تعريف API وتطبيق القواعد عليها |
| الأمن | Guards على المسارات وUX auth flow | توثيق، تفويض، تحقق، منع abuse |
| الأداء | bundle size, hydration, rendering | latency, DB efficiency, queue throughput |
| الاختبارات الحرجة | user flows وواجهات حساسة | authorization + data integrity + contracts |
| فشل شائع | واجهة بطيئة أو calls متكررة | قواعد راتب/صلاحيات خاطئة أو تسرب بيانات |
| معيار النجاح | UX سلس وسريع وواضح | نتائج دقيقة وآمنة وقابلة للتوسع |

### مقارنة مباشرة مع خبرتك السابقة
- React -> Next.js:
  - الفرق الأكبر: فلسفة rendering (Server/Client) وهيكلة routes بالملفات.
- Express -> NestJS:
  - الفرق الأكبر: الانضباط المعماري عبر DI + modules + decorators.

### كيف تشتغل بينهما باحتراف
1. عقد API واضح (DTOs + errors) من الباك.
2. hooks نظيفة في الفرونت تستهلك العقد بدون منطق أعمال ثقيل.
3. أي قاعدة أعمال مهمة تُنفذ في الباك فقط.
4. الفرونت يتحسن UX؛ الباك يضمن correctness.

---

## 14) أوامر يومية مقترحة (Backend)

```bash
npm run infra:up
npm run start:dev
npm run build
npm run test:e2e
```

أوامر Prisma الشائعة:

```bash
npm run prisma:generate
npm run prisma:push
```

> في التطوير السريع يمكن استخدام `db push`، لكن في الإنتاج الأفضل اعتماد migrations ثابتة ومدروسة.
