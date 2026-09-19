/**
 * TipTap extension: inline linter highlights + click → activate suggestion tooltip.
 * Local only — decorations from body-linter suggestions.
 *
 * Use createBodyLinterExtension() so each editor gets its own PluginKey
 * (shared keys across Editor instances break decorations under jsdom).
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { LinterSuggestion } from '@/lib/body-linter';
import { findTextRanges } from '@/lib/tiptap-ai-commands';

export type BodyLinterStorage = {
  suggestions: LinterSuggestion[];
  activeId: string | null;
  onActivate: ((id: string) => void) | null;
};

declare module '@tiptap/core' {
  interface Storage {
    bodyLinter: BodyLinterStorage;
  }
  interface Commands<ReturnType> {
    bodyLinter: {
      setLinterSuggestions: (suggestions: LinterSuggestion[]) => ReturnType;
      setActiveLinterId: (id: string | null) => ReturnType;
    };
  }
}

function buildDecorations(doc: PmNode, suggestions: LinterSuggestion[]): DecorationSet {
  if (!suggestions.length) return DecorationSet.create(doc, []);
  const decos: ReturnType<typeof Decoration.inline>[] = [];
  for (const s of suggestions) {
    if (s.kind === 'add' || s.found === '[ختام]' || s.found === '[إضافة]') continue;
    const ranges =
      s.from != null && s.to != null && s.to > s.from
        ? [{ from: s.from, to: s.to }]
        : findTextRanges(doc, s.found);
    for (const r of ranges) {
      if (r.from < 0 || r.to > doc.content.size || r.from >= r.to) continue;
      decos.push(
        Decoration.inline(r.from, r.to, {
          class: `linter-issue linter-issue--${s.type}`,
          'data-linter-id': s.id,
          title: s.message,
        }),
      );
    }
  }
  return DecorationSet.create(doc, decos);
}

/** Create a fresh body-linter extension (unique PluginKey per call). */
export function createBodyLinterExtension() {
  const pluginKey = new PluginKey('bodyLinterDeco');

  return Extension.create({
    name: 'bodyLinter',

    addStorage() {
      return {
        suggestions: [] as LinterSuggestion[],
        activeId: null as string | null,
        onActivate: null as ((id: string) => void) | null,
      } satisfies BodyLinterStorage;
    },

    addCommands() {
      return {
        setLinterSuggestions:
          (suggestions: LinterSuggestion[]) =>
          ({ editor, tr, dispatch }) => {
            editor.storage.bodyLinter.suggestions = suggestions;
            if (dispatch) {
              dispatch(
                tr.setMeta(pluginKey, {
                  decorations: buildDecorations(editor.state.doc, suggestions),
                }),
              );
            }
            return true;
          },
        setActiveLinterId:
          (id: string | null) =>
          ({ editor, tr, dispatch }) => {
            editor.storage.bodyLinter.activeId = id;
            if (dispatch) {
              dispatch(
                tr.setMeta(pluginKey, {
                  decorations: buildDecorations(
                    editor.state.doc,
                    editor.storage.bodyLinter.suggestions || [],
                  ),
                }),
              );
            }
            return true;
          },
      };
    },

    addProseMirrorPlugins() {
      const extension = this;
      return [
        new Plugin({
          key: pluginKey,
          state: {
            init(_config, state) {
              return DecorationSet.create(state.doc, []);
            },
            apply(tr, oldSet, _oldState, newState) {
              const meta = tr.getMeta(pluginKey) as { decorations?: DecorationSet } | undefined;
              if (meta?.decorations) return meta.decorations;
              if (tr.docChanged) return oldSet.map(tr.mapping, newState.doc);
              return oldSet;
            },
          },
          props: {
            decorations(state) {
              return pluginKey.getState(state);
            },
            handleClick(_view, _pos, event) {
              const el = (event.target as HTMLElement | null)?.closest?.('[data-linter-id]');
              if (!el) return false;
              const id = el.getAttribute('data-linter-id');
              if (!id) return false;
              const storage = extension.storage as BodyLinterStorage;
              storage.activeId = id;
              storage.onActivate?.(id);
              return true;
            },
          },
        }),
      ];
    },
  });
}
