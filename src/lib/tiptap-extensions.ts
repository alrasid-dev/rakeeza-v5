/**
 * Shared TipTap extension set for the letter body editor (RTL MOJ).
 * Letterhead/QR/meta are NOT part of this schema — body only.
 */

import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyleKit } from '@tiptap/extension-text-style';

export function createBodyExtensions(opts?: { placeholder?: string }) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      code: false,
      // StarterKit v3 already registers underline — do not add a second copy
    }),
    TextStyleKit.configure({
      lineHeight: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['right', 'center', 'left'],
      defaultAlignment: 'right',
    }),
    Highlight.configure({ multicolor: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
      placeholder: opts?.placeholder || 'نص المكاتبة…',
    }),
  ];
}
