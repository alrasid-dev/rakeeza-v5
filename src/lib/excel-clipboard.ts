/**
 * Excel-friendly HTML table clipboard helpers.
 * Excel pastes HTML <table> into separate grid cells when each <td>/<th>
 * has an explicit border (e.g. border: 1px solid #ccc) and border-collapse.
 */

const EXCEL_TD_BORDER = '1px solid #ccc';

function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type ExcelKvRow = { label: string; value: string };

const CELL_STYLE = `border: ${EXCEL_TD_BORDER}; padding: 4px 8px; vertical-align: top; mso-number-format:'\\@';`;

/**
 * Build a bordered HTML table Excel will split into distinct cells on paste.
 * Every td/th must carry explicit border: 1px solid #ccc.
 */
export function buildExcelTableHtml(
  rows: string[][],
  opts?: { headers?: string[]; dir?: 'rtl' | 'ltr' },
): string {
  const dir = opts?.dir || 'rtl';
  const headerRow = opts?.headers?.length
    ? `<tr>${opts.headers
        .map(
          (h) =>
            `<th style="${CELL_STYLE} background:#f3f3f3;font-weight:700;text-align:right">${esc(h)}</th>`,
        )
        .join('')}</tr>`
    : '';
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td style="${CELL_STYLE} text-align:right" dir="auto">${esc(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  return `<table dir="${dir}" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse;border:1px solid #ccc">
  ${headerRow}${body}
</table>`;
}

/** Key/value rows → 2-column Excel table (label | value). */
export function buildExcelKvTableHtml(rows: ExcelKvRow[], opts?: { dir?: 'rtl' | 'ltr' }): string {
  const data = (rows || []).map((r) => [r.label || '', r.value || '']);
  return buildExcelTableHtml(data, {
    headers: ['الحقل', 'القيمة'],
    dir: opts?.dir || 'rtl',
  });
}

/** Name / id / extra party rows → Excel table. */
export function buildExcelPartyTableHtml(
  rows: { name: string; id?: string; extra?: string }[],
): string {
  const data = (rows || []).map((r) => [r.name || '', r.id || '', r.extra || '']);
  return buildExcelTableHtml(data, {
    headers: ['الاسم', 'الهوية', 'ملاحظات'],
  });
}

/** Plain TSV fallback for Excel / editors that ignore HTML. */
export function excelTableToPlainTsv(rows: string[][], headers?: string[]): string {
  const lines: string[] = [];
  if (headers?.length) lines.push(headers.join('\t'));
  for (const row of rows) lines.push(row.map((c) => String(c ?? '').replace(/\t/g, ' ')).join('\t'));
  return lines.join('\n');
}

/**
 * Write Excel-friendly HTML (+ plain TSV) to the system clipboard.
 * Uses text/html Clipboard Blob so Excel pastes into separate grid cells.
 */
export async function copyExcelTableHtml(html: string, plainFallback?: string): Promise<boolean> {
  const plainText =
    plainFallback ||
    html
      .replace(/<\/(tr|table)>/gi, '\n')
      .replace(/<\/t[dh]>/gi, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/\t+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const blobHtml = new Blob([html], { type: 'text/html' });
  const blobPlain = new Blob([plainText], { type: 'text/plain' });

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobPlain,
      }),
    ]);
    return true;
  } catch {
    try {
      const listener = (e: ClipboardEvent) => {
        e.clipboardData?.setData('text/html', html);
        e.clipboardData?.setData('text/plain', plainText);
        e.preventDefault();
      };
      document.addEventListener('copy', listener);
      const ok = document.execCommand('copy');
      document.removeEventListener('copy', listener);
      if (ok) return true;
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}

/** Assert helper for verify scripts — bordered td present. */
export function excelTableHasBorderedTd(html: string): boolean {
  return (
    /<table[\s>]/i.test(html) &&
    /<tr[\s>]/i.test(html) &&
    /<td[^>]*style="[^"]*border:\s*1px\s+solid\s+#ccc/i.test(html)
  );
}
