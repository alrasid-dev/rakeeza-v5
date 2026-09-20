/** Public HTTPS assets for Outlook paste (desktop blocks data-URI). */
export const OUTLOOK_PUBLIC_ORIGIN = 'https://rakeza-moj-assistant.vercel.app';

export const OUTLOOK_EMBLEM_HTTPS = `${OUTLOOK_PUBLIC_ORIGIN}/moj-logo.png`;

export function outlookEmblemUrl(origin?: string | null): string {
  const o = String(origin || '').replace(/\/$/, '');
  if (/^https?:\/\//i.test(o)) return `${o}/moj-logo.png`;
  return OUTLOOK_EMBLEM_HTTPS;
}

export function outlookEmblemImgHtml(origin?: string | null): string {
  const src = outlookEmblemUrl(origin);
  return (
    `<img src="${src}" width="75" height="75" alt="شعار وزارة العدل" border="0" ` +
    `style="display:block;margin:0 auto;width:75px;height:75px;outline:none;text-decoration:none;border:0">`
  );
}
