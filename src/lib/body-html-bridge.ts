/**
 * Bridge between stored letter body (markers OR TipTap HTML) and export/preview HTML.
 * Letterhead / QR / meta stay outside this body fragment — never rebuilt here.
 */

import { bodyBlocksToHtml, type ParaAlign } from '@/lib/body-align';
import { normalizeHtmlColors } from '@/lib/color-normalize';
import { gridToEditorTableHtml, parseAnyTable } from '@/lib/universal-table-parser';

function escHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** True when body is TipTap/ProseMirror HTML (not marker/plain text). */
export function isBodyHtml(body: string | null | undefined): boolean {
  const s = String(body || '').trim();
  if (!s) return false;
  if (/【|〔/.test(s)) return false;
  return /<(p|div|table|h[1-6]|ul|ol|blockquote|span)\b/i.test(s);
}

/** Marker/plain → HTML suitable for TipTap setContent (load only). */
export function markersToEditorHtml(
  body: string | null | undefined,
  fallbackAlign: ParaAlign = 'right',
): string {
  const raw = String(body ?? '');
  if (!raw.trim()) return '<p></p>';
  if (isBodyHtml(raw)) return raw;
  const html = bodyBlocksToHtml(raw, {
    escape: escHtml,
    fallbackAlign,
  });
  return html.trim() ? html : '<p></p>';
}

/**
 * TipTap getHTML() → storage string.
 * Prefer HTML for fidelity (tables, bg, font-size). Empty editor → ''.
 */
export function editorHtmlToBody(html: string | null | undefined): string {
  const cleaned = String(html || '')
    .replace(/\sdata-pm-slice="[^"]*"/g, '')
    .trim();
  if (!cleaned || cleaned === '<p></p>' || cleaned === '<p><br></p>' || cleaned === '<p><br/></p>') {
    return '';
  }
  return cleaned;
}

/**
 * Body fragment for official-letter-html / Outlook / PDF.
 * HTML bodies pass through; marker bodies use bodyBlocksToHtml.
 */

/** Ensure TipTap/HTML paragraphs keep spaces visible in preview/PDF. */
export function ensurePreWrapOnParagraphs(html: string): string {
  // Case-card cells (label/value) control their own wrapping (label=nowrap,
  // value=overflow-wrap). Protect them so white-space:pre-wrap does not break
  // the nowrap on labels.
  const protectedCells: string[] = [];
  const withPlaceholders = String(html || '').replace(
    /<td\b[^>]*(?:data-col-type="(?:label|value)"|class="[^"]*\b(?:label|value)\b[^"]*")[^>]*>[\s\S]*?<\/td>/gi,
    (cell) => {
      protectedCells.push(cell);
      return `\u0000CASE_CARD_CELL_${protectedCells.length - 1}\u0000`;
    },
  );

  const processed = withPlaceholders.replace(/<p(\s[^>]*)?>/gi, (full, attrs = '') => {
    const a = attrs || '';
    if (/white-space\s*:/i.test(a)) return full;
    if (/style\s*=\s*"/i.test(a)) {
      return full.replace(/style\s*=\s*"/i, 'style="white-space:pre-wrap;');
    }
    return `<p${a} style="white-space:pre-wrap">`;
  });

  return processed.replace(/\u0000CASE_CARD_CELL_(\d+)\u0000/g, (_m, i: string) =>
    protectedCells[Number(i)],
  );
}

/** Convert plain tabular text (TSV/CSV/pipe) into a styled bordered table, else ''. */
function tabularTextToTableHtml(text: string): string {
  const table = parseAnyTable(text);
  const hasTableShape = table.grid.length >= 2 && table.grid[0].length >= 2;
  if (!hasTableShape) return '';
  if (table.source !== 'plain' && table.source !== 'html') return '';
  if (table.source === 'plain' && !/[\t,،|]/.test(text)) return '';
  return gridToEditorTableHtml(table.grid, { bordered: true, headers: table.hasHeader });
}

export function bodyToExportHtml(
  body: string | null | undefined,
  opts?: { fallbackAlign?: ParaAlign; escape?: (s: string) => string; fontFamily?: string | null },
): string {
  const raw = String(body ?? '');
  if (!raw.trim()) return '';
  if (isBodyHtml(raw)) return ensurePreWrapOnParagraphs(normalizeHtmlColors(raw));
  // Auto-convert received tabular text into a bordered table when not HTML yet.
  const tableHtml = tabularTextToTableHtml(raw);
  if (tableHtml) return tableHtml;
  return bodyBlocksToHtml(raw, {
    escape: opts?.escape || escHtml,
    fallbackAlign: opts?.fallbackAlign || 'right',
    fontFamily: opts?.fontFamily,
  });
}

/** Extract only the editable body inner HTML from a full official letter document. */
export function extractBodyFromFullLetterHtml(fullHtml: string): string | null {
  const m = String(fullHtml || '').match(
    /<div class="body"[^>]*data-field="body"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (m) return m[1];
  const m2 = String(fullHtml || '').match(
    /<div[^>]*data-field="body"[^>]*class="body"[^>]*>([\s\S]*?)<\/div>/i,
  );
  return m2 ? m2[1] : null;
}

/**
 * Prove a style mutation touched only the body fragment — letterhead chrome unchanged.
 * Returns { ok, beforeBody, afterBody, chromeEqual }.
 */
export function assertChromePreserved(
  fullBefore: string,
  fullAfter: string,
): { ok: boolean; chromeEqual: boolean; bodyChanged: boolean; message: string } {
  const stripBody = (html: string) =>
    html
      .replace(/<div class="body"[^>]*>[\s\S]*?<\/div>/i, '<!--BODY-->')
      .replace(/<div[^>]*data-field="body"[^>]*>[\s\S]*?<\/div>/i, '<!--BODY-->');
  const chromeEqual = stripBody(fullBefore) === stripBody(fullAfter);
  const b0 = extractBodyFromFullLetterHtml(fullBefore) ?? '';
  const b1 = extractBodyFromFullLetterHtml(fullAfter) ?? '';
  const bodyChanged = b0 !== b1;
  const ok = chromeEqual && bodyChanged;
  return {
    ok,
    chromeEqual,
    bodyChanged,
    message: ok
      ? 'chrome preserved; only body mutated'
      : `chromeEqual=${chromeEqual} bodyChanged=${bodyChanged}`,
  };
}


/** Plain text for clipboard fingerprint / plain export. */
export function bodyToPlainText(body: string | null | undefined): string {
  const raw = String(body ?? '');
  if (!raw.trim()) return '';
  if (isBodyHtml(raw)) {
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  // marker body — strip marks via simple regex (avoid circular import)
  return raw
    .replace(/【ك:#[0-9A-Fa-f]{3,8}】/g, '')
    .replace(/【\/?ك】/g, '')
    .replace(/【\/?(?:ح٢|ح|ع)】/g, '')
    .replace(/〔(?:يمين|وسط|يسار)〕\s*/g, '')
    .trim();
}
