import {
  buildOfficialLetterHtml,
  type OfficialLetterDoc,
} from '@/lib/official-letter-html';
import { officialDateDisplay } from '@/lib/hijri';
import { BRAND } from '@/lib/brand';
import { bodyBlocksToHtml } from '@/lib/body-align';
import { fontStackFor } from '@/lib/font-stacks';

/** Client helper: copy Outlook-friendly full official letter HTML — same layout as preview/PDF */

export async function copyOutlookHtml(html: string, plainFallback?: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const plainText =
    plainFallback ||
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6]|li|td)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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
 * Rewrite src="/…" and relative brand paths to absolute https URLs,
 * and swap data-URI emblems for hosted PNG (Outlook often strips data-URIs).
 */
export function absolutizeHtmlForOutlook(html: string, origin: string): string {
  const base = String(origin || '').replace(/\/$/, '');
  if (!base) return html;
  let out = html;
  // Hosted emblem instead of giant data-URI
  out = out.replace(
    /src="data:image\/png;base64,[^"]+"/gi,
    `src="${esc(`${base}/brand/moj-logo-gold.png`)}"`,
  );
  out = out.replace(/src="\/([^"]+)"/gi, (_m, path: string) => `src="${esc(`${base}/${path}`)}"`);
  // Ensure QR uses public API when we only have a number placeholder — handled by caller
  return out;
}

/**
 * Full official template for Outlook paste — SAME generator as PDF/preview (paperLayout).
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

  const html = buildOfficialLetterHtml({
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
  });

  return absolutizeHtmlForOutlook(html, origin);
}

/** Legacy table-based letter — kept only if official HTML fails; prefer buildLetterHtml. */
export function buildSimpleLetterHtml(doc: OutlookLetterDoc) {
  const letterFont = fontStackFor(doc.fontFamily);
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
