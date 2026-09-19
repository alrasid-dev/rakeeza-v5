# PDF embedded Arabic fonts (OFL / free)

All TTFs below are embedded as Base64 `@font-face` at PDF render time
(`src/lib/pdf-font-css.ts`). Chromium PDF does **not** depend on system fonts
or Google Fonts URL fetches.

## Required faces (Step 3)

| Family | File | Notes |
|--------|------|--------|
| Amiri | `Amiri-Regular.ttf` | Naskh; also used as Traditional Arabic fallback |
| Cairo | `Cairo-Regular.ttf` | Google Fonts OFL |
| Tajawal | `Tajawal-Regular.ttf` | Google Fonts OFL |
| Almarai | `Almarai-Regular.ttf` | Google Fonts OFL |
| IBM Plex Sans Arabic | `IBMPlexSansArabic-Regular.ttf` | OFL |
| Scheherazade New | `ScheherazadeNew-Regular.ttf` | Also aliases `Sakkal Majalla` |
| Aref Ruqaa | `ArefRuqaa-Regular.ttf` | Display Ruqaa |
| Reem Kufi | `ReemKufi-Regular.ttf` | Kufi |
| Noto Naskh Arabic | `NotoNaskhArabic-Regular.ttf` | jsPDF fallback + safety net |
| Traditional Arabic | *(no TTF)* | **Proprietary (Microsoft).** PDF/preview alias to **Amiri** Naskh-like face under both `Traditional Arabic` and `Amiri` `@font-face` names. |

## Re-download

```bash
# From repo root — uses fonts.gstatic.com CSS2 Regular URLs
npx tsx scripts/download-arabic-fonts.mts
```

Outlook/email keeps concrete font stacks (+ optional Google Fonts `@import`);
Base64 embedding is PDF-only.
