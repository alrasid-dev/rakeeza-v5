/**
 * Local typed AI/assistant command handler for TipTap body editor.
 * FREE / local only — no LLM. Every style op uses editor.chain().focus()… transactions.
 * NEVER setContent / replace the full letter HTML for minor edits.
 */

import type { Editor } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';

export type AiBodyCommand =
  | { op: 'highlightWord'; word: string; color?: string }
  | { op: 'centerParagraph'; match: string }
  | { op: 'alignParagraph'; match: string; align: 'right' | 'center' | 'left' }
  | { op: 'colorMatch'; match: string; color: string }
  | { op: 'colorTitle'; color: string }
  | { op: 'setBackground'; color: string; match?: string }
  | { op: 'boldMatch'; match: string }
  | { op: 'setFontFamily'; fontFamily: string; match?: string }
  | { op: 'setFontSize'; sizePt: number; match?: string }
  | { op: 'insertTable'; rows?: number; cols?: number; withHeaderRow?: boolean }
  | { op: 'clearMarks' };

export type AiCommandResult = {
  ok: boolean;
  message: string;
  /** True when we used a ProseMirror chain transaction (not setContent). */
  usedChain: boolean;
};

/** Find all text ranges matching `needle` in the doc (text nodes only). */
export function findTextRanges(
  doc: PmNode,
  needle: string,
): { from: number; to: number }[] {
  const q = String(needle || '');
  if (!q) return [];
  const out: { from: number; to: number }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    let idx = 0;
    while (idx < text.length) {
      const found = text.indexOf(q, idx);
      if (found < 0) break;
      out.push({ from: pos + found, to: pos + found + q.length });
      idx = found + q.length;
    }
  });
  return out;
}

/** First block (paragraph/heading) whose textContent includes match (or first block if match empty). */
export function findBlockRange(
  doc: PmNode,
  match?: string,
): { from: number; to: number; pos: number; node: PmNode } | null {
  let found: { from: number; to: number; pos: number; node: PmNode } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
    const text = node.textContent || '';
    if (match && match.trim() && !text.includes(match)) return;
    // inner content selection (exclude the node open/close tokens conceptually)
    found = {
      pos,
      node,
      from: pos + 1,
      to: pos + node.nodeSize - 1,
    };
    return false;
  });
  return found;
}

function selectRange(editor: Editor, from: number, to: number) {
  return editor.chain().focus().setTextSelection({ from, to });
}

/**
 * Apply a typed body command via chain transactions only.
 * Does not call setContent / setHTML / replace the document root.
 */
export function applyAiBodyCommand(editor: Editor | null | undefined, cmd: AiBodyCommand): AiCommandResult {
  if (!editor || editor.isDestroyed) {
    return { ok: false, message: 'المحرر غير جاهز', usedChain: false };
  }

  switch (cmd.op) {
    case 'highlightWord': {
      const ranges = findTextRanges(editor.state.doc, cmd.word);
      if (!ranges.length) {
        return { ok: false, message: `لم يُعثر على «${cmd.word}»`, usedChain: false };
      }
      const color = cmd.color || '#C5A059';
      // Apply from end → start so positions stay valid
      for (let i = ranges.length - 1; i >= 0; i--) {
        const r = ranges[i];
        selectRange(editor, r.from, r.to).setHighlight({ color }).run();
      }
      return {
        ok: true,
        message: `تمييز ${ranges.length} موضع(اً) لـ «${cmd.word}»`,
        usedChain: true,
      };
    }

    case 'centerParagraph':
    case 'alignParagraph': {
      const align = cmd.op === 'centerParagraph' ? 'center' : cmd.align;
      const match = cmd.op === 'centerParagraph' ? cmd.match : cmd.match;
      const block = findBlockRange(editor.state.doc, match);
      if (!block) {
        return { ok: false, message: 'لم يُعثر على الفقرة المستهدفة', usedChain: false };
      }
      // Select inside the paragraph then set node text-align
      editor.chain().focus().setTextSelection({ from: block.from, to: Math.max(block.from, block.to) }).setTextAlign(align).run();
      return { ok: true, message: `محاذاة الفقرة: ${align}`, usedChain: true };
    }

    case 'colorMatch': {
      const ranges = findTextRanges(editor.state.doc, cmd.match);
      if (!ranges.length) {
        return { ok: false, message: `لم يُعثر على «${cmd.match}»`, usedChain: false };
      }
      for (let i = ranges.length - 1; i >= 0; i--) {
        const r = ranges[i];
        selectRange(editor, r.from, r.to).setColor(cmd.color).run();
      }
      return { ok: true, message: `تلوين ${ranges.length} موضع(اً)`, usedChain: true };
    }

    case 'colorTitle': {
      const block = findBlockRange(editor.state.doc);
      if (!block || block.to <= block.from) {
        return { ok: false, message: 'لا يوجد عنوان/فقرة أولى', usedChain: false };
      }
      selectRange(editor, block.from, block.to).setColor(cmd.color).setBold().run();
      return { ok: true, message: 'تلوين العنوان/الفقرة الأولى', usedChain: true };
    }

    case 'setBackground': {
      if (cmd.match) {
        const ranges = findTextRanges(editor.state.doc, cmd.match);
        if (!ranges.length) {
          return { ok: false, message: `لم يُعثر على «${cmd.match}»`, usedChain: false };
        }
        for (let i = ranges.length - 1; i >= 0; i--) {
          const r = ranges[i];
          selectRange(editor, r.from, r.to).setBackgroundColor(cmd.color).run();
        }
        return { ok: true, message: `خلفية على ${ranges.length} موضع(اً)`, usedChain: true };
      }
      editor.chain().focus().setBackgroundColor(cmd.color).run();
      return { ok: true, message: 'خلفية على التحديد', usedChain: true };
    }

    case 'boldMatch': {
      const ranges = findTextRanges(editor.state.doc, cmd.match);
      if (!ranges.length) {
        return { ok: false, message: `لم يُعثر على «${cmd.match}»`, usedChain: false };
      }
      for (let i = ranges.length - 1; i >= 0; i--) {
        const r = ranges[i];
        selectRange(editor, r.from, r.to).setBold().run();
      }
      return { ok: true, message: `تعريض ${ranges.length} موضع(اً)`, usedChain: true };
    }

    case 'setFontFamily': {
      if (cmd.match) {
        const ranges = findTextRanges(editor.state.doc, cmd.match);
        if (!ranges.length) {
          return { ok: false, message: `لم يُعثر على «${cmd.match}»`, usedChain: false };
        }
        for (let i = ranges.length - 1; i >= 0; i--) {
          const r = ranges[i];
          selectRange(editor, r.from, r.to).setFontFamily(cmd.fontFamily).run();
        }
        return { ok: true, message: 'خط على المواضع المطابقة', usedChain: true };
      }
      editor.chain().focus().setFontFamily(cmd.fontFamily).run();
      return { ok: true, message: 'خط على التحديد', usedChain: true };
    }

    case 'setFontSize': {
      const size = `${cmd.sizePt}pt`;
      if (cmd.match) {
        const ranges = findTextRanges(editor.state.doc, cmd.match);
        if (!ranges.length) {
          return { ok: false, message: `لم يُعثر على «${cmd.match}»`, usedChain: false };
        }
        for (let i = ranges.length - 1; i >= 0; i--) {
          const r = ranges[i];
          selectRange(editor, r.from, r.to).setFontSize(size).run();
        }
        return { ok: true, message: `حجم ${size} على المواضع`, usedChain: true };
      }
      editor.chain().focus().setFontSize(size).run();
      return { ok: true, message: `حجم ${size} على التحديد`, usedChain: true };
    }

    case 'insertTable': {
      editor
        .chain()
        .focus()
        .insertTable({
          rows: cmd.rows ?? 3,
          cols: cmd.cols ?? 3,
          withHeaderRow: cmd.withHeaderRow ?? true,
        })
        .run();
      return { ok: true, message: 'إدراج جدول', usedChain: true };
    }

    case 'clearMarks': {
      editor.chain().focus().unsetAllMarks().run();
      return { ok: true, message: 'مسح التنسيق من التحديد', usedChain: true };
    }

    default: {
      const _exhaustive: never = cmd;
      return { ok: false, message: `أمر غير معروف: ${JSON.stringify(_exhaustive)}`, usedChain: false };
    }
  }
}

/**
 * Parse a short Arabic/English style command string into AiBodyCommand (local, no LLM).
 * Examples:
 *   ميّز كلمة السلام
 *   وسط فقرة وبعد
 *   لون العنوان #006C35
 *   خلفية ذهبية على المحكمة
 *   جدول 2x3
 */
export function parseLocalStyleCommand(raw: string): AiBodyCommand | null {
  const s = String(raw || '').trim();
  if (!s) return null;

  let m: RegExpMatchArray | null;

  m = s.match(/^(?:ميز|ميّز|highlight)\s+(?:كلمة\s+)?[«"]?(.+?)[»"]?\s*(?:#([0-9A-Fa-f]{3,8}))?$/i);
  if (m) {
    return {
      op: 'highlightWord',
      word: m[1].trim(),
      color: m[2] ? `#${m[2]}` : '#C5A059',
    };
  }

  m = s.match(/^(?:وسط|center)\s+(?:فقرة\s+)?[«"]?(.+?)[»"]?$/i);
  if (m) return { op: 'centerParagraph', match: m[1].trim() };

  m = s.match(/^(?:يمين|يسار|right|left)\s+(?:فقرة\s+)?[«"]?(.+?)[»"]?$/i);
  if (m) {
    const align = /يمين|right/i.test(m[0]) ? 'right' : 'left';
    return { op: 'alignParagraph', match: m[1].trim(), align };
  }

  m = s.match(/^(?:لون\s*العنوان|color\s*title)\s*(#?[0-9A-Fa-f]{3,8}|أخضر|ذهبي)?$/i);
  if (m) {
    const c = m[1];
    const color =
      !c || c === 'أخضر'
        ? '#006C35'
        : c === 'ذهبي'
          ? '#C5A059'
          : c.startsWith('#')
            ? c
            : `#${c}`;
    return { op: 'colorTitle', color };
  }

  m = s.match(/^(?:لون|color)\s+[«"]?(.+?)[»"]?\s+(#?[0-9A-Fa-f]{3,8}|أخضر|ذهبي)$/i);
  if (m) {
    const c = m[2];
    const color =
      c === 'أخضر' ? '#006C35' : c === 'ذهبي' ? '#C5A059' : c.startsWith('#') ? c : `#${c}`;
    return { op: 'colorMatch', match: m[1].trim(), color };
  }

  m = s.match(/^(?:خلفية|background)\s+(#?[0-9A-Fa-f]{3,8}|ذهبي|أخضر)(?:\s+على\s+[«"]?(.+?)[»"]?)?$/i);
  if (m) {
    const c = m[1];
    const color =
      c === 'ذهبي' ? '#C5A059' : c === 'أخضر' ? '#E6F2EB' : c.startsWith('#') ? c : `#${c}`;
    return { op: 'setBackground', color, match: m[2]?.trim() };
  }

  m = s.match(/^(?:جدول|table)\s*(\d+)\s*[x×*]\s*(\d+)$/i);
  if (m) return { op: 'insertTable', rows: Number(m[1]), cols: Number(m[2]) };

  m = s.match(/^(?:عريض|bold)\s+[«"]?(.+?)[»"]?$/i);
  if (m) return { op: 'boldMatch', match: m[1].trim() };

  if (/^(?:مسح|clear)/i.test(s)) return { op: 'clearMarks' };

  return null;
}
