# إعداد نظام التتبع مع Cloudflare D1

## الخطوات:

### 1. تثبيت wrangler
```bash
npm install -g wrangler
```

### 2. تسجيل الدخول إلى Cloudflare
```bash
wrangler login
```

### 3. إنشاء D1 Database
```bash
wrangler d1 create chemistry_quiz
```
سيعطيك `database_id` — ضعه في `wrangler.toml`

### 4. تحديث wrangler.toml
استبدل `your-db-id` في `wrangler.toml` بـ database ID الفعلي

### 5. نشر الـ Worker
```bash
wrangler deploy
```

### 6. تفعيل Pages
إذا كنت تستخدم Cloudflare Pages:
- ربط المستودع على Pages
- تأكد أن بناء المشروع موجه لـ `public/` أو الملفات الثابتة

## الاستخدام:

### لوحة التحكم:
- اذهب إلى: `/khd`
- أدخل كلمة المرور: `khd2024`
- شاهد الإحصائيات:
  - عدد زيارات الصفحة
  - عدد الاختبارات المكتملة
  - متوسط النسبة المئوية
  - تفاصيل جميع النتائج

### التطبيق يقوم به تلقائيًا:
- تتبع كل زيارة للصفحة
- حفظ كل نتيجة اختبار

## تغيير كلمة المرور:
عدّل `ADMIN_PASSWORD` في `src/worker.js`

## الملفات الرئيسية:
- `src/worker.js` — الـ API والوحة التحكم
- `js/app.js` — التطبيق الرئيسي مع إرسال البيانات
- `wrangler.toml` — إعدادات Cloudflare
