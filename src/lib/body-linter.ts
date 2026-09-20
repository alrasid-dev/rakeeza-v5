/**
 * Background body linter — local rules only (spelling / grammar / judicial phrasing).
 * Debounces ~1500ms after typing stops. Accept = targeted TipTap txn; Reject = dismiss one.
 * FREE — no OpenAI.
 */

import type { Editor } from '@tiptap/core';
import {
  applyPolishFix,
  findPolishIssues,
  suggestLegalPhrases,
  type PolishIssue,
  type PolishKind,
} from '@/lib/arabic-polish';
import { findTextRanges } from '@/lib/tiptap-ai-commands';
import { suggestProtocolAddresses } from '@/lib/protocol-address';

/** Exact debounce after last body change (ms). */
export const LINTER_DEBOUNCE_MS = 1500;

export type LinterSuggestionType = 'spelling' | 'grammar' | 'style' | 'judicial' | 'protocol';

export type LinterSuggestion = {
  id: string;
  type: LinterSuggestionType;
  found: string;
  suggestion: string;
  message: string;
  kind: PolishKind;
  /** First ProseMirror range when scanned against live editor (optional). */
  from?: number;
  to?: number;
};

export type LinterScanResult = {
  suggestions: LinterSuggestion[];
  scannedAt: number;
  textLength: number;
};

function suggestionId(type: string, found: string, suggestion: string, kind: PolishKind): string {
  return `${type}|${kind}|${found}→${suggestion}`;
}

function mapPolishType(t: PolishIssue['type']): LinterSuggestionType {
  return t === 'spelling' ? 'spelling' : 'style';
}

/**
 * Scan plain body text with local polish + judicial phrase rules.
 * Filters out dismissed suggestion ids.
 */
export function scanBodySuggestions(
  text: string,
  dismissedIds: Iterable<string> = [],
): LinterScanResult {
  const raw = String(text || '');
  const dismissed = new Set(dismissedIds);
  const out: LinterSuggestion[] = [];
  const seen = new Set<string>();

  const push = (s: LinterSuggestion) => {
    if (dismissed.has(s.id) || seen.has(s.id)) return;
    seen.add(s.id);
    out.push(s);
  };

  for (const issue of findPolishIssues(raw)) {
    const kind: PolishKind = issue.kind || 'replace';
    const type = mapPolishType(issue.type);
    push({
      id: suggestionId(type, issue.found, issue.suggestion, kind),
      type,
      found: issue.found,
      suggestion: issue.suggestion,
      message: issue.message,
      kind,
    });
  }

  for (const ph of suggestLegalPhrases(raw)) {
    const kind: PolishKind = ph.kind || 'replace';
    const type: LinterSuggestionType = kind === 'add' ? 'judicial' : 'judicial';
    push({
      id: suggestionId(type, ph.found, ph.suggestion, kind),
      type,
      found: ph.found,
      suggestion: ph.suggestion,
      message: ph.message,
      kind,
    });
  }

  return {
    suggestions: out,
    scannedAt: Date.now(),
    textLength: raw.length,
  };
}

/**
 * Scan recipients/correspondence text for judicial/administrative protocol
 * (الألقاب القضائية) and surface one-click adopt suggestions.
 */
export function scanProtocolSuggestions(
  text: string,
  dismissedIds: Iterable<string> = [],
): LinterSuggestion[] {
  const raw = String(text || '');
  const dismissed = new Set(dismissedIds);
  const seen = new Set<string>();
  const out: LinterSuggestion[] = [];

  for (const ph of suggestProtocolAddresses(raw)) {
    const id = `protocol|${ph.role}|${ph.found}→${ph.suggestion}`;
    if (dismissed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      type: 'protocol',
      found: ph.found,
      suggestion: ph.suggestion,
      message: ph.message,
      kind: ph.kind,
    });
  }

  return out;
}

/** Attach first matching doc ranges for inline highlights. */
export function locateSuggestionsInEditor(
  editor: Editor | null | undefined,
  suggestions: LinterSuggestion[],
): LinterSuggestion[] {
  if (!editor || editor.isDestroyed) return suggestions;
  const doc = editor.state.doc;
  return suggestions.map((s) => {
    if (s.kind === 'add' || s.found === '[ختام]' || s.found === '[إضافة]') {
      // Place marker at end of doc for add suggestions
      const end = doc.content.size;
      return { ...s, from: Math.max(1, end - 1), to: Math.max(1, end - 1) };
    }
    const ranges = findTextRanges(doc, s.found);
    if (!ranges.length) return s;
    return { ...s, from: ranges[0].from, to: ranges[0].to };
  });
}

export type AcceptLinterResult = {
  ok: boolean;
  message: string;
  usedChain: boolean;
  /** Updated plain text if caller is not using TipTap (fallback). */
  nextText?: string;
};

/**
 * Accept: apply a targeted TipTap transaction (replace/delete/add).
 * NEVER replaces the full document HTML.
 */
export function acceptLinterSuggestion(
  editor: Editor | null | undefined,
  suggestion: LinterSuggestion,
  plainTextFallback?: string,
): AcceptLinterResult {
  const kind = suggestion.kind || 'replace';
  const sug = String(suggestion.suggestion || '').trim();
  const isDelete = kind === 'delete' || !sug || sug === '—' || sug === '-';

  if (editor && !editor.isDestroyed) {
    if (kind === 'add' || suggestion.found === '[ختام]' || suggestion.found === '[إضافة]') {
      if (!sug || sug === '—' || sug === '-') {
        return { ok: false, message: 'لا نص للإضافة', usedChain: false };
      }
      const end = editor.state.doc.content.size;
      const ok = editor
        .chain()
        .focus()
        .insertContentAt(end, { type: 'paragraph', content: [{ type: 'text', text: sug }] })
        .run();
      return {
        ok,
        message: ok ? 'أُضيف الختام المقترح' : 'تعذّرت الإضافة',
        usedChain: true,
      };
    }

    const ranges = findTextRanges(editor.state.doc, suggestion.found);
    if (!ranges.length) {
      // Fall through to plain-text path if provided
    } else {
      // Apply from end → start so positions stay valid
      for (let i = ranges.length - 1; i >= 0; i--) {
        const r = ranges[i];
        if (isDelete) {
          editor.chain().focus().deleteRange({ from: r.from, to: r.to }).run();
        } else {
          editor
            .chain()
            .focus()
            .insertContentAt({ from: r.from, to: r.to }, sug)
            .run();
        }
        // Only first occurrence (match polish applyPolishFix behavior)
        break;
      }
      return {
        ok: true,
        message: isDelete ? `حُذف «${suggestion.found}»` : `استُبدل «${suggestion.found}» ← «${sug}»`,
        usedChain: true,
      };
    }
  }

  // Plain-text fallback (non-body fields / no editor)
  if (plainTextFallback != null) {
    const next = applyPolishFix(plainTextFallback, suggestion.found, suggestion.suggestion, kind);
    if (next === plainTextFallback) {
      return { ok: false, message: 'لم يُطبَّق التعديل', usedChain: false, nextText: next };
    }
    return { ok: true, message: 'طُبّق التعديل', usedChain: false, nextText: next };
  }

  return { ok: false, message: 'المحرر غير جاهز', usedChain: false };
}

/**
 * Reject: dismiss this suggestion id only (caller persists the set).
 */
export function rejectLinterSuggestion(
  dismissedIds: Iterable<string>,
  suggestionId: string,
): Set<string> {
  const next = new Set(dismissedIds);
  next.add(suggestionId);
  return next;
}

/** Filter a list after reject. */
export function dismissSuggestion(
  suggestions: LinterSuggestion[],
  id: string,
): LinterSuggestion[] {
  return suggestions.filter((s) => s.id !== id);
}

/**
 * Tiny debounce helper used by UI + verify script.
 * Schedules `fn` after LINTER_DEBOUNCE_MS; returns cancel function.
 */
export function scheduleLinterScan(fn: () => void, delayMs: number = LINTER_DEBOUNCE_MS): () => void {
  const handle = setTimeout(fn, delayMs);
  return () => clearTimeout(handle);
}
