/** Safe Content-Disposition — HTTP headers must be ByteString (no raw Arabic). */

export function attachmentDisposition(baseName: string, ext: string): string {
  const raw = String(baseName || 'rakeeza').trim() || 'rakeeza';
  const ascii = raw
    .replace(/صادر/g, 'sadir')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'rakeeza';
  const cleanExt = ext.replace(/^\./, '');
  const file = `${ascii}.${cleanExt}`;
  const utf8Name = `${raw}.${cleanExt}`;
  return `attachment; filename="${file}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`;
}
