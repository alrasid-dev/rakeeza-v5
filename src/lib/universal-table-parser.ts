/**
 * Universal Table & Model Adaptor (المحرك الذكي لقراءة وتكييف النماذج والجداول).
 *
 * Accepts ANY pasted/imported table — HTML from Word/Excel/Outlook OR plain
 * text (TSV / CSV / pipe / whitespace columns / vertical key-value) — and
 * normalises it into a rectangular grid, detects the header row, aggregates
 * duplicated person/case rows (Smart Aggregation & Deduplication), and can
 * re-emit the grid as platform-identity HTML or TSV.
 *
 * Pure string/regex implementation — no DOM, works in browser + Node.
 */

export type Grid = string[][];

export type ParsedTable = {
  grid: Grid;
  headerRowIndex: number;
  hasHeader: boolean;
  source: 'html' | 'plain';
  tableCount: number;
};

/* ------------------------------------------------------------------ */
/* HTML decoding / cleanup                                             */
/* ------------------------------------------------------------------ */

function decodeEntities(s: string): string {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lrm;|&rlm;/gi, '')
    .replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/gi, '');
}

/** Remove MS Office conditional comments and ordinary comments. */
function stripHtmlComments(html: string): string {
  return String(html || '')
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/** Strip the CF_HTML clipboard envelope header (Version/StartHTML byte offsets…). */
function stripCfHtmlHeader(html: string): string {
  return String(html || '')
    .replace(/^\uFEFF/, '')
    .replace(
      /^(?:(?:Version|StartHTML|EndHTML|StartFragment|EndFragment|StartSelection|EndSelection|SourceURL)\s*:[^\r\n]*(?:\r?\n|$))+/i,
      '',
    );
}

/**
 * Excel HTML Sanitizer — normalise raw clipboard `text/html` (Excel / Word /
 * Outlook / CF_HTML) before parsing. Removes the CF_HTML header, MS Office
 * conditional comments (`<!--[if gte mso …]>…<![endif]-->`), fragment markers
 * (`<!--StartFragment-->` / `<!--EndFragment-->`) and every other comment so
 * the embedded `<table>` — even when wrapped in `<html><body><meta>` and
 * decorated with `xmlns:o` / `class="xl…"` — becomes visible to the parser.
 */
export function sanitizeClipboardHtml(html: string): string {
  return stripHtmlComments(stripCfHtmlHeader(html));
}

/**
 * Excel TSV Plain Text Fallback — detect Excel's plain-text clipboard format:
 * copied cells are emitted as lines whose values are separated by Tab (\t).
 * Requires at least two non-empty lines and a tab on the tabulated lines.
 */
export function looksLikeExcelTsv(text: string): boolean {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  const tabbed = lines.filter((l) => l.includes('\t')).length;
  return tabbed >= 2;
}

/**
 * True when the HTML carries any table-like structure — a full `<table>`,
 * or floating `<tr>`/`<td>`/`<th>` fragments (Excel sometimes emits rows/cells
 * wrapped in `<div>`/`<span>` without an outer `<table>`).
 */
export function looksLikeTableHtml(html: string): boolean {
  return /<(?:table|tr|td|th)\b/i.test(String(html || ''));
}

/**
 * Floating TR/TD Auto-Wrapping — Excel clipboard occasionally contains
 * `<tr>`/`<td>`/`<th>` fragments with no outer `<table>` (or wrapped in
 * `<div>`/`<span>`). Wrap them into a single `<table>…</table>` so the
 * Universal Table Adaptor and TipTap's table schema can see a real table.
 */
export function wrapFloatingTableRows(html: string): string {
  let h = String(html || '');
  if (/<table\b/i.test(h)) return h;
  if (!/<(?:tr|td|th)\b/i.test(h)) return h;

  if (/<tr\b/i.test(h)) {
    const rows = h.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    if (rows.length) {
      const first = h.search(/<tr\b/i);
      const last = h.lastIndexOf('</tr>') + '</tr>'.length;
      return h.slice(0, first) + `<table>${rows.join('')}</table>` + h.slice(last);
    }
  }

  const cells = h.match(/<(?:td|th)\b[\s\S]*?<\/(?:td|th)>/gi) || [];
  if (cells.length) return `<table><tr>${cells.join('')}</tr></table>`;
  return h;
}

function cellText(raw: string): string {
  return decodeEntities(
    String(raw || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/* ------------------------------------------------------------------ */
/* HTML table parsing                                                  */
/* ------------------------------------------------------------------ */

/** Split one `<table>…</table>` inner content into rows of cells. */
function parseTableBlock(block: string): Grid {
  const rows = block.match(/<tr[\s>][\s\S]*?<\/tr>/gi) || [];
  const grid: Grid = [];
  const rowspanCarry: string[][] = [];

  for (const rowHtml of rows) {
    const cells = rowHtml.match(/<(?:td|th)\b[^>]*>[\s\S]*?<\/(?:td|th)>/gi) || [];
    const outRow: string[] = [];
    let col = 0;

    for (const cell of cells) {
      while (rowspanCarry[col] && rowspanCarry[col].length) {
        outRow.push(rowspanCarry[col].shift() || '');
        col += 1;
      }
      const attrs = (cell.match(/^<(?:td|th)([^>]*)>/i) || [])[1] || '';
      const colspan = Number((attrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1);
      const rowspan = Number((attrs.match(/rowspan\s*=\s*["']?(\d+)/i) || [])[1] || 1);
      const text = cellText(cell.replace(/^<(?:td|th)[^>]*>/i, '').replace(/<\/(?:td|th)>$/i, ''));

      for (let c = 0; c < colspan; c += 1) {
        outRow.push(text);
        col += 1;
      }
      if (rowspan > 1) {
        const baseCol = col - colspan;
        for (let r = 1; r < rowspan; r += 1) {
          while (rowspanCarry.length <= baseCol + colspan - 1) rowspanCarry.push([]);
          for (let c = 0; c < colspan; c += 1) rowspanCarry[baseCol + c].push(text);
        }
      }
    }
    while (rowspanCarry[col] && rowspanCarry[col].length) {
      outRow.push(rowspanCarry[col].shift() || '');
      col += 1;
    }
    if (outRow.some((c) => c.trim())) grid.push(outRow);
  }

  return grid;
}

/** Parse every HTML table found in the clipboard string. */
export function parseHtmlTables(html: string): Grid[] {
  const cleaned = wrapFloatingTableRows(sanitizeClipboardHtml(String(html || '')));
  const blocks = cleaned.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  return blocks
    .map((b) => parseTableBlock(b.replace(/^<table\b[^>]*>/i, '').replace(/<\/table>$/i, '')))
    .filter((g) => g.length && g.some((r) => r.some((c) => c.trim())));
}


/* ------------------------------------------------------------------ */
/* Plain-text table parsing                                            */
/* ------------------------------------------------------------------ */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function normalizeDigits(s: string): string {
  return String(s || '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

/** Best delimiter for a single plain line. */
function pickDelimiter(line: string): '\t' | '|' | ',' | 'ws' {
  if (line.includes('\t')) return '\t';
  if (line.includes('|')) return '|';
  const commas = (line.match(/[,،]/g) || []).length;
  const gaps = (line.match(/ {2,}/g) || []).length;
  if (commas >= 2) return ',';
  if (gaps >= 1) return 'ws';
  return '\t';
}

function splitPlainLine(line: string, delim: '\t' | '|' | ',' | 'ws'): string[] {
  if (delim === '\t') return line.split('\t');
  if (delim === '|') return line.split(/\|/);
  if (delim === ',') return line.split(/[,،]/);
  return line.split(/ {2,}/);
}

/** Parse plain text (multi-line) into a grid, choosing delimiter per line. */
export function parsePlainTable(text: string): Grid {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const first = lines.find((l) => l.trim());
  const delim = first ? pickDelimiter(first) : '\t';
  const grid: Grid = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const cells = splitPlainLine(line, delim).map((c) => c.trim());
    if (cells.some((c) => c)) grid.push(cells);
  }
  return grid;
}

/* ------------------------------------------------------------------ */
/* Normalisation + header detection                                    */
/* ------------------------------------------------------------------ */

function cleanCell(cell: string): string {
  return decodeEntities(String(cell || '')).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function cleanGrid(grid: Grid): Grid {
  let g = (grid || []).map((row) => row.map(cleanCell));
  g = g.filter((row) => row.some((c) => c));
  const width = g.reduce((w, r) => Math.max(w, r.length), 0);
  for (let col = width - 1; col >= 0; col -= 1) {
    if (g.every((r) => !(r[col] || ''))) g = g.map((r) => r.slice(0, col));
  }
  const w2 = g.reduce((w, r) => Math.max(w, r.length), 0);
  return g.map((r) => Array.from({ length: w2 }, (_, i) => r[i] || ''));
}

const HEADER_LABEL_RE =
  /^(?:الاسم|الأسماء|اسم|م|رقم|الهوية|رقم القضية|القضية|المدعي|المدعى|الملاحظ|الملاحظات|بيان|البيان|التشكيل|الحقل|القيمة|مسمي|الوظيفة|الجهة|القضايا|أسماء)$/;

/** Heuristically detect which row is the header. Returns -1 when none. */
export function detectHeaderRow(grid: Grid): number {
  const g = cleanGrid(grid);
  if (!g.length) return -1;
  const width = g[0].length;
  const scoreRow = (row: string[], idx: number): number => {
    let score = 0;
    for (const c of row) {
      if (!c) continue;
      if (HEADER_LABEL_RE.test(c)) score += 2;
      else if (/^[\u0600-\u06FF ]{1,24}$/.test(c) && !/\d/.test(c) && c.length <= 20) score += 1;
      else if (/^\d{4,}$/.test(normalizeDigits(c))) score -= 1;
    }
    return score - (idx === 0 ? 0 : 1);
  };
  let best = 0;
  let bestScore = -Infinity;
  g.slice(0, Math.min(3, g.length)).forEach((row, i) => {
    const s = scoreRow(row, i);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  });
  return bestScore > 0 && width > 1 ? best : -1;
}

export function gridToTsv(grid: Grid): string {
  return cleanGrid(grid)
    .map((r) => r.join('\t'))
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Column heuristics → TableRow[]                                       */
/* ------------------------------------------------------------------ */

const ID_RE = /^\d{9,15}$/;
const NAME_RE = /[\u0600-\u06FF]/;

function columnKind(cells: string[]): 'id' | 'name' | 'other' {
  const nonEmpty = cells.filter(Boolean);
  if (!nonEmpty.length) return 'other';
  const stripped = nonEmpty.map((c) => normalizeDigits(c.replace(/[-\s]/g, '')));
  if (stripped.every((c) => ID_RE.test(c))) return 'id';
  const nameRatio =
    nonEmpty.filter((c) => NAME_RE.test(c) && !ID_RE.test(normalizeDigits(c.replace(/[-\s]/g, '')))).length /
    nonEmpty.length;
  if (nameRatio > 0.5) return 'name';
  return 'other';
}

/** Convert a grid into the platform's name/id/extra party rows. */
export function gridToTableRows(grid: Grid): { name: string; id?: string; extra?: string }[] {
  const g = cleanGrid(grid);
  if (!g.length) return [];
  const headerIdx = detectHeaderRow(g);
  const body = headerIdx >= 0 ? g.slice(headerIdx + 1) : g;
  if (!body.length) return [];

  const width = g[0].length;
  const kinds = Array.from({ length: width }, (_, i) => columnKind(body.map((r) => r[i])));

  let nameCol = kinds.indexOf('name');
  if (nameCol < 0) nameCol = 0;
  const idCol = kinds.indexOf('id');

  return body
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => {
      const extraParts: string[] = [];
      r.forEach((c, i) => {
        if (i === nameCol || i === idCol) return;
        if (c.trim()) extraParts.push(c.trim());
      });
      return {
        name: (r[nameCol] || '').replace(/^\d+[.\-\)]\s*/, '').trim(),
        id: idCol >= 0 ? normalizeDigits(r[idCol] || '').replace(/\D/g, '') || undefined : undefined,
        extra: extraParts.length ? extraParts.join(' — ') : undefined,
      };
    })
    .filter((r) => r.name || r.id);
}

/* ------------------------------------------------------------------ */
/* Smart Aggregation & Deduplication                                   */
/* ------------------------------------------------------------------ */

/** Normalise a person name for grouping (alef/hamza/ta-marbuta variants). */
export function personKey(name: string): string {
  const HONORIFICS =
    /^(?:فضيلة|سعادة|معالي|سمو|الأستاذ|الاستاذ|الأستاذة|الاستاذة|الشيخ|القاضي|القاضية)\s+/;
  let n = String(name || '');
  let prev = '';
  while (n !== prev) {
    prev = n;
    n = n.replace(HONORIFICS, '');
  }
  return n
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ً|ٌ|ٍ|َ|ُ|ِ|ْ|ّ|ٰ/g, '')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinDistinct(values: string[], sep = '، '): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = String(v || '').trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join(sep);
}

export type AggregationResult = {
  grid: Grid;
  mergedCount: number;
  entityColumn: number;
};

/**
 * Group duplicate rows by their "person/entity" column and merge distinct
 * values (case numbers, notes, …) so a person appears once with all their
 * cases/observations gathered under one record.
 */
export function aggregateGrid(grid: Grid): AggregationResult {
  const g = cleanGrid(grid);
  if (!g.length) return { grid: g, mergedCount: 0, entityColumn: 0 };

  const headerIdx = detectHeaderRow(g);
  const body = headerIdx >= 0 ? g.slice(headerIdx + 1) : g;
  if (body.length < 2) return { grid: g, mergedCount: 0, entityColumn: 0 };

  const width = g[0].length;
  const kinds = Array.from({ length: width }, (_, i) => columnKind(body.map((r) => r[i])));
  let entityCol = kinds.indexOf('name');
  if (entityCol < 0) entityCol = body[0].findIndex((c) => NAME_RE.test(c));
  if (entityCol < 0) entityCol = 0;

  const groups = new Map<string, string[][]>();
  const order: string[] = [];
  for (const row of body) {
    const key = personKey(row[entityCol] || '') || `__row_${order.length}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  }

  const merged: string[][] = [];
  let mergedCount = 0;
  for (const key of order) {
    const rows = groups.get(key)!;
    if (rows.length > 1) mergedCount += rows.length - 1;
    const outRow: string[] = [];
    for (let col = 0; col < width; col += 1) {
      const values = rows.map((r) => r[col]).filter((v) => String(v || '').trim());
      outRow[col] = col === entityCol ? values[0] || '' : joinDistinct(values);
    }
    merged.push(outRow);
  }

  const header = headerIdx >= 0 ? [g[headerIdx]] : [];
  return { grid: cleanGrid([...header, ...merged]), mergedCount, entityColumn: entityCol };
}


/* ------------------------------------------------------------------ */
/* Public entry points                                                 */
/* ------------------------------------------------------------------ */

export function parseAnyTable(input: string): ParsedTable {
  const raw = String(input || '');
  const html = wrapFloatingTableRows(sanitizeClipboardHtml(raw));
  if (/<table\b/i.test(html)) {
    const tables = parseHtmlTables(html);
    if (tables.length) {
      const best = tables.reduce(
        (a, b) => (b.flat().filter(Boolean).length > a.flat().filter(Boolean).length ? b : a),
        tables[0],
      );
      const grid = cleanGrid(best);
      const headerRowIndex = detectHeaderRow(grid);
      return { grid, headerRowIndex, hasHeader: headerRowIndex >= 0, source: 'html', tableCount: tables.length };
    }
  }
  const grid = cleanGrid(parsePlainTable(raw));
  const headerRowIndex = detectHeaderRow(grid);
  return { grid, headerRowIndex, hasHeader: headerRowIndex >= 0, source: 'plain', tableCount: 1 };
}

/** Parse all tables (HTML or a single plain grid) and aggregate across them. */
export function parseAndAggregateTables(input: string): AggregationResult & { parsed: ParsedTable } {
  const parsed = parseAnyTable(input);
  const aggregated = aggregateGrid(parsed.grid);
  return { ...aggregated, parsed };
}

/** Normalised TSV from an HTML clipboard string (structure-preserving). */
export function htmlToPasteText(html: string): string {
  const tables = parseHtmlTables(html);
  if (!tables.length) return '';
  const grids = tables.map((g) => aggregateGrid(g).grid);
  return grids.map((g) => gridToTsv(g)).join('\n\n');
}

/** Platform-identity bordered RTL HTML table (Word/Excel/Outlook-safe). */
export function gridToHtmlTable(
  grid: Grid,
  opts?: { headers?: boolean; dir?: 'rtl' | 'ltr'; caption?: string },
): string {
  const g = cleanGrid(grid);
  const dir = opts?.dir || 'rtl';
  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const cell = (tag: 'th' | 'td', text: string) =>
    `<${tag} style="border:1px solid #c9c9c9;padding:4px 8px;vertical-align:top;text-align:right" dir="auto">${esc(text)}</${tag}>`;

  const headerIdx = opts?.headers === false ? -1 : detectHeaderRow(g);
  const rows = g.map((row, i) => {
    const tag: 'th' | 'td' = i === headerIdx ? 'th' : 'td';
    return `<tr>${row.map((c) => cell(tag, c)).join('')}</tr>`;
  });
  const caption = opts?.caption
    ? `<caption style="text-align:right;font-weight:700;padding:4px">${esc(opts.caption)}</caption>`
    : '';
  return `<table dir="${dir}" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse;border:1px solid #c9c9c9">
  ${caption}${rows.join('\n  ')}
</table>`;
}


/* ------------------------------------------------------------------ */
/* TipTap editor + live-preview adapters                               */
/* ------------------------------------------------------------------ */

/** Minimal, TipTap/ProseMirror-compatible HTML table (cells wrap in <p>). */
export function gridToEditorTableHtml(grid: Grid): string {
  const g = cleanGrid(grid);
  if (!g.length) return '<p></p>';
  const headerIdx = detectHeaderRow(g);
  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const rows = g
    .map((row, i) => {
      const tag: 'th' | 'td' = i === headerIdx ? 'th' : 'td';
      return `<tr>${row.map((c) => `<${tag}><p>${esc(c)}</p></${tag}>`).join('')}</tr>`;
    })
    .join('');
  return `<table>${rows}</table>`;
}

export type AdaptedTablePreview = {
  hasTable: true;
  original: Grid;
  adapted: Grid;
  mergedCount: number;
  originalHtml: string;
  adaptedHtml: string;
  editorHtml: string;
};

/**
 * Full adaptation pipeline for the live-preview popup:
 * parse (HTML/plain) → clean → aggregate/dedupe → platform-identity HTML.
 * Returns null when the input does not contain a table-like structure.
 */
export function adaptPastedTable(raw: string): AdaptedTablePreview | null {
  const input = String(raw || '');
  const parsed = parseAnyTable(input);
  const agg = aggregateGrid(parsed.grid);
  const width = agg.grid[0]?.length || 0;
  if (agg.grid.length < 2 || width < 2) return null;

  return {
    hasTable: true,
    original: parsed.grid,
    adapted: agg.grid,
    mergedCount: agg.mergedCount,
    originalHtml: gridToHtmlTable(parsed.grid, { headers: parsed.hasHeader }),
    adaptedHtml: gridToHtmlTable(agg.grid, { headers: parsed.hasHeader }),
    editorHtml: gridToEditorTableHtml(agg.grid),
  };
}

