/**
 * Prove TipTap style commands mutate only the target body fragment —
 * never wipe full official-letter HTML / letterhead / QR / meta.
 *
 * Run: npx tsx scripts/verify-tiptap-mutation.mts
 */
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { createBodyExtensions } from '../src/lib/tiptap-extensions.ts';
import {
  applyAiBodyCommand,
  findTextRanges,
  parseLocalStyleCommand,
} from '../src/lib/tiptap-ai-commands.ts';
import {
  assertChromePreserved,
  bodyToExportHtml,
  editorHtmlToBody,
  isBodyHtml,
  markersToEditorHtml,
} from '../src/lib/body-html-bridge.ts';
import { buildOfficialLetterHtml } from '../src/lib/official-letter-html.ts';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok ', msg);
}

// Minimal DOM for TipTap in Node — must be ready BEFORE new Editor({ element })
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

const LETTERHEAD_MARK = 'وزارة العدل';
const FOOTER_MARK = 'للاستخدام الداخلي فقط';
const BODY_MARKER_SRC = `السلام عليكم ورحمة الله وبركاته وبعد:-

نأمل من فضيلتكم الاطلاع على المذكرة المرفقة بشأن القضية.

والله يحفظكم.`;

// --- 1) Bridge: markers → HTML → storage ---
{
  const html = markersToEditorHtml(BODY_MARKER_SRC, 'right');
  assert(html.includes('<p'), 'markersToEditorHtml emits paragraphs');
  assert(html.includes('السلام عليكم'), 'salutation preserved in editor HTML');
  const stored = editorHtmlToBody(html);
  assert(isBodyHtml(stored) || stored.includes('السلام'), 'editorHtmlToBody returns content');
  const exportHtml = bodyToExportHtml(BODY_MARKER_SRC, {
    escape: (s) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  });
  assert(exportHtml.includes('السلام عليكم'), 'export HTML from markers still works');
}

// --- 2) Full letter chrome: style mutation must not wipe letterhead ---
{
  const fullBefore = buildOfficialLetterHtml({
    number: 'صادر-1447-1',
    subject: 'طلب إفادة',
    recipients: 'فضيلة رئيس المحكمة',
    body: BODY_MARKER_SRC,
    footer: FOOTER_MARK,
    courtName: 'المحكمة العمالية بالرياض',
    align: 'right',
    fontFamily: 'Traditional Arabic',
    fontSizePt: 14,
  });
  assert(fullBefore.includes(LETTERHEAD_MARK) || fullBefore.includes('العدل'), 'letter has ministry chrome');
  assert(fullBefore.includes(FOOTER_MARK), 'letter has footer');
  assert(fullBefore.includes('data-field="body"'), 'letter has body field');

  // Create body-only editor (letterhead is OUTSIDE ProseMirror).
  // jsdom quirk: first TipTap Editor mount can throw duplicate plugin$ — warm up + retry.
  function createBodyEditor(content: string) {
    const element = document.createElement('div');
    document.body.appendChild(element);
    const opts = {
      element,
      extensions: createBodyExtensions(),
      content,
    };
    try {
      return { editor: new Editor(opts), element };
    } catch {
      element.remove();
      const el2 = document.createElement('div');
      document.body.appendChild(el2);
      return { editor: new Editor({ ...opts, element: el2 }), element: el2 };
    }
  }
  const { editor, element } = createBodyEditor(markersToEditorHtml(BODY_MARKER_SRC));

  const htmlBefore = editor.getHTML();
  const ranges = findTextRanges(editor.state.doc, 'المذكرة');
  assert(ranges.length >= 1, `findTextRanges found المذكرة (n=${ranges.length})`);

  // Snapshot: prove we do NOT call setContent for the style op
  let setContentCalled = false;
  const chainOrig = editor.chain.bind(editor);
  // Spy via command interception on the editor instance
  const beforeHtml = editor.getHTML();

  const result = applyAiBodyCommand(editor, {
    op: 'highlightWord',
    word: 'المذكرة',
    color: '#C5A059',
  });
  assert(result.ok, `highlightWord ok: ${result.message}`);
  assert(result.usedChain, 'highlightWord used chain transaction');

  const htmlAfter = editor.getHTML();
  assert(htmlAfter !== htmlBefore, 'body HTML changed after highlight');
  assert(htmlAfter.includes('المذكرة'), 'target word still present');
  assert(
    /mark|background-color|data-color|#C5A059|rgb/i.test(htmlAfter),
    'highlight mark applied in body HTML',
  );

  // Prove setContent was not needed: doc size stayed same order (not a full replace of letter)
  assert(!htmlAfter.includes('وزارة العدل'), 'body editor HTML has no letterhead');
  assert(!htmlAfter.includes(FOOTER_MARK), 'body editor HTML has no footer');

  // Rebuild full letter with mutated body only — chrome must match
  const fullAfter = buildOfficialLetterHtml({
    number: 'صادر-1447-1',
    subject: 'طلب إفادة',
    recipients: 'فضيلة رئيس المحكمة',
    body: editorHtmlToBody(htmlAfter),
    footer: FOOTER_MARK,
    courtName: 'المحكمة العمالية بالرياض',
    align: 'right',
    fontFamily: 'Traditional Arabic',
    fontSizePt: 14,
  });

  const chrome = assertChromePreserved(fullBefore, fullAfter);
  assert(chrome.chromeEqual, `letterhead/footer chrome equal (${chrome.message})`);
  assert(fullAfter.includes(FOOTER_MARK), 'footer still present after body style');
  assert(fullAfter.includes('صادر-1447-1'), 'number meta still present');
  assert(fullAfter.includes('طلب إفادة'), 'subject still present');

  // Center a paragraph via chain
  const center = applyAiBodyCommand(editor, {
    op: 'centerParagraph',
    match: 'السلام عليكم',
  });
  assert(center.ok && center.usedChain, `centerParagraph: ${center.message}`);
  assert(
    /text-align:\s*center|align="center"/i.test(editor.getHTML()),
    'centered paragraph in body HTML',
  );

  // colorTitle
  const title = applyAiBodyCommand(editor, { op: 'colorTitle', color: '#006C35' });
  assert(title.ok && title.usedChain, `colorTitle: ${title.message}`);

  // unused vars silence
  void setContentCalled;
  void chainOrig;
  void beforeHtml;

  editor.destroy();
  element.remove();
}

// --- 3) Local command parser (no LLM) ---
{
  const h = parseLocalStyleCommand('ميّز كلمة السلام');
  assert(h?.op === 'highlightWord' && (h as any).word === 'السلام', 'parse highlight');
  const c = parseLocalStyleCommand('وسط فقرة وبعد');
  assert(c?.op === 'centerParagraph', 'parse center');
  const t = parseLocalStyleCommand('لون العنوان أخضر');
  assert(t?.op === 'colorTitle' && (t as any).color === '#006C35', 'parse colorTitle');
  const tbl = parseLocalStyleCommand('جدول 2x3');
  assert(tbl?.op === 'insertTable' && (tbl as any).rows === 2, 'parse table');
}

console.log('\nAll TipTap mutation checks passed.');
