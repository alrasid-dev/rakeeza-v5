/** Inline rich marks for letter body (Word-like: color / enlarge / bold).
 * Stored as compact Arabic-friendly markers so they survive save/export.
 *
 * 【ك:#RRGGBB】نص【/ك】  color
 * 【ح】نص【/ح】            enlarge (~+2pt / 1.22em)
 * 【ح٢】نص【/ح٢】          larger (~1.4em)
 * 【ع】نص【/ع】            bold
 */

export type InlineKind = 'color' | 'enlarge' | 'enlarge2' | 'bold';

const OPEN: Record<InlineKind, string> = {
  color: '【ك:', // incomplete — color needs value
  enlarge: '【ح】',
  enlarge2: '【ح٢】',
  bold: '【ع】',
};

const CLOSE: Record<InlineKind, string> = {
  color: '【/ك】',
  enlarge: '【/ح】',
  enlarge2: '【/ح٢】',
  bold: '【/ع】',
};

const COLOR_OPEN_RE = /【ك:(#[0-9A-Fa-f]{3,8})】/g;
const ANY_MARK_RE = /【\/?(?:ك:#[0-9A-Fa-f]{3,8}|ك|ح٢|ح|ع)】/g;

export const TEXT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'default', label: 'أسود', hex: '#111111' },
  { id: 'green', label: 'أخضر وزاري', hex: '#006C35' },
  { id: 'gold', label: 'ذهبي', hex: '#C5A059' },
  { id: 'red', label: 'أحمر', hex: '#B00020' },
  { id: 'navy', label: 'كحلي', hex: '#0B3D5C' },
  { id: 'teal', label: 'فيروزي', hex: '#147A5F' },
];

function openTag(kind: InlineKind, colorHex?: string): string {
  if (kind === 'color') {
    const hex = normalizeHex(colorHex || '#006C35');
    return `【ك:${hex}】`;
  }
  return OPEN[kind];
}

export function normalizeHex(hex: string): string {
  let h = String(hex || '').trim();
  if (!h.startsWith('#')) h = `#${h}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(h) && !/^#[0-9A-Fa-f]{8}$/.test(h)) return '#111111';
  return h.toUpperCase();
}

/** Strip all inline marks — for plain-text / fingerprint. */
export function stripInlineMarks(s: string): string {
  return String(s || '')
    .replace(COLOR_OPEN_RE, '')
    .replace(/【\/?ك】/g, '')
    .replace(/【\/?(?:ح٢|ح|ع)】/g, '');
}

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'span'; text: string; color?: string; enlarge?: 1 | 2; bold?: boolean };

/**
 * Parse a single paragraph (may contain newlines) into styled spans.
 * Nested marks are supported in a simple stack fashion.
 */
export function parseInlineNodes(raw: string): InlineNode[] {
  const s = String(raw || '');
  if (!s) return [];
  const re = /【ك:(#[0-9A-Fa-f]{3,8})】|【\/ك】|【ح٢】|【\/ح٢】|【ح】|【\/ح】|【ع】|【\/ع】/g;
  const out: InlineNode[] = [];
  let last = 0;
  let color: string | undefined;
  let enlarge: 0 | 1 | 2 = 0;
  let bold = false;

  const pushText = (text: string) => {
    if (!text) return;
    if (color || enlarge || bold) {
      out.push({
        type: 'span',
        text,
        color,
        enlarge: enlarge === 0 ? undefined : (enlarge as 1 | 2),
        bold: bold || undefined,
      });
    } else {
      out.push({ type: 'text', text });
    }
  };

  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    pushText(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('【ك:')) {
      color = normalizeHex(m[1] || '#006C35');
    } else if (tok === '【/ك】') {
      color = undefined;
    } else if (tok === '【ح】') {
      enlarge = 1;
    } else if (tok === '【/ح】') {
      if (enlarge === 1) enlarge = 0;
    } else if (tok === '【ح٢】') {
      enlarge = 2;
    } else if (tok === '【/ح٢】') {
      if (enlarge === 2) enlarge = 0;
    } else if (tok === '【ع】') {
      bold = true;
    } else if (tok === '【/ع】') {
      bold = false;
    }
    last = m.index + tok.length;
  }
  pushText(s.slice(last));
  return out;
}

export function inlineNodesToHtml(
  raw: string,
  esc: (s: string) => string,
): string {
  return parseInlineNodes(raw)
    .map((n) => {
      if (n.type === 'text') return esc(n.text).replace(/\n/g, '<br/>');
      const styles: string[] = [];
      if (n.color) styles.push(`color:${n.color}`);
      if (n.enlarge === 1) styles.push('font-size:1.22em');
      if (n.enlarge === 2) styles.push('font-size:1.4em');
      if (n.bold) styles.push('font-weight:700');
      const st = styles.length ? ` style="${styles.join(';')}"` : '';
      return `<span${st}>${esc(n.text).replace(/\n/g, '<br/>')}</span>`;
    })
    .join('');
}

/**
 * Wrap the selected range [start,end] with an inline mark.
 * If start===end, no-op (need a selection).
 * Re-wrapping the same kind replaces/extends cleanly by wrapping the raw slice.
 */
export function applyInlineToRange(
  body: string,
  start: number,
  end: number,
  kind: InlineKind,
  colorHex?: string,
): string {
  const raw = String(body || '').replace(/\r\n/g, '\n');
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  if (a === b || !raw.slice(a, b).trim()) return raw;

  const open = openTag(kind, colorHex);
  const close = CLOSE[kind];
  // Avoid double-wrapping identical open/close around exact same slice
  const selected = raw.slice(a, b);
  const already =
    selected.startsWith(open) && selected.endsWith(close) && selected.length > open.length + close.length;
  if (already) {
    // toggle off
    return raw.slice(0, a) + selected.slice(open.length, selected.length - close.length) + raw.slice(b);
  }
  return raw.slice(0, a) + open + selected + close + raw.slice(b);
}

/** Remove inline marks that fully wrap the selection (toggle / clear). */
export function clearInlineInRange(body: string, start: number, end: number): string {
  const raw = String(body || '').replace(/\r\n/g, '\n');
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  if (a === b) return raw;
  const selected = raw.slice(a, b);
  const cleared = stripInlineMarks(selected);
  return raw.slice(0, a) + cleared + raw.slice(b);
}

export function hasInlineMarks(s: string): boolean {
  return /【(?:ك:#[0-9A-Fa-f]{3,8}|\/ك|ح٢|\/ح٢|ح|\/ح|ع|\/ع)】/.test(String(s || ''));
}
