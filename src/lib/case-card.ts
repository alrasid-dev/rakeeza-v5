/**
 * Case-card (بطاقة القضية) utilities shared across exporters.
 *
 * The case-card is a two-column table (`<table class="case-card">`) produced
 * when the user pastes a small table (≤10 rows). It is stored in `doc.body`
 * as TipTap HTML with `<td class="label" data-col-type="label">` and
 * `<td class="value" data-col-type="value">` cells.
 *
 * - Outlook / Word (MSO) ignore <style> blocks, so we convert the card to
 *   inline styles (inlineCaseCardStyles).
 * - Excel cannot render raw HTML, so we parse the card into label/value rows
 *   (parseCaseCard).
 */

export const CASE_CARD_GREEN = '#2e9e5c';
export const CASE_CARD_GOLD = '#C5A059';

/** Strip tags/entities from an HTML fragment, keeping line breaks. */
export function stripHtml(s: string): string {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parse a case-card table out of a body HTML string into label/value rows.
 * Returns null when the body has no case-card table.
 */
export function parseCaseCard(html: string | null | undefined): { label: string; value: string }[] | null {
  const table = String(html || '').match(
    /<table\b[^>]*class="[^"]*case-card[^"]*"[^>]*>([\s\S]*?)<\/table>/i,
  );
  if (!table) return null;

  const rows: { label: string; value: string }[] = [];
  for (const rowMatch of String(table[1]).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...String(rowMatch[1]).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cells.length < 2) continue;
    const label = stripHtml(cells[0][1]);
    if (!label) continue;
    const value = stripHtml(cells[1][1]);
    rows.push({ label, value });
  }
  return rows.length ? rows : null;
}

/** A single table cell parsed from generic HTML (content + span + header flag). */
export type HtmlTableCell = {
  content: string;
  colspan: number;
  rowspan: number;
  isHeader: boolean;
};

/** A generic HTML table, ready to be written as real Excel rows/cells. */
export type HtmlTable = {
  rows: { cells: HtmlTableCell[] }[];
};

/**
 * Parse ANY `<table>` out of a body HTML string into grid rows of cells,
 * preserving `colspan`/`rowspan` and header (`<th>`) markers. Used by the
 * Excel exporter to turn a plain table (not a case-card) into real spreadsheet
 * cells instead of raw HTML text. Returns null when there is no `<table>`.
 */
export function parseAnyHtmlTable(html: string | null | undefined): HtmlTable | null {
  const table = String(html || '').match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if (!table) return null;

  const rows: HtmlTable['rows'] = [];
  for (const rowMatch of String(table[1]).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: HtmlTableCell[] = [];
    const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;
    let m: RegExpExecArray | null;
    while ((m = cellRe.exec(String(rowMatch[1])))) {
      const tag = m[1].toLowerCase();
      const attrs = m[2] || '';
      const colspan = Number((attrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1);
      const rowspan = Number((attrs.match(/rowspan\s*=\s*["']?(\d+)/i) || [])[1] || 1);
      cells.push({
        content: stripHtml(m[3]),
        colspan: Math.max(1, colspan),
        rowspan: Math.max(1, rowspan),
        isHeader: tag === 'th',
      });
    }
    if (cells.length) rows.push({ cells });
  }
  return rows.length ? { rows } : null;
}

/** Add (or merge) an inline `style` attribute onto a single HTML tag. */
function addStyle(tag: string, style: string): string {
  if (/style\s*=\s*["']/i.test(tag)) {
    return tag.replace(/style\s*=\s*(["'])(.*?)\1/i, (_s, q: string, old: string) => {
      return `style=${q}${old};${style}${q}`;
    });
  }
  return tag.replace(/\s*\/?>$/, ` style="${style}">`);
}

/** Replace margin/padding/border props on a `<p>` opening tag with the given props. */
function setParagraphProps(p: string, props: string): string {
  const drop = /^(border-bottom|margin|padding)\s*:/i;
  return p.replace(/<p\b([^>]*)>/gi, (_open, attrs: string) => {
    const a = String(attrs || '');
    if (/style\s*=\s*["']/i.test(a)) {
      const newAttrs = a.replace(/style\s*=\s*(["'])(.*?)\1/i, (_s, q: string, st: string) => {
        const cleaned = st
          .split(';')
          .map((x) => x.trim())
          .filter(Boolean)
          .filter((x) => !drop.test(x))
          .join(';');
        return `style=${q}${[cleaned, props].filter(Boolean).join(';')}${q}`;
      });
      return `<p${newAttrs}>`;
    }
    return `<p${a} style="${props}">`;
  });
}

/**
 * Convert a case-card table to fully inline styles so it renders in
 * Outlook / Word (which ignore <style> and class selectors).
 */
export function inlineCaseCardStyles(
  html: string,
  green: string = CASE_CARD_GREEN,
  gold: string = CASE_CARD_GOLD,
): string {
  const tableStyle = `width:100%;border-collapse:collapse;border-spacing:0;table-layout:auto;direction:rtl;border:1px solid ${green};`;
  const labelStyle = `width:0;min-width:max-content;white-space:nowrap;word-break:keep-all;overflow-wrap:normal;background:${green};color:#fff;font-weight:700;padding:10px 14px;text-align:right;vertical-align:middle;border:none;border-left:1px solid ${green};`;
  const valueStyle = `background:#fff;color:#111;padding:10px 14px;text-align:right;vertical-align:middle;border:none;`;

  let out = String(html || '');

  // 1) table.case-card
  out = out.replace(
    /<table\b[^>]*\bclass="[^"]*case-card[^"]*"[^>]*>/gi,
    (m) =>
      addStyle(m, tableStyle),
  );

  // 2) td label / value (class OR data-col-type)
  out = out.replace(/<td\b[^>]*>/gi, (m) => {
    const isLabel = /class="[^"]*\blabel\b[^"]*"|data-col-type="label"/i.test(m);
    const isValue = /class="[^"]*\bvalue\b[^"]*"|data-col-type="value"/i.test(m);
    if (isLabel) {
      return addStyle(
        m,
        labelStyle,
      );
    }
    if (isValue) {
      return addStyle(
        m,
        valueStyle,
      );
    }
    return m;
  });

  // 3) <p> inside cells: dashed separators (value) / no-wrap reset (label)
  out = out.replace(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi, (full, attrs: string, inner: string) => {
    const isLabel = /class="[^"]*\blabel\b[^"]*"|data-col-type="label"/i.test(attrs);
    const isValue = /class="[^"]*\bvalue\b[^"]*"|data-col-type="value"/i.test(attrs);
    if (!isLabel && !isValue) return full;

    const pTags = [...String(inner).matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)];
    if (pTags.length === 0) return full;

    const last = pTags.length - 1;
    let idx = 0;
    const newInner = String(inner).replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, (p) => {
      const isLast = idx === last;
      idx += 1;
      if (isLabel) {
        return setParagraphProps(
          p,
          'margin:0;padding:0;white-space:nowrap',
        );
      }
      return isLast
        ? setParagraphProps(p, 'margin:0;padding:0')
        : setParagraphProps(p, 'margin:0 0 4px 0;padding:0');
    });
    return `<td${attrs}>${newInner}</td>`;
  });

  return out;
}
