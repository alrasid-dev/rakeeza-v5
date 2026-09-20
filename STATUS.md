## تحديث الدخول
- دخول برمز 6 أرقام + بصمة الجهاز (WebAuthn محلي عبر credentialId).
- ملف الرموز: `data/pins-moj.csv` (سري — للرئيس فقط).

# Rakeeza v5.0.0 — STATUS

**Path:** `/workspace/rakeeza-v5`  
**Build:** `npm run build` ✅ succeeded (2026-09-10)  
**DB:** SQLite via Prisma at `data/rakeeza.db` (seeded)

## How to run

```bash
cd /workspace/rakeeza-v5
npm install
npm run db:setup   # if DB not seeded
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

## Admin credentials

| Field | Value |
|-------|--------|
| Email | `admin@moj.gov.sa` |
| Password | `ChangeMe123!` |
| Note | `mustChangePassword=true` on first login |

## Seeded data

- Court: المحكمة العمالية بالرياض
- 12 org units
- 8 positions with honorifics (رئيس محكمة → فضيلة رئيس المحكمة, …)
- Numbering: `صادر-{year}-{seq}`
- Letterhead footer: للاستخدام الداخلي فقط
- 18 empty document templates + 4 freeform designs
- Admin user only (no real case party names)

## UX / roles (updated)
- Employee home: light cards only (مستند جديد / أرشيفي / دليلي)
- الرئيس (Admin) + الأمين (CourtManager/Secretary): live KPIs + charts
- RegistrationRequest flow + `/admin/registrations` inbox for الرئيس
- Login requires Employee link except seed owner
- Empty branded templates: study, email signature, report cover
- Luxury DOCX export (MOJ green/gold, بسم الله, parties table, banners)

## LIVE features

| Area | Status |
|------|--------|
| Auth (@moj.gov.sa, JWT/jose, roles, first-login PIN programming) | Live |
| Fingerprint button | Live — WebAuthn register + login (credentialId mapping) |
| Dashboard + Recharts placeholders | Live |
| Documents CRUD + numbering on issue + QR | Live |
| Wizard `/documents/new` + paste field distributor | Live |
| Document detail: DOCX/PDF export, Outlook HTML copy, archive | Live |
| Employees CRUD + Excel import API + CLI script | Live |
| Directory with honorifics | Live |
| Templates list | Live |
| Archive / Audit log | Live |
| Reports (Admin/CourtManager) | Live |
| Admin: users, org, titles, numbering, letterhead | Live |
| Smart Import (mammoth/xlsx + local classify) | Live |
| AI assist (local heuristics; OpenAI if `OPENAI_API_KEY`) | Live |
| Public verify `/verify/[number]` | Live |
| Public API `/api/public/documents` + `x-api-key` | Live |
| Settings legal (moj.gov.sa links + iframe) | Live |
| PWA manifest + service worker | Live |
| RTL Arabic + brand colors + Noto Naskh Arabic | Live |
| Logo `public/logo.svg` | Live |

## Stubbed / limited

| Area | Notes |
|------|--------|
| PDF Arabic typography | jsPDF fallback uses logical Arabic — prefer Chromium/DOCX/HTML for best shaping |
| Official circular body | Intentionally empty |
| Fingerprint auth | Live via credentialId mapping (no full WebAuthn signature verification yet) |
| Entra/Azure | Not implemented (by design) |
| Recharts data | Live counts from DB for Admin/أمين dashboard |
| PWA icons PNG | Minimal placeholder PNGs; SVG logo is primary |
| next-pwa package | Manual manifest+SW instead (no paid deps) |

## Stack notes

- Prisma 5.22 + SQLite (better-sqlite3 skipped — native build tools unavailable)
- No paid services required
- Optional: `OPENAI_API_KEY`, `PUBLIC_API_KEY`, `AUTH_SECRET`

## Alternate access (2026-09-12)

- Ministry/ISP blocks `*.vercel.app` → use Cloudflare Workers proxy (**claim within ~60 min**):
  - **https://rakeza-moj-access.iridescent-attempt.workers.dev** ← current hardened worker
  - Claim: https://dash.cloudflare.com/claim-preview?claimToken=-XoYqtJCIc2EPr8Ak8RAlbBGSz_AAYxaHyNVVmY5Q50
  - Prior URL (Decorous Bramble) still answers but cannot be updated without claim/login — migrate to Iridescent Attempt.
- `/api/auth/ping` → `{"ok":true,"db":"turso"}` (246 employees / 4 documents verified)
- Proxy fixes: strip Set-Cookie `Domain=`, no forced Host (X-Forwarded-Host/Proto), binary PDF/DOCX untouched + strip Content-Encoding, Location/URL rewrite, Cache-Control private
- App fixes: SW v2 never intercepts `/api` or exports; middleware honors `X-Forwarded-Host`
- Proxy source: `cf-access-proxy/` — `npx wrangler deploy --temporary`

