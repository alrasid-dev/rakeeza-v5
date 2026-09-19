import { inlineNodesToHtml } from '@/lib/body-inline';
/** Per-paragraph body alignment for official letters (يمين / وسط / يسار). */

export type ParaAlign = 'right' | 'center' | 'left';

const MARK: Record<ParaAlign, string> = {
  right: '〔يمين〕',
  center: '〔وسط〕',
  left: '〔يسار〕',
};

const MARK_RE = /^〔(يمين|وسط|يسار)〕\s*/;

export function cssTextAlign(align: ParaAlign): string {
  return align;
}

/** Remove alignment marker from a single line/paragraph. */
export function stripAlignMarker(para: string): { text: string; align: ParaAlign | null } {
  const m = String(para || '').match(MARK_RE);
  if (!m) return { text: String(para || ''), align: null };
  const map: Record<string, ParaAlign> = { يمين: 'right', وسط: 'center', يسار: 'left' };
  return { text: String(para).replace(MARK_RE, ''), align: map[m[1]] || null };
}

/** Default official layout: salutation + blessing centered, body right. */
export function inferParaAlign(text: string): ParaAlign {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return 'right';
  if (/^السلام\s*عليكم/.test(t)) return 'center';
  if (/^وبعد\s*[:-]?\s*$/.test(t)) return 'center';
  if (/^لإطلاع\s*فضيلتكم/.test(t) || /لإطلاع\s*فضيلتكم/.test(t) && t.length < 90) return 'center';
  if (/والله\s*يحفظكم|وتفضلوا\s*بقبول|والسلام\s*عليكم\s*ورحمة/.test(t) && t.length < 90) {
    return 'center';
  }
  return 'right';
}

export type BodyBlock = { text: string; align: ParaAlign };

/** Split body into paragraphs (blank-line separated), resolve align. */
export function parseBodyBlocks(body: string, fallback: ParaAlign = 'right'): BodyBlock[] {
  const raw = String(body || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return [];
  // Keep single newlines inside a "paragraph group" joined; split on blank lines
  const parts = raw.split(/\n{2,}/);
  const blocks: BodyBlock[] = [];
  for (const part of parts) {
    const lines = part.split('\n');
    // Each non-empty line is its own block for salutation/closing control;
    // consecutive body lines without blank stay as one block if none look like greeting
    const lineBlocks: string[] = [];
    for (const line of lines) {
      lineBlocks.push(line);
    }
    // Prefer line-level when any line is greeting/closing or has a marker
    const useLines =
      lineBlocks.length > 1 &&
      lineBlocks.some((ln) => {
        const { text, align } = stripAlignMarker(ln);
        return align || inferParaAlign(text) !== 'right' || MARK_RE.test(ln);
      });

    if (useLines) {
      for (const ln of lineBlocks) {
        if (!ln.trim()) {
          blocks.push({ text: '', align: fallback });
          continue;
        }
        const { text, align } = stripAlignMarker(ln);
        blocks.push({ text, align: align || inferParaAlign(text) || fallback });
      }
    } else {
      const joined = lineBlocks.join('\n');
      const { text, align } = stripAlignMarker(joined);
      // strip markers from each line inside
      const cleaned = text
        .split('\n')
        .map((ln) => stripAlignMarker(ln).text)
        .join('\n');
      blocks.push({
        text: cleaned,
        align: align || inferParaAlign(cleaned) || fallback,
      });
    }
  }
  return blocks;
}

/** Serialize blocks back with markers only when not equal to inferred default. */
export function serializeBodyBlocks(blocks: BodyBlock[]): string {
  return blocks
    .map((b) => {
      const inferred = inferParaAlign(b.text);
      if (!b.text.trim()) return '';
      if (b.align === inferred) return b.text;
      return `${MARK[b.align]}${b.text}`;
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Apply alignment to paragraphs overlapping [start, end] in the raw body string.
 * If start===end, applies to the paragraph containing the caret.
 */
export function applyAlignToRange(
  body: string,
  start: number,
  end: number,
  align: ParaAlign,
): string {
  const raw = String(body || '').replace(/\r\n/g, '\n');
  if (!raw) return raw;

  // Work line-based for selection precision
  const lines = raw.split('\n');
  const ranges: { from: number; to: number; line: string }[] = [];
  let pos = 0;
  for (const line of lines) {
    ranges.push({ from: pos, to: pos + line.length, line });
    pos += line.length + 1; // + \n
  }

  const a = Math.min(start, end);
  const b = Math.max(start, end);
  const targetIdx: number[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const touches = b === a ? a >= r.from && a <= r.to + (i < ranges.length - 1 ? 1 : 0) : !(b <= r.from || a >= r.to + 1);
    if (touches && (r.line.trim() || b !== a)) targetIdx.push(i);
  }
  if (!targetIdx.length) {
    // caret on empty — mark nearest non-empty above/below
    let i = ranges.findIndex((r) => a >= r.from && a <= r.to + 1);
    if (i < 0) i = 0;
    targetIdx.push(i);
  }

  const next = lines.map((line, i) => {
    if (!targetIdx.includes(i)) return line;
    if (!line.trim()) return line;
    const { text } = stripAlignMarker(line);
    // Always store marker when user explicitly chooses (even if matches infer)
    return `${MARK[align]}${text}`;
  });
  return next.join('\n');
}

/** HTML for export — one div per block. */
/** Turn leading ASCII spaces into NBSP so Outlook/Word keep horizontal shift. */
export function leadingSpacesToNbsp(s: string): string {
  return String(s || '').replace(/^( +)/gm, (m) => '\u00a0'.repeat(m.length));
}

export function bodyBlocksToHtml(
  body: string,
  opts?: { fallbackAlign?: ParaAlign; escape: (s: string) => string; fontFamily?: string | null },
): string {
  const baseEsc = opts?.escape || ((s: string) => s);
  const esc = (s: string) => baseEsc(s).replace(/\u00a0/g, '&nbsp;');
  const blocks = parseBodyBlocks(body, opts?.fallbackAlign || 'right');
  if (!blocks.length) return '';
  const fontRaw = String(opts?.fontFamily || '').trim();
  const fontDecl = fontRaw
    ? `font-family: ${
        fontRaw.includes(',') || fontRaw.startsWith("'") || fontRaw.startsWith('"')
          ? fontRaw
          : `'${fontRaw.replace(/'/g, '')}'`
      };`
    : '';
  return blocks
    .map((b) => {
      // Keep blank / space-only lines as vertical gaps (Word-like)
      if (!b.text.replace(/[ \u00a0]/g, '').trim()) {
        // No height/overflow wrappers — Outlook Word turns those into nested scrollboxes.
        return '<p align="right" style="margin:0 0 0.55em;mso-line-height-rule:exactly;font-size:8pt">&nbsp;</p>';
      }
      const align = cssTextAlign(b.align);
      const html = inlineNodesToHtml(leadingSpacesToNbsp(b.text), esc);
      // align= for Outlook/Word; text-align + pre-wrap for browsers/PDF; NBSP for leading spaces
      return `<p align="${align}" style="${fontDecl}text-align:${align};margin:0 0 0.55em;white-space:pre-wrap;mso-line-height-rule:exactly">${html}</p>`;
    })
    .join('');
}
