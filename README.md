# rakeza-moj-assistant

# ركيزة للمكاتبات والنماذج القضائية — Rakeeza v5.0.0

منصة ويب للمكاتبات والنماذج القضائية — المحكمة العمالية بالرياض.

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

- **مالك المنصة / رئيس المحكمة:** `snaswig@moj.gov.sa` — رمز ٦ أرقام يُدار من `/admin/pins`
- بعد أول إعداد محلي شغّل `npx tsx scripts/provision-pins.ts` مرة واحدة (إن لزم) أو عيّن الرموز من لوحة **رموز الدخول**
- حساب تقني احتياطي للبذرة: `admin@moj.gov.sa` (ليس بديلاً عن المالك)

## الصلاحيات

| الدور | التسمية | المؤشرات |
|------|---------|----------|
| Admin | رئيس المحكمة / مالك المنصة | نعم |
| CourtManager / Secretary | الأمين | لا |
| Judge / Employee | قاضي / موظف | لا — شاشة خفيفة |

## ملاحظات أمنية

- لا ترفع `data/pins-moj.csv` أو ملفات `.db`
- الرموز تُدار من داخل المنصة بواسطة المالك
