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
  parseLocalStyleCommand,
  type AiBodyCommand,
  type AiCommandResult,
} from '@/lib/tiptap-ai-commands';
import type { DocStyle } from '@/components/StyleToolbar';
import { fontStackFor, tiptapFontFamilyCss } from '@/lib/font-stacks';

export type TiptapBodyEditorHandle = {
  getEditor: () => Editor | null;
  applyCommand: (cmd: AiBodyCommand) => AiCommandResult;
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
};

function normalizeHtml(html: string): string {
  return String(html || '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
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
  },
  ref,
) {
  const emittingRef = useRef(false);
  const lastEmittedRef = useRef('');
  const [cmdText, setCmdText] = useState('');
  const [cmdMsg, setCmdMsg] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createBodyExtensions({ placeholder }),
    content: markersToEditorHtml(value, style?.align || 'right'),
    editorProps: {
      attributes: {
        class: 'tiptap-body-editor prose-moj focus:outline-none',
        dir: 'rtl',
        lang: 'ar',
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
      focus: () => editor?.chain().focus().run(),
    }),
    [editor, onCommandResult],
  );

  const runLocalCommand = () => {
    const parsed = parseLocalStyleCommand(cmdText);
    if (!parsed) {
      setCmdMsg('أمر غير مفهوم — مثال: ميّز كلمة السلام | وسط فقرة وبعد | لون العنوان أخضر | جدول 2x3');
      return;
    }
    const result = applyAiBodyCommand(editor, parsed);
    setCmdMsg(result.message);
    onCommandResult?.(result);
    if (result.ok) setCmdText('');
  };

  const shellStyle: CSSProperties = {
    fontFamily: fontStackFor(style?.fontFamily || 'Traditional Arabic'),
    fontSize: style?.fontSizePt ? `${style.fontSizePt}pt` : '14pt',
    minHeight,
  };

  return (
    <div className={`tiptap-body-shell rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#121c18] ${className}`}>
      {showCommandBar && (
        <div className="flex flex-wrap gap-1.5 items-center border-b border-moj-green/15 px-2 py-1.5 bg-moj-light/40 dark:bg-white/5">
          <label className="text-[10px] font-bold text-moj-green whitespace-nowrap">أمر تنسيق (محلي)</label>
          <input
            className="input py-1 text-xs flex-1 min-w-[10rem]"
            dir="rtl"
            value={cmdText}
            placeholder='ميّز كلمة السلام — وسط فقرة وبعد — لون العنوان أخضر'
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
      <EditorContent editor={editor} style={shellStyle} className="px-3 py-2" />
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
  return editor.chain().focus().setBackgroundColor(hex).run();
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
