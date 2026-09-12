# ركيزة — مكتبة المخاطبات والتعاميم

منصة المحكمة العمالية بالرياض للمكاتبات والتعاميم والنماذج القضائية.

المشروع التقني: `rakeza-moj-assistant`  
الرابط: https://rakeza-moj-assistant.vercel.app

## الوصول عند حجب vercel.app

شبكات الوزارة/مزودي الخدمة في السعودية قد تحجب `*.vercel.app`.

- استخدم الرابط البديل على Cloudflare Workers (ليس vercel.app):
  - **https://rakeza-moj-access.iridescent-attempt.workers.dev**
- رابط Vercel الأصلي يبقى للبيئة/الشبكات غير المحجوبة: https://rakeza-moj-assistant.vercel.app
- إعادة نشر الوكيل: انظر `cf-access-proxy/README.md` — يجب «claim» حساب Cloudflare المؤقت خلال ساعة حتى يبقى الرابط.


## التشغيل السريع

```bash
git clone https://github.com/alrasid-dev/rakeeza-v5.git
cd rakeeza-v5
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

افتح: http://localhost:3000/login

## الدخول

- **أول دخول:** من صفحة الدخول اختر «أول دخول (برمجة الرمز)» — أدخل بريد `@moj.gov.sa` وبرمجة رمز ٦ أرقام، ثم يُحفظ.
- **الدخول التالي:** البريد + الرمز الذي برمجتَه.
- رئيس المحكمة داخل المنصة: `snaswig@moj.gov.sa` (دور Admin — ليس ناشر المشروع).

## الصلاحيات

| الدور | التسمية | المؤشرات |
|------|---------|----------|
| Admin | رئيس المحكمة | نعم |
| CourtManager / Secretary | الأمين | لا |
| Judge / Employee | قاضي / موظف | لا |
