/**
 * Verify local FREE assistant tool-calling + background body linter (1500ms).
 * No OpenAI — NL → tools → TipTap chain; debounce + accept/reject.
 *
 * Run: npx tsx scripts/verify-assistant-linter.mts
 *   or: npm run verify:assistant-linter
 */
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { createBodyExtensions } from '../src/lib/tiptap-extensions.ts';
import { createBodyLinterExtension } from '../src/lib/tiptap-linter-extension.ts';
import { markersToEditorHtml, editorHtmlToBody } from '../src/lib/body-html-bridge.ts';
import {
  ASSISTANT_TOOL_SCHEMAS,
  executeAssistantToolCall,
  handleAssistantUtterance,
  routeNaturalLanguageToTool,
} from '../src/lib/assistant-tools.ts';
import {
  LINTER_DEBOUNCE_MS,
  acceptLinterSuggestion,
  dismissSuggestion,
  locateSuggestionsInEditor,
  rejectLinterSuggestion,
  scanBodySuggestions,
  scheduleLinterScan,
} from '../src/lib/body-linter.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
Object.assign(globalThis as any, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  DocumentFragment: dom.window.DocumentFragment,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number,
  cancelAnimationFrame: (id: number) => clearTimeout(id),
});

const BODY = `السلام عليكم ورحمة الله وبركاته وبعد:-

نحيط فضيله رئيس المحكمة علما بالموضوع المطروح للنظر.

والله الموفق.`;

function createEditor(extensions: any[], content: string) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const opts = { element, extensions, content };
  try {
    return { editor: new Editor(opts), element };
  } catch {
    element.remove();
    const el2 = document.createElement('div');
    document.body.appendChild(el2);
    return { editor: new Editor({ ...opts, element: el2 }), element: el2 };
  }
}

// --- 1) Tool schemas ---
{
  assert(ASSISTANT_TOOL_SCHEMAS.length >= 8, `tool schemas count=${ASSISTANT_TOOL_SCHEMAS.length}`);
  const names = new Set(ASSISTANT_TOOL_SCHEMAS.map((s) => s.name));
  assert(names.has('highlightWord'), 'schema has highlightWord');
  assert(names.has('colorTitle'), 'schema has colorTitle');
  assert(names.has('centerParagraph'), 'schema has centerParagraph');
  assert(names.has('insertTable'), 'schema has insertTable');
}

// --- 2) NL → tool routing ---
{
  const title = routeNaturalLanguageToTool('make this title gold');
  assert(title?.name === 'colorTitle', `title gold → colorTitle got ${title?.name}`);
  assert(
    String(title?.arguments.color || '').toLowerCase().includes('c5a059') ||
      title?.arguments.color === '#C5A059',
    `title gold color=${title?.arguments.color}`,
  );

  const align = routeNaturalLanguageToTool('align right');
  assert(
    align?.name === 'alignParagraph' || align?.name === 'centerParagraph',
    `align right → ${align?.name}`,
  );

  const arHighlight = routeNaturalLanguageToTool('ميّز كلمة السلام');
  assert(arHighlight?.name === 'highlightWord', `AR highlight → ${arHighlight?.name}`);
  assert(String(arHighlight?.arguments.word || '').includes('السلام'), 'highlight word=السلام');

  const arCenter = routeNaturalLanguageToTool('وسّط الفقرة');
  assert(arCenter?.name === 'centerParagraph', `وسّط الفقرة → ${arCenter?.name}`);

  const arTitle = routeNaturalLanguageToTool('لون العنوان أخضر');
  assert(arTitle?.name === 'colorTitle', `لون العنوان → ${arTitle?.name}`);

  const table = routeNaturalLanguageToTool('جدول 2x3');
  assert(table?.name === 'insertTable', `جدول 2x3 → ${table?.name}`);
  assert(
    Number(table?.arguments.rows) === 2 && Number(table?.arguments.cols) === 3,
    'table 2x3 dims',
  );

  const unknown = routeNaturalLanguageToTool('اكتب لي قصيدة');
  assert(unknown === null, 'unknown utterance → null (no hallucinated tool)');
}

// --- 3) TipTap chain (body extensions without linter plugin — jsdom-stable) ---
{
  const { editor, element } = createEditor(
    createBodyExtensions({ enableLinter: false }),
    markersToEditorHtml(BODY),
  );
  const before = editor.getHTML();

  const r1 = handleAssistantUtterance(editor, 'make this title gold');
  assert(r1.ok && r1.usedChain, `handle title gold: ${r1.message}`);
  assert(r1.toolCall?.name === 'colorTitle', 'toolCall recorded colorTitle');
  assert(
    editor.getHTML() !== before || /color|#|style/i.test(editor.getHTML()),
    'editor mutated for title color',
  );

  const r2 = handleAssistantUtterance(editor, 'ميّز كلمة السلام');
  assert(r2.ok && r2.usedChain, `handle highlight: ${r2.message}`);
  assert(/mark|background|data-color|#C5A059|rgb/i.test(editor.getHTML()), 'highlight mark present');

  const r3 = handleAssistantUtterance(editor, 'وسّط الفقرة');
  assert(r3.ok && r3.usedChain, `handle center: ${r3.message}`);

  const r4 = executeAssistantToolCall(editor, {
    name: 'colorMatch',
    arguments: { match: 'الموضوع', color: 'green' },
  });
  assert(r4.ok && r4.usedChain, `execute colorMatch: ${r4.message}`);

  const html = editor.getHTML();
  assert(html.includes('السلام'), 'salutation still in body');
  assert(!html.includes('وزارة العدل'), 'no letterhead injected into body editor');

  const stored = editorHtmlToBody(html);
  assert(stored.includes('السلام') || stored.length > 20, 'body bridge still has content');

  const fail = handleAssistantUtterance(editor, 'xyz nonsense 999');
  assert(!fail.ok && fail.toolCall === null, 'nonsense fails locally without tool');

  editor.destroy();
  element.remove();
}

// --- 4) Debounce ---
{
  assert(LINTER_DEBOUNCE_MS === 1500, `LINTER_DEBOUNCE_MS=${LINTER_DEBOUNCE_MS}`);

  let fired = 0;
  const t0 = Date.now();
  await new Promise<void>((resolve) => {
    scheduleLinterScan(() => {
      fired += 1;
      const elapsed = Date.now() - t0;
      assert(elapsed >= 1400, `debounce elapsed≈${elapsed}ms (>=1400)`);
      assert(elapsed < 2200, `debounce elapsed≈${elapsed}ms (<2200)`);
      resolve();
    }, LINTER_DEBOUNCE_MS);

    let cancelledFired = false;
    const cancel2 = scheduleLinterScan(() => {
      cancelledFired = true;
    }, 50);
    cancel2();
    setTimeout(() => {
      assert(!cancelledFired, 'cancelled scan did not fire');
    }, 120);
  });
  assert(fired === 1, 'scheduled scan fired once');
}

// --- 5) scan / locate / accept / reject (StarterKit + linter — jsdom-safe) ---
{
  const { editor, element } = createEditor(
    [StarterKit, createBodyLinterExtension()],
    markersToEditorHtml(BODY),
  );
  const scanned = scanBodySuggestions(BODY);
  assert(scanned.suggestions.length >= 1, `scan found suggestions n=${scanned.suggestions.length}`);
  const spelling = scanned.suggestions.find((s) => s.found === 'فضيله');
  assert(!!spelling, 'scan flags فضيله → فضيلة');

  const located = locateSuggestionsInEditor(editor, scanned.suggestions);
  const loc = located.find((s) => s.found === 'فضيله');
  assert(
    loc?.from != null && loc?.to != null && loc.to > loc.from!,
    `located range from=${loc?.from} to=${loc?.to}`,
  );

  editor.commands.setLinterSuggestions(located);
  assert(
    Array.isArray(editor.storage.bodyLinter.suggestions) &&
      editor.storage.bodyLinter.suggestions.length === located.length,
    'bodyLinter storage holds suggestions',
  );

  const accept = acceptLinterSuggestion(editor, spelling!);
  assert(accept.ok && accept.usedChain, `accept spelling: ${accept.message}`);
  assert(editor.getHTML().includes('فضيلة'), 'accepted replacement in editor');

  const remaining = dismissSuggestion(located, spelling!.id);
  assert(!remaining.some((s) => s.id === spelling!.id), 'dismiss removes accepted id');

  const dismissed = rejectLinterSuggestion([], remaining[0]?.id || 'x');
  assert(dismissed.has(remaining[0]?.id || 'x'), 'reject adds to dismissed set');

  const rescanned = scanBodySuggestions(editor.getText(), dismissed);
  assert(
    !rescanned.suggestions.some((s) => s.id === (remaining[0]?.id || 'x')),
    'dismissed id filtered on rescan',
  );

  editor.destroy();
  element.remove();
}

console.log('\nAll assistant + linter checks passed (local, no OpenAI).');
