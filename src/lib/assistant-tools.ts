/**
 * Local deterministic "function calling" for the letter assistant.
 * FREE — no OpenAI / paid LLM. Maps Arabic + English NL → typed tools → TipTap.
 */

import type { Editor } from '@tiptap/core';
import {
  applyAiBodyCommand,
  parseLocalStyleCommand,
  type AiBodyCommand,
  type AiCommandResult,
} from '@/lib/tiptap-ai-commands';

/** Tool schema exposed to the local router (mirrors OpenAI-style function defs, local only). */
export type AssistantToolName =
  | 'highlightWord'
  | 'centerParagraph'
  | 'alignParagraph'
  | 'colorMatch'
  | 'colorTitle'
  | 'setBackground'
  | 'boldMatch'
  | 'setFontFamily'
  | 'setFontSize'
  | 'insertTable'
  | 'clearMarks';

export type AssistantToolCall = {
  name: AssistantToolName;
  arguments: Record<string, unknown>;
};

export type AssistantToolSchema = {
  name: AssistantToolName;
  description: string;
  parameters: { name: string; type: string; required?: boolean; description?: string }[];
};

export const ASSISTANT_TOOL_SCHEMAS: AssistantToolSchema[] = [
  {
    name: 'highlightWord',
    description: 'Highlight all occurrences of a word (تمييز كلمة)',
    parameters: [
      { name: 'word', type: 'string', required: true },
      { name: 'color', type: 'string', required: false, description: 'hex color' },
    ],
  },
  {
    name: 'centerParagraph',
    description: 'Center a paragraph matching text (وسّط الفقرة)',
    parameters: [{ name: 'match', type: 'string', required: false }],
  },
  {
    name: 'alignParagraph',
    description: 'Align paragraph left/center/right',
    parameters: [
      { name: 'align', type: 'string', required: true },
      { name: 'match', type: 'string', required: false },
    ],
  },
  {
    name: 'colorMatch',
    description: 'Color matching text',
    parameters: [
      { name: 'match', type: 'string', required: true },
      { name: 'color', type: 'string', required: true },
    ],
  },
  {
    name: 'colorTitle',
    description: 'Color the first title/paragraph (make title gold/green)',
    parameters: [{ name: 'color', type: 'string', required: true }],
  },
  {
    name: 'setBackground',
    description: 'Set background highlight color',
    parameters: [
      { name: 'color', type: 'string', required: true },
      { name: 'match', type: 'string', required: false },
    ],
  },
  {
    name: 'boldMatch',
    description: 'Bold matching text',
    parameters: [{ name: 'match', type: 'string', required: true }],
  },
  {
    name: 'setFontFamily',
    description: 'Set font family on selection or match',
    parameters: [
      { name: 'fontFamily', type: 'string', required: true },
      { name: 'match', type: 'string', required: false },
    ],
  },
  {
    name: 'setFontSize',
    description: 'Set font size in pt',
    parameters: [
      { name: 'sizePt', type: 'number', required: true },
      { name: 'match', type: 'string', required: false },
    ],
  },
  {
    name: 'insertTable',
    description: 'Insert a table',
    parameters: [
      { name: 'rows', type: 'number', required: false },
      { name: 'cols', type: 'number', required: false },
    ],
  },
  {
    name: 'clearMarks',
    description: 'Clear marks from selection',
    parameters: [],
  },
];

function resolveColorToken(raw: string | undefined | null, fallback = '#C5A059'): string {
  const c = String(raw || '').trim().toLowerCase();
  if (!c) return fallback;
  if (c === 'gold' || c === 'ذهبي' || c === 'ذهب') return '#C5A059';
  if (c === 'green' || c === 'أخضر' || c === 'اخضر') return '#2e9e5c';
  if (c === 'red' || c === 'أحمر' || c === 'احمر') return '#B91C1C';
  if (c === 'black' || c === 'أسود' || c === 'اسود') return '#111111';
  if (c.startsWith('#')) return c.length >= 4 ? c : fallback;
  if (/^[0-9a-f]{3,8}$/i.test(c)) return `#${c}`;
  return fallback;
}

function toolCallFromCommand(cmd: AiBodyCommand): AssistantToolCall {
  switch (cmd.op) {
    case 'highlightWord':
      return { name: 'highlightWord', arguments: { word: cmd.word, color: cmd.color } };
    case 'centerParagraph':
      return { name: 'centerParagraph', arguments: { match: cmd.match } };
    case 'alignParagraph':
      return { name: 'alignParagraph', arguments: { match: cmd.match, align: cmd.align } };
    case 'colorMatch':
      return { name: 'colorMatch', arguments: { match: cmd.match, color: cmd.color } };
    case 'colorTitle':
      return { name: 'colorTitle', arguments: { color: cmd.color } };
    case 'setBackground':
      return { name: 'setBackground', arguments: { color: cmd.color, match: cmd.match } };
    case 'boldMatch':
      return { name: 'boldMatch', arguments: { match: cmd.match } };
    case 'setFontFamily':
      return { name: 'setFontFamily', arguments: { fontFamily: cmd.fontFamily, match: cmd.match } };
    case 'setFontSize':
      return { name: 'setFontSize', arguments: { sizePt: cmd.sizePt, match: cmd.match } };
    case 'insertTable':
      return {
        name: 'insertTable',
        arguments: { rows: cmd.rows, cols: cmd.cols, withHeaderRow: cmd.withHeaderRow },
      };
    case 'clearMarks':
      return { name: 'clearMarks', arguments: {} };
    default: {
      const _e: never = cmd;
      throw new Error(`unknown op ${JSON.stringify(_e)}`);
    }
  }
}

function commandFromToolCall(call: AssistantToolCall): AiBodyCommand | null {
  const a = call.arguments || {};
  switch (call.name) {
    case 'highlightWord':
      return {
        op: 'highlightWord',
        word: String(a.word || ''),
        color: a.color ? resolveColorToken(String(a.color)) : '#C5A059',
      };
    case 'centerParagraph':
      return { op: 'centerParagraph', match: String(a.match ?? '') };
    case 'alignParagraph': {
      const alignRaw = String(a.align || 'right').toLowerCase();
      const align: 'right' | 'center' | 'left' =
        alignRaw === 'center' || alignRaw === 'وسط' || alignRaw === 'center'
          ? 'center'
          : alignRaw === 'left' || alignRaw === 'يسار'
            ? 'left'
            : 'right';
      return { op: 'alignParagraph', match: String(a.match ?? ''), align };
    }
    case 'colorMatch':
      return {
        op: 'colorMatch',
        match: String(a.match || ''),
        color: resolveColorToken(String(a.color || '')),
      };
    case 'colorTitle':
      return { op: 'colorTitle', color: resolveColorToken(String(a.color || ''), '#2e9e5c') };
    case 'setBackground':
      return {
        op: 'setBackground',
        color: resolveColorToken(String(a.color || '')),
        match: a.match != null ? String(a.match) : undefined,
      };
    case 'boldMatch':
      return { op: 'boldMatch', match: String(a.match || '') };
    case 'setFontFamily':
      return {
        op: 'setFontFamily',
        fontFamily: String(a.fontFamily || 'Traditional Arabic'),
        match: a.match != null ? String(a.match) : undefined,
      };
    case 'setFontSize':
      return {
        op: 'setFontSize',
        sizePt: Number(a.sizePt) || 14,
        match: a.match != null ? String(a.match) : undefined,
      };
    case 'insertTable':
      return {
        op: 'insertTable',
        rows: Number(a.rows) || 3,
        cols: Number(a.cols) || 3,
        withHeaderRow: a.withHeaderRow !== false,
      };
    case 'clearMarks':
      return { op: 'clearMarks' };
    default:
      return null;
  }
}

/**
 * Extra NL patterns beyond parseLocalStyleCommand (EN + AR conversational).
 * Examples: "make this title gold", "align right", "وسّط الفقرة", "ميّز كلمة السلام"
 */
export function routeNaturalLanguageToTool(raw: string): AssistantToolCall | null {
  const s = String(raw || '').trim();
  if (!s) return null;

  // Prefer existing local parser first
  const parsed = parseLocalStyleCommand(s);
  if (parsed) return toolCallFromCommand(parsed);

  let m: RegExpMatchArray | null;

  // make (this|the) title gold|green|#hex
  m = s.match(
    /^(?:make\s+(?:this\s+|the\s+)?title|لو[ّن]\s*العنوان|عنوان\s*(?:بلون|لون)?)\s*(gold|green|ذهبي|أخضر|اخضر|#?[0-9A-Fa-f]{3,8})?$/i,
  );
  if (m || /^(?:make\s+(?:this\s+|the\s+)?title\s+gold|title\s+gold|عنوان\s*ذهبي)$/i.test(s)) {
    const token = m?.[1] || (/gold|ذهبي/i.test(s) ? 'gold' : /green|أخضر|اخضر/i.test(s) ? 'green' : 'gold');
    return { name: 'colorTitle', arguments: { color: resolveColorToken(token) } };
  }

  // align right|left|center  / محاذاة يمين|يسار|وسط / وسّط الفقرة / align the paragraph right
  if (
    /^(?:align\s+(?:(?:the\s+)?(?:paragraph|para)\s+)?(?:to\s+)?)?(right|left|center)$/i.test(s) ||
    /^(?:محاذاة|حاذِ?|align)\s*(يمين|يسار|وسط|right|left|center)$/i.test(s) ||
    /^(?:وس[ّ]?ط|وسّط)\s*(?:ال)?فقرة$/i.test(s) ||
    /^(?:center|وسط)\s*(?:ال)?فقرة$/i.test(s) ||
    /^(?:يمين|يسار)\s*(?:ال)?فقرة$/i.test(s)
  ) {
    if (/وس[ّ]?ط|center|وسط/i.test(s)) {
      return { name: 'centerParagraph', arguments: { match: '' } };
    }
    const align = /يسار|left/i.test(s) ? 'left' : /وسط|center/i.test(s) ? 'center' : 'right';
    return { name: 'alignParagraph', arguments: { align, match: '' } };
  }

  // highlight / ميّز (كلمة) X
  m = s.match(
    /^(?:highlight|mark|ميز|ميّز|ميِّز)\s+(?:(?:the\s+)?word\s+|كلمة\s+)?[«"']?(.+?)[»"']?\s*(?:#([0-9A-Fa-f]{3,8})|gold|ذهبي)?$/i,
  );
  if (m) {
    const colorTok = m[2] ? `#${m[2]}` : /gold|ذهبي/i.test(s) ? 'gold' : undefined;
    return {
      name: 'highlightWord',
      arguments: { word: m[1].trim(), color: colorTok ? resolveColorToken(colorTok) : '#C5A059' },
    };
  }

  // color word X gold
  m = s.match(
    /^(?:color|لون)\s+(?:(?:the\s+)?(?:word|title)\s+)?[«"']?(.+?)[»"']?\s+(gold|green|ذهبي|أخضر|اخضر|#?[0-9A-Fa-f]{3,8})$/i,
  );
  if (m) {
    const target = m[1].trim();
    if (/^title$|عنوان/i.test(target)) {
      return { name: 'colorTitle', arguments: { color: resolveColorToken(m[2]) } };
    }
    return {
      name: 'colorMatch',
      arguments: { match: target, color: resolveColorToken(m[2]) },
    };
  }

  // bold word X
  m = s.match(/^(?:bold|عريض)\s+(?:(?:the\s+)?word\s+|كلمة\s+)?[«"']?(.+?)[»"']?$/i);
  if (m) return { name: 'boldMatch', arguments: { match: m[1].trim() } };

  // insert table 2x3
  m = s.match(/^(?:insert\s+)?(?:a\s+)?(?:table|جدول)\s*(\d+)\s*[x×*]\s*(\d+)$/i);
  if (m) return { name: 'insertTable', arguments: { rows: Number(m[1]), cols: Number(m[2]) } };

  // clear formatting
  if (/^(?:clear(?:\s+marks|\s+formatting)?|مسح(?:\s*التنسيق)?)$/i.test(s)) {
    return { name: 'clearMarks', arguments: {} };
  }

  return null;
}

export type AssistantHandleResult = AiCommandResult & {
  toolCall: AssistantToolCall | null;
};

/**
 * Local tool-calling handler: NL → tool schema call → applyAiBodyCommand chain.
 * NEVER replaces full document HTML for minor edits.
 */
export function handleAssistantUtterance(
  editor: Editor | null | undefined,
  utterance: string,
): AssistantHandleResult {
  const toolCall = routeNaturalLanguageToTool(utterance);
  if (!toolCall) {
    return {
      ok: false,
      message:
        'لم أفهم الأمر. جرّب: make this title gold · align right · ميّز كلمة السلام · وسّط الفقرة · لون العنوان أخضر',
      usedChain: false,
      toolCall: null,
    };
  }
  const cmd = commandFromToolCall(toolCall);
  if (!cmd) {
    return { ok: false, message: 'أداة غير معروفة', usedChain: false, toolCall };
  }
  const result = applyAiBodyCommand(editor, cmd);
  return { ...result, toolCall };
}

/** Execute a pre-parsed tool call (for tests / UI chips). */
export function executeAssistantToolCall(
  editor: Editor | null | undefined,
  call: AssistantToolCall,
): AssistantHandleResult {
  const cmd = commandFromToolCall(call);
  if (!cmd) {
    return { ok: false, message: 'أداة غير معروفة', usedChain: false, toolCall: call };
  }
  const result = applyAiBodyCommand(editor, cmd);
  return { ...result, toolCall: call };
}
