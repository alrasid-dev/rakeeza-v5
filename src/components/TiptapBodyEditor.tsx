'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { createBodyExtensions } from '@/lib/tiptap-extensions';
import {
  editorHtmlToBody,
  markersToEditorHtml,
} from '@/lib/body-html-bridge';
import {
  applyAiBodyCommand,
  type AiBodyCommand,
  type AiCommandResult,
} from '@/lib/tiptap-ai-commands';
import { handleAssistantUtterance } from '@/lib/assistant-tools';
import type { LinterSuggestion } from '@/lib/body-linter';
import type { DocStyle } from '@/components/StyleToolbar';
import { fontStackFor, tiptapFontFamilyCss } from '@/lib/font-stacks';
import LinterSuggestionTooltip from '@/components/LinterSuggestionTooltip';
import {
  adaptPastedTable,
  gridToEditorTableHtml,
  looksLikeExcelTsv,
  looksLikeTableHtml,
  parseAnyTable,
  sanitizeClipboardHtml,
  wrapFloatingTableRows,
} from '@/lib/universal-table-parser';

export type TiptapBodyEditorHandle = {
  getEditor: () => Editor | null;
  applyCommand: (cmd: AiBodyCommand) => AiCommandResult;
  /** Local NL → tool call → chain (no LLM). */
  runAssistant: (utterance: string) => AiCommandResult;
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (body: string) => void;
  style?: DocStyle;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  /** Show local style-command input (no LLM). */
  showCommandBar?: boolean;
  onCommandResult?: (result: AiCommandResult) => void;
  /** Background linter suggestions (inline highlights). */
  linterSuggestions?: LinterSuggestion[];
  onAcceptLinter?: (s: LinterSuggestion) => void;
  onRejectLinter?: (s: LinterSuggestion) => void;
};

function normalizeHtml(html: string): string {
  return String(html || '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

/** Adapt a pasted table source into TipTap-safe editor HTML (fallback for degenerate grids). */
function adaptTableToEditorHtml(source: string): string {
  const preview = adaptPastedTable(source);
  if (preview) return preview.editorHtml;
  const parsed = parseAnyTable(source);
  return parsed.grid.length ? gridToEditorTableHtml(parsed.grid) : '';
}

const TiptapBodyEditor = forwardRef<TiptapBodyEditorHandle, Props>(function TiptapBodyEditor(
  {
    value,
    onChange,
    style,
    placeholder = 'نص المكاتبة — حدّد كلمة ثم استخدم شريط التنسيق أو أمر تنسيق',
    className = '',
    minHeight = 160,
    showCommandBar = true,
    onCommandResult,
    linterSuggestions = [],
    onAcceptLinter,
    onRejectLinter,
  },
  ref,
) {
  const emittingRef = useRef(false);
  const lastEmittedRef = useRef('');
  const editorRef = useRef<Editor | null>(null);
  const [cmdText, setCmdText] = useState('');
  const [cmdMsg, setCmdMsg] = useState('');
  const [activeLinterId, setActiveLinterId] = useState<string | null>(null);
  const onActivateRef = useRef<(id: string) => void>(() => {});

  onActivateRef.current = (id: string) => {
    setActiveLinterId(id);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createBodyExtensions({
      enableLinter: true,
      placeholder,
    }),
    content: markersToEditorHtml(value, style?.align || 'right'),
    editorProps: {
      attributes: {
        class: 'tiptap-body-editor prose-moj focus:outline-none whitespace-pre-wrap',
        dir: 'rtl',
        lang: 'ar',
        style: 'white-space: pre-wrap;',
      },
      handlePaste: (_view, event) => {
        const ed = editorRef.current;
        if (!ed || ed.isDestroyed) return false;
        const cd = event.clipboardData;
        if (!cd) return false;

        const rawHtml = cd.getData('text/html');
        const plain = cd.getData('text/plain');

        // 1) HTML table (Excel/Word/Outlook) — incl. floating <tr>/<td>/<th>.
        if (rawHtml) {
          const cleaned = wrapFloatingTableRows(sanitizeClipboardHtml(rawHtml));
          if (looksLikeTableHtml(cleaned)) {
            const html = adaptTableToEditorHtml(rawHtml);
            if (html) {
              // إصلاح 1: نرجع true فقط بعد إدراج جدول فعلاً.
              return editorInsertAdaptedTableAtSelection(ed, html);
            }
            // إصلاح 1: فشل التكييف → ارجع false ليعمل اللصق الافتراضي.
            return false;
          }
        }

        // 2) Plain-text Excel TSV fallback.
        if (plain && looksLikeExcelTsv(plain)) {
          const html = adaptTableToEditorHtml(plain);
          if (html) {
            return editorInsertAdaptedTableAtSelection(ed, html);
          }
          return false;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const body = editorHtmlToBody(html);
      lastEmittedRef.current = normalizeHtml(html);
      emittingRef.current = true;
      onChange(body);
      // allow parent setState to settle before accepting external sync
      Promise.resolve().then(() => {
        emittingRef.current = false;
      });
    },
  });

  // Keep a ref to the editor for the paste handler (defined before editor exists).
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // اللون الافتراضي للنص: أسود #000000 (لكل مستند جديد)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setColor('#000000');
  }, [editor]);

  // Wire linter activate callback once editor exists
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.storage.bodyLinter.onActivate = (id: string) => onActivateRef.current(id);
  }, [editor]);

  // Sync linter decorations
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setLinterSuggestions(linterSuggestions);
  }, [editor, linterSuggestions]);

  // External value → editor (paste / undo / draft load). Not used for style ops.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (emittingRef.current) return;
    const nextHtml = markersToEditorHtml(value, style?.align || 'right');
    const norm = normalizeHtml(nextHtml);
    if (norm === lastEmittedRef.current) return;
    if (normalizeHtml(editor.getHTML()) === norm) {
      lastEmittedRef.current = norm;
      return;
    }
    editor.commands.setContent(nextHtml, { emitUpdate: false });
    lastEmittedRef.current = norm;
  }, [value, editor, style?.align]);

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editor,
      applyCommand: (cmd) => {
        const result = applyAiBodyCommand(editor, cmd);
        onCommandResult?.(result);
        return result;
      },
      runAssistant: (utterance) => {
        const result = handleAssistantUtterance(editor, utterance);
        onCommandResult?.(result);
        return result;
      },
      focus: () => editor?.chain().focus().run(),
    }),
    [editor, onCommandResult],
  );

  const runLocalCommand = () => {
    const result = handleAssistantUtterance(editor, cmdText);
    setCmdMsg(
      result.toolCall
        ? `${result.message} [${result.toolCall.name}]`
        : result.message,
    );
    onCommandResult?.(result);
    if (result.ok) setCmdText('');
  };

  const activeSuggestion =
    activeLinterId != null
      ? linterSuggestions.find((s) => s.id === activeLinterId) || null
      : null;

  // Auto-show first suggestion tooltip when new suggestions arrive and none active
  useEffect(() => {
    if (activeLinterId && linterSuggestions.some((s) => s.id === activeLinterId)) return;
    if (linterSuggestions.length > 0) {
      setActiveLinterId(linterSuggestions[0].id);
    } else {
      setActiveLinterId(null);
    }
  }, [linterSuggestions, activeLinterId]);

  const shellStyle: CSSProperties = {
    fontFamily: fontStackFor(style?.fontFamily || 'Traditional Arabic'),
    fontSize: style?.fontSizePt ? `${style.fontSizePt}pt` : '14pt',
    minHeight,
  };

  return (
    <div className={`tiptap-body-shell rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#121c18] ${className}`}>
      {showCommandBar && (
        <div className="whitespace-pre-wrap flex flex-wrap gap-1.5 items-center border-b border-moj-green/15 px-2 py-1.5 bg-moj-light/40 dark:bg-white/5">
          <label className="text-[10px] font-bold text-moj-green whitespace-nowrap">أمر تنسيق (محلي)</label>
          <input
            className="input py-1 text-xs flex-1 min-w-[10rem]"
            dir="rtl"
            value={cmdText}
            placeholder='make this title gold — ميّز كلمة السلام — وسّط الفقرة — align right'
            onChange={(e) => setCmdText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runLocalCommand();
              }
            }}
          />
          <button type="button" className="btn-outline text-[11px] py-1 px-2" onClick={runLocalCommand}>
            نفّذ
          </button>
          {cmdMsg && (
            <span className="text-[10px] text-gray-600 dark:text-white/50 w-full">{cmdMsg}</span>
          )}
        </div>
      )}
      {(onAcceptLinter || onRejectLinter) && activeSuggestion && (
        <div className="px-2 pt-2">
          <LinterSuggestionTooltip
            suggestion={activeSuggestion}
            onAccept={(s) => {
              onAcceptLinter?.(s);
              setActiveLinterId(null);
            }}
            onReject={(s) => {
              onRejectLinter?.(s);
              setActiveLinterId(null);
            }}
            onClose={() => setActiveLinterId(null)}
          />
        </div>
      )}
      <EditorContent editor={editor} style={shellStyle} className="px-3 py-2" />
      {linterSuggestions.length > 0 && (
        <div className="px-2 pb-1.5 flex flex-wrap gap-1 border-t border-moj-gold/20 bg-amber-50/50 dark:bg-amber-950/20">
          <span className="text-[10px] text-amber-900 dark:text-amber-100 font-bold py-0.5">
            تدقيق خلفي ({linterSuggestions.length})
          </span>
          {linterSuggestions.slice(0, 6).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                activeLinterId === s.id
                  ? 'border-moj-gold bg-moj-gold/20'
                  : 'border-amber-300/60 bg-white/70 dark:bg-black/20'
              }`}
              onClick={() => setActiveLinterId(s.id)}
              title={s.message}
            >
              {s.kind === 'add' ? `+ ${s.suggestion.slice(0, 18)}` : s.found}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default TiptapBodyEditor;

/** Toolbar helpers — selection-scoped chain mutations (never setContent). */
export function editorApplyColor(editor: Editor | null, hex: string): boolean {
  if (!editor) return false;
  return editor.chain().focus().setColor(hex).run();
}

export function editorApplyBackground(editor: Editor | null, hex: string): boolean {
  if (!editor) return false;
  return editor.chain().focus().setHighlight({ color: hex }).run();
}

export function editorApplyAlign(
  editor: Editor | null,
  align: 'right' | 'center' | 'left',
): boolean {
  if (!editor) return false;
  return editor.chain().focus().setTextAlign(align).run();
}

export function editorApplyBold(editor: Editor | null): boolean {
  if (!editor) return false;
  return editor.chain().focus().toggleBold().run();
}

export function editorApplyFontSize(editor: Editor | null, pt: number): boolean {
  if (!editor) return false;
  return editor.chain().focus().setFontSize(`${pt}pt`).run();
}

export function editorApplyFontFamily(editor: Editor | null, family: string): boolean {
  if (!editor) return false;
  // TipTap TextStyle → style="font-family: 'Amiri', serif;"
  const css = tiptapFontFamilyCss(family);
  return editor.chain().focus().setFontFamily(css).run();
}

export function editorApplyEnlarge(editor: Editor | null, level: 1 | 2): boolean {
  if (!editor) return false;
  const cur = editor.getAttributes('textStyle').fontSize as string | undefined;
  const base = cur ? parseFloat(cur) : 14;
  const next = level === 2 ? base * 1.4 : base * 1.22;
  return editor.chain().focus().setFontSize(`${Math.round(next * 10) / 10}pt`).run();
}

export function editorClearMarks(editor: Editor | null): boolean {
  if (!editor) return false;
  return editor.chain().focus().unsetAllMarks().run();
}

export function editorInsertTable(
  editor: Editor | null,
  rows = 3,
  cols = 3,
): boolean {
  if (!editor) return false;
  return editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
}

/**
 * Insert an adapted/aggregated HTML table (from the Universal Table &
 * Model Adaptor) at the end of the document — never replaces the whole body.
 */
export function editorInsertAdaptedTable(editor: Editor | null, html: string): boolean {
  if (!editor || editor.isDestroyed) return false;
  const content = `<p></p>${html}`;
  return editor.chain().focus().insertContentAt(editor.state.doc.content.size, content).run();
}

/**
 * Insert an adapted/aggregated HTML table at the current cursor/selection —
 * used by the strict TipTap paste handler so an Excel/Word/Outlook table lands
 * where the user pasted it instead of being flattened into plain paragraphs.
 */
export function editorInsertAdaptedTableAtSelection(editor: Editor | null, html: string): boolean {
  if (!editor || editor.isDestroyed) return false;
  const pos = editor.state.selection.from;
  try {
    return editor.chain().focus().insertContentAt(pos, html).run();
  } catch {
    return false;
  }
}
