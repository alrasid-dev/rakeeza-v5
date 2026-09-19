'use client';

/**
 * Compact letter-editor assistant panel — local tool calling into TipTap.
 * FREE / no OpenAI. Natural language (AR+EN) → typed tools → applyAiBodyCommand.
 */

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  ASSISTANT_TOOL_SCHEMAS,
  handleAssistantUtterance,
  type AssistantHandleResult,
} from '@/lib/assistant-tools';

type Msg = { role: 'user' | 'assistant'; text: string; tool?: string };

const CHIPS = [
  'make this title gold',
  'align right',
  'ميّز كلمة السلام',
  'وسّط الفقرة',
  'لون العنوان أخضر',
  'جدول 2x3',
];

type Props = {
  getEditor: () => Editor | null;
  onResult?: (result: AssistantHandleResult) => void;
  className?: string;
  /** Compact default open state */
  defaultOpen?: boolean;
};

export default function LetterAssistantPanel({
  getEditor,
  onResult,
  className = '',
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'مساعد التنسيق المحلي — اكتب بالعربية أو الإنجليزية (مثال: make this title gold). بدون واجهات مدفوعة.',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  function run(utterance?: string) {
    const text = (utterance ?? input).trim();
    if (!text) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    const editor = getEditor();
    const result = handleAssistantUtterance(editor, text);
    onResult?.(result);
    const toolHint = result.toolCall
      ? ` ← ${result.toolCall.name}(${JSON.stringify(result.toolCall.arguments)})`
      : '';
    setMsgs((m) => [
      ...m,
      {
        role: 'assistant',
        text: `${result.ok ? '✓' : '✗'} ${result.message}${toolHint}`,
        tool: result.toolCall?.name,
      },
    ]);
  }

  return (
    <div
      className={`rounded-xl border border-moj-green/30 bg-white dark:bg-[var(--surface)] shadow-sm overflow-hidden ${className}`}
      dir="rtl"
      data-letter-assistant="1"
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-l from-moj-green/90 to-[#0a8f4a] text-white text-sm font-bold"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <img src="/rakeeza-ai-icon.svg" alt="" className="w-6 h-6" />
        <span className="flex-1 text-right">مساعد التنسيق (محلي)</span>
        <span className="text-[10px] font-normal opacity-90">
          {ASSISTANT_TOOL_SCHEMAS.length} أدوات
        </span>
        <span className="text-lg leading-none">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="flex flex-col max-h-[18rem]">
          <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-moj-green/10 bg-moj-light/40 dark:bg-white/5">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                className="text-[10px] px-2 py-0.5 rounded-full border border-moj-green/25 bg-white dark:bg-white/10 text-moj-green dark:text-moj-gold hover:bg-moj-green hover:text-white"
                onClick={() => run(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 min-h-[6rem]">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`text-[11px] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 max-w-[95%] ${
                  m.role === 'user'
                    ? 'mr-auto bg-moj-green text-white rounded-bl-md'
                    : 'ml-auto bg-moj-light dark:bg-white/10 border border-moj-green/10 rounded-br-md'
                }`}
              >
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            className="p-2 border-t dark:border-white/10 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <input
              className="input flex-1 py-1.5 text-xs rounded-full"
              placeholder='مثال: "make this title gold" أو "ميّز كلمة السلام"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary rounded-full px-3 text-xs shrink-0" disabled={!input.trim()}>
              نفّذ
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
