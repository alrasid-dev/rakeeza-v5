import {
  buildOfficialLetterHtml,
  type OfficialLetterDoc,
} from '@/lib/official-letter-html';
import { officialDateDisplay } from '@/lib/hijri';
import { BRAND } from '@/lib/brand';
import { bodyBlocksToHtml } from '@/lib/body-align';
import { exportFontStack, fontStackFor } from '@/lib/font-stacks';

/**
 * Outlook / MSO clipboard helpers.
 * Construct text/html Clipboard Blobs with clean inline CSS + table-based
 * MSO-compatible markup so Microsoft Outlook pastes the official letter intact.
 */

/** Shared primitive: write HTML + plain to the clipboard as Clipboard Blobs. */
export async function writeHtmlClipboard(html: string, plainFallback?: string): Promise<boolean> {
  const plainText =
    plainFallback ||
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6]|li|td|th)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  const blob = new Blob([html], { type: 'text/html' });
  const plain = new Blob([plainText], { type: 'text/plain' });
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': plain,
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

/** Client helper: copy Outlook-friendly full official letter HTML — same layout as preview/PDF */
export async function copyOutlookHtml(html: string, plainFallback?: string) {
  return writeHtmlClipboard(html, plainFallback);
}

function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type OutlookLetterDoc = OfficialLetterDoc & {
  /** Absolute site origin for Outlook-safe http(s) image URLs */
  origin?: string | null;
  underLogoLabel?: string | null;
};

/**
 * Rewrite src="/…" relative paths to absolute https URLs for Outlook.
 * Keep data:image URIs — Word/Outlook paste preserves embedded emblems;
 * remote https often shows as broken until "Download images".
 */
export function absolutizeHtmlForOutlook(html: string, origin: string): string {
  const base = String(origin || '').replace(/\/$/, '');
  if (!base) return html;
  let out = html;
  out = out.replace(/src="\/([^"]+)"/gi, (_m, path: string) => `src="${esc(`${base}/${path}`)}"`);
  return out;
}

/**
 * Full official template for Outlook paste — table-based chrome + export font stacks.
 * Images rewritten to absolute https for Outlook.
 */
export function buildLetterHtml(doc: OutlookLetterDoc) {
  const origin = (doc.origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    '',
  );

  // Prefer https QR when numbered
  let qrDataUrl = doc.qrDataUrl || null;
  if (origin && doc.number) {
    qrDataUrl = `${origin}/api/public/qr?text=${encodeURIComponent(String(doc.number))}`;
  } else if (qrDataUrl && !/^https?:\/\//i.test(qrDataUrl) && origin && doc.number) {
    qrDataUrl = `${origin}/api/public/qr?text=${encodeURIComponent(String(doc.number))}`;
  }

  let html = buildOfficialLetterHtml(
    {
      number: doc.number,
      subject: doc.subject,
      dateGregorian: doc.dateGregorian,
      dateHijri: doc.dateHijri,
      recipients: doc.recipients,
      copyTo: doc.copyTo,
      attachments: doc.attachments,
      parties: doc.parties,
      reasons: doc.reasons,
      studyFields: doc.studyFields,
      body: doc.body,
      docType: doc.docType,
      footer: doc.footer || 'للاستخدام الداخلي فقط',
      courtName: doc.courtName,
      headerLines: doc.headerLines,
      qrDataUrl,
      studySections: doc.studySections,
      judgmentCard: doc.judgmentCard,
      judgmentBriefing: doc.judgmentBriefing,
      briefingTitle: doc.briefingTitle || doc.underLogoLabel,
      observationText: doc.observationText,
      mechanismText: doc.mechanismText,
      judgmentPriority: doc.judgmentPriority,
      fontFamily: doc.fontFamily,
      fontSizePt: doc.fontSizePt,
      align: doc.align,
      paperLayout: doc.paperLayout,
    },
    { forOutlook: true },
  );

  // Keep <style>/@import from generator; wrap body paper in outer 700px MSO table
  const styleMatch = html.match(/<style>[\s\S]*?<\/style>/i);
  const styles = styleMatch ? styleMatch[0] : '';
  const bodyInner = html
    .replace(/^[\s\S]*?<body[^>]*>/i, '')
    .replace(/<\/body>[\s\S]*$/i, '');
  const baseTag = origin ? `<base href="${esc(origin)}/" />` : '';

  const wrapped = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
${baseTag}
${styles}
</head>
<body style="margin:0;padding:0;background:#ffffff">
<!--[if mso]><table role="presentation" width="700" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="700" cellpadding="0" cellspacing="0" style="width:700px;max-width:700px;margin:0 auto;border-collapse:collapse">
  <tr><td style="padding:0">${bodyInner}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;

  return absolutizeHtmlForOutlook(wrapped, origin);
}

/** True when Outlook HTML is MSO/table-based (verify scripts). */
export function outlookHtmlIsTableBased(html: string): boolean {
  const src = String(html || '');
  return (
    /<table[\s>]/i.test(src) &&
    /class="brand-row[^"]*official-header"|class="brand-row official-header"/i.test(src) &&
    /role="presentation"/i.test(src) &&
    /align="left"/i.test(src) &&
    /align="center"/i.test(src) &&
    /align="right"/i.test(src) &&
    /class="official-left"/i.test(src) &&
    /class="official-center"/i.test(src) &&
    /class="official-right"/i.test(src) &&
    !/display\s*:\s*flex/i.test(src) &&
    !/display\s*:\s*grid/i.test(src) &&
    (/xmlns:o=/i.test(src) || /xmlns:w=/i.test(src) || /mso/i.test(src) || /<!--\[if mso\]/i.test(src))
  );
}

/** Left column of the official 3-col header carries QR + outgoing number + date. */
export function outlookHeaderHasQrNumberDate(html: string): boolean {
  const src = String(html || '');
  const left = src.match(/<table[^>]*class="official-left"[^>]*>[\s\S]*?<\/table>/i);
  if (!left) return false;
  const chunk = left[0];
  return /QR|qr|alt="QR"/i.test(chunk) && /الرقم/.test(chunk) && /التاريخ/.test(chunk);
}

/** Legacy table-based letter — kept only if official HTML fails; prefer buildLetterHtml. */
export function buildSimpleLetterHtml(doc: OutlookLetterDoc) {
  const letterFont = exportFontStack(doc.fontFamily) || fontStackFor(doc.fontFamily);
  const letterSize = doc.fontSizePt ? `${doc.fontSizePt}pt` : '15pt';
  const court = doc.courtName || 'المحكمة العمالية بالرياض';
  const GREEN = '#006C35';
  const GOLD = '#C5A059';
  const LIGHT = '#E6F2EB';
  const origin = (doc.origin || '').replace(/\/$/, '');
  const emblemSrc = origin ? `${origin}/brand/moj-logo-gold.png` : '/brand/moj-logo-gold.png';
  return `<div dir="rtl" style="font-family:${letterFont};font-size:${letterSize}">${esc(doc.subject || '')}<br/>${esc(doc.recipients || '')}<br/><img src="${esc(emblemSrc)}" width="72" height="72" alt="شعار"/><div style="background:${LIGHT};border:1px solid ${GREEN};padding:8px">${esc(officialDateDisplay(doc.dateHijri, doc.dateGregorian))}</div>${bodyBlocksToHtml(String(doc.body || ''), { escape: esc })}<div style="color:#666;border-top:2px solid ${GOLD};padding:8px;text-align:center">${esc(BRAND.platform)}</div></div>`;
}

// re-export types used by ExportToolbar
