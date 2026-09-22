/**
 * Shared TipTap extension set for the letter body editor (RTL MOJ).
 * Letterhead/QR/meta are NOT part of this schema — body only.
 */

import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { createBodyLinterExtension } from '@/lib/tiptap-linter-extension';

/** ميزة: الحفاظ على وسم data-col-type في خلايا الجدول (لأعمدة الأرقام) */
const dataColTypeAttribute = {
  'data-col-type': {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute('data-col-type'),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes['data-col-type'] ? { 'data-col-type': attributes['data-col-type'] } : {},
  },
};

/** ميزة: الحفاظ على وسم class في الجدول والخلايا (لبطاقة case-card) */
const classAttribute = {
  class: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute('class'),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.class ? { class: attributes.class } : {},
  },
};

const TableWithClass = Table.extend({
  addAttributes() {
    return {
      ...(((this as unknown as { parent?: () => Record<string, unknown> }).parent?.() ?? {})),
      ...classAttribute,
    };
  },
});

const TableHeaderWithColType = TableHeader.extend({
  addAttributes() {
    return {
      ...(((this as unknown as { parent?: () => Record<string, unknown> }).parent?.() ?? {})),
      ...dataColTypeAttribute,
      ...classAttribute,
    };
  },
});

const TableCellWithColType = TableCell.extend({
  addAttributes() {
    return {
      ...(((this as unknown as { parent?: () => Record<string, unknown> }).parent?.() ?? {})),
      ...dataColTypeAttribute,
      ...classAttribute,
    };
  },
});

const KeyboardShortcuts = Extension.create({
  name: 'keyboardShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-e': () => this.editor.commands.setTextAlign('center'),
      'Mod-r': () => this.editor.commands.setTextAlign('right'),
      'Mod-l': () => this.editor.commands.setTextAlign('left'),
      'Mod-j': () => this.editor.commands.setTextAlign('justify'),
    };
  },
});

export function createBodyExtensions(opts?: { placeholder?: string; enableLinter?: boolean }) {
  const list = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      code: false,
      // StarterKit v3 already registers underline — do not add a second copy
    }),
    TextStyleKit.configure({
      lineHeight: false,
      backgroundColor: {},
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['right', 'center', 'left', 'justify'],
      defaultAlignment: 'right',
    }),
    Highlight.configure({ multicolor: true }),
    KeyboardShortcuts,
    TableWithClass.configure({ resizable: false }),
    TableRow,
    TableHeaderWithColType,
    TableCellWithColType,
    Placeholder.configure({
      placeholder: opts?.placeholder || 'نص المكاتبة…',
    }),
  ];
  if (opts?.enableLinter) {
    list.push(createBodyLinterExtension());
  }
  return list;
}
