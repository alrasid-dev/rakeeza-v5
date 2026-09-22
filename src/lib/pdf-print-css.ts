/**
 * Official A4 print / PDF layout CSS.
 * Used by buildOfficialLetterHtml({ forPdf: true }) and printable previews.
 * Keep QR + official header (brand-row) fixed-aligned on A4.
 */

/** Exact @page + break rules required for printable A4 official letters. */
export const PDF_A4_PAGE_RULES = `@page { size: A4 portrait; margin: 10mm 15mm 15mm 15mm; }
tr, td, .card-block { page-break-inside: avoid !important; }
table { max-width: 100% !important; page-break-inside: auto !important; }
td, th { overflow-wrap: anywhere !important; word-break: normal !important; }
img, svg { max-width: 100% !important; height: auto !important; }
.paper, .body, .section { max-width: 100% !important; overflow-wrap: anywhere !important; page-break-after: auto; }`;

/**
 * Full print stylesheet fragment (no @font-face — fonts come from pdf-font-css).
 * Preserves .brand-row / .court / QR header alignment on A4.
 */
export function buildPdfPrintCss(opts?: {
  fontStack?: string;
  bodyColor?: string;
}): string {
  const font = opts?.fontStack || `'Noto Naskh Arabic', 'Amiri', 'Traditional Arabic', serif`;
  const color = opts?.bodyColor || '#111';
  return `${PDF_A4_PAGE_RULES}
body { margin: 0; color: ${color}; }
/* Default stack only — TipTap inline font-family + color must override (no * !important) */
.paper { font-family: ${font}; font-weight: 400; color: ${color}; }
.bismillah, .bismillah * { color: #fff !important; font-weight: 400 !important; }
/* Official letterhead: LEFT=QR, CENTER=emblem, RIGHT=kingdom/ministry/court */
.brand-row { width: 100%; page-break-inside: avoid; }
.brand-row td { page-break-inside: avoid; vertical-align: middle; }
.official-header, .card-block, .judgment-briefing, .meta {
  page-break-inside: avoid;
}
@media print {
  .cc-row, .cc-icon { display: inline-block !important; visibility: visible !important; }
  .brand-row, .official-header { page-break-after: avoid; }
}
`;
}

/** True when CSS includes the required A4 @page + page-break-inside avoid rules. */
export function pdfPrintCssHasA4Rules(css: string): boolean {
  const hasPage =
    /@page\s*\{[^}]*size:\s*A4\s+portrait/i.test(css) &&
    /margin:\s*10mm\s+15mm\s+15mm\s+15mm/i.test(css);
  const hasBreak =
    /tr\s*,\s*td\s*,\s*\.card-block\s*\{[^}]*page-break-inside:\s*avoid/i.test(css) ||
    (/page-break-inside:\s*avoid/i.test(css) && /\.card-block/.test(css));
  return hasPage && hasBreak;
}
