# ركيزة للمكاتبات والنماذج القضائية — Rakeeza v5.0.0

منصة ويب مجانية بالكامل (بدون خدمات مدفوعة إلزامية) للمكاتبات والنماذج القضائية — المحكمة العمالية بالرياض.

## Stack / التقنية

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- SQLite عبر Prisma
- مصادقة JWT بـ `jose` (بريد `@moj.gov.sa` فقط)
- PWA يدوي (`manifest.json` + `sw.js`)
- خطوط: Noto Naskh Arabic + Traditional Arabic / Sakkal Majalla

## Quick start / التشغيل السريع

```bash
cd /workspace/rakeeza-v5
cp .env.example .env   # إن لم يكن موجوداً
npm install
npm run db:setup       # generate + push + seed
npm run dev            # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

## Admin credentials / بيانات المدير

- Email: `admin@moj.gov.sa`
- Password: `ChangeMe123!`
- عند أول دخول يُطلب تغيير كلمة المرور.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | تطوير |
| `npm run build` | بناء |
| `npm start` | تشغيل الإنتاج |
| `npm run db:seed` | بذر قاعدة البيانات |
| `npm run db:setup` | generate + push + seed |
| `npm run import:employees -- file.xlsx` | استيراد موظفين |

## Optional

- `OPENAI_API_KEY` في `.env` لتفعيل المساعد السحابي؛ بدونها يعمل مساعد محلي.
- `PUBLIC_API_KEY` لمسار `/api/public/documents` (رأس `x-api-key`).

## License

للاستخدام الداخلي للمحكمة — «للاستخدام الداخلي فقط».
