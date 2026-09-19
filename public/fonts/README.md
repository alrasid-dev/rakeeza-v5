# PDF embedded Arabic fonts

- `NotoNaskhArabic-Regular.ttf` — always required (jsPDF + Chromium fallback)
- `Amiri-Regular.ttf` — preferred for Traditional Arabic / El Messiri / Markazi / Harmattan
- `ScheherazadeNew-Regular.ttf` — preferred for Sakkal Majalla

If Amiri/Scheherazade download fails, PDF still sets the selected family name via
`exportFontStack` and injects Google Fonts `@import` so Chromium can load web fonts.
