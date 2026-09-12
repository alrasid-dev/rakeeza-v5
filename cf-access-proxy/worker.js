/**
 * Reverse proxy: workers.dev → Vercel origin (Saudi ISP blocks *.vercel.app).
 * - Session cookies scoped to the public workers host (strip Domain=)
 * - Origin fetch uses absolute ORIGIN URL (Host from URL); X-Forwarded-* for public host
 * - Text HTML/CSS/JS/JSON rewritten; binary (PDF/DOCX) streamed untouched
 * - Strip content-encoding after Workers auto-decompress so browsers don't double-decode
 */
const ORIGIN = 'https://rakeza-moj-assistant.vercel.app';
const ORIGIN_HOSTS = [
  'rakeza-moj-assistant.vercel.app',
  'rakeeza-v5.vercel.app',
];

function publicOrigin(url) {
  return url.origin;
}

function rewriteAbsoluteUrls(text, pubOrigin, pubHost) {
  let out = text;
  for (const host of ORIGIN_HOSTS) {
    out = out.replaceAll(`https://${host}`, pubOrigin);
    out = out.replaceAll(`http://${host}`, pubOrigin);
    out = out.replaceAll(host, pubHost);
  }
  out = out.replaceAll(ORIGIN, pubOrigin);
  return out;
}

/**
 * Make Set-Cookie apply to the workers.dev host the browser actually talks to.
 * Strip Domain= (vercel.app / .vercel.app would reject or bind wrong host).
 * Preserve Path / HttpOnly / Secure / SameSite / Max-Age / Expires / Priority.
 */
function rewriteSetCookie(raw, pubHost) {
  if (!raw) return null;
  let c = raw;
  // Remove any Domain= attribute (case-insensitive); allow leading dot
  c = c.replace(/;\s*Domain=[^;]*/gi, '');
  // Some stacks emit Domain as first attribute after name=value rarely — already covered by ;Domain
  // Ensure Secure on HTTPS public host (workers.dev is always HTTPS)
  if (!/;\s*Secure\b/i.test(c)) {
    c += '; Secure';
  }
  // Prefer Lax for top-level navigations + same-site API fetches
  if (!/;\s*SameSite=/i.test(c)) {
    c += '; SameSite=Lax';
  } else {
    // Normalize legacy "lax" token casing for picky browsers
    c = c.replace(/;\s*SameSite=lax/gi, '; SameSite=Lax');
  }
  // If Path missing, default /
  if (!/;\s*Path=/i.test(c)) {
    c += '; Path=/';
  }
  // Never re-add Domain — host-only cookie binds to pubHost (workers.dev)
  void pubHost;
  return c;
}

function copyAndFixResponseHeaders(upstream, requestUrl) {
  const out = new Headers();
  const pubHost = requestUrl.host;
  const pubOrigin = publicOrigin(requestUrl);

  // Headers may contain multiple Set-Cookie — use getSetCookie when available
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : [];

  for (const [key, value] of upstream.headers) {
    const k = key.toLowerCase();
    if (k === 'set-cookie') continue; // handled below
    if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding') {
      // Body may be decompressed by the runtime; lengths/encodings become lies
      continue;
    }
    if (k === 'location') {
      out.set('Location', rewriteAbsoluteUrls(value, pubOrigin, pubHost));
      continue;
    }
    out.append(key, value);
  }

  if (setCookies.length > 0) {
    for (const sc of setCookies) {
      const fixed = rewriteSetCookie(sc, pubHost);
      if (fixed) out.append('Set-Cookie', fixed);
    }
  } else {
    // Fallback: single get (may drop extras, but better than nothing)
    const one = upstream.headers.get('set-cookie');
    if (one) {
      // Rare: multiple joined — split on comma only when it looks like a new cookie (fragile);
      // prefer treating as one when getSetCookie missing
      const fixed = rewriteSetCookie(one, pubHost);
      if (fixed) out.append('Set-Cookie', fixed);
    }
  }

  // Avoid CF/browser caching authenticated/API empties at the edge
  const cc = (out.get('cache-control') || '').toLowerCase();
  if (!cc || cc.includes('public')) {
    out.set('Cache-Control', 'private, no-store');
  }

  return out;
}

function isRewritableText(contentType) {
  const ct = (contentType || '').toLowerCase();
  return (
    ct.includes('text/html') ||
    ct.includes('application/json') ||
    ct.includes('javascript') ||
    ct.includes('text/css') ||
    ct.includes('text/plain') ||
    ct.includes('application/manifest') ||
    ct.includes('application/xml') ||
    ct.includes('image/svg')
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, ORIGIN);

    // Build upstream headers: do NOT force Host — fetch(target) sets Host from ORIGIN.
    // Forcing Host=vercel while the browser Cookie jar is workers.dev is fine for Cookie
    // forwarding, but some platforms mint Domain= from Host; prefer URL-derived Host.
    const headers = new Headers();
    for (const [key, value] of request.headers) {
      const k = key.toLowerCase();
      // Hop-by-hop / problematic
      if (
        k === 'host' ||
        k === 'cf-connecting-ip' ||
        k === 'cf-ray' ||
        k === 'cf-visitor' ||
        k === 'cf-ipcountry' ||
        k === 'x-forwarded-for' ||
        k === 'x-real-ip' ||
        k === 'accept-encoding' // let runtime negotiate; we strip encoding on the way out
      ) {
        continue;
      }
      headers.set(key, value);
    }
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');
    const cip = request.headers.get('cf-connecting-ip');
    if (cip) headers.set('X-Forwarded-For', cip);

    const ua = headers.get('user-agent') || '';
    if (!ua || /python-urllib|curl|wget|httpclient|go-http|cloudflare-health/i.test(ua)) {
      headers.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
      cf: {
        cacheEverything: false,
        cacheTtl: 0,
      },
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(target.toString(), init);
    const outHeaders = copyAndFixResponseHeaders(upstream, url);
    const ct = outHeaders.get('content-type') || upstream.headers.get('content-type') || '';

    if (request.method !== 'HEAD' && isRewritableText(ct)) {
      let body = await upstream.text();
      body = rewriteAbsoluteUrls(body, publicOrigin(url), url.host);
      return new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    }

    // Binary / other: stream body as-is (PDF, DOCX, fonts, images, WASM…)
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
