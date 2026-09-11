const ORIGIN = 'https://rakeza-moj-assistant.vercel.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.set('Host', new URL(ORIGIN).host);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');
    headers.delete('accept-encoding'); // avoid br issues when rewriting

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(target.toString(), init);
    const outHeaders = new Headers(upstream.headers);

    // Rewrite absolute redirects to proxy host
    const loc = outHeaders.get('Location');
    if (loc) {
      outHeaders.set(
        'Location',
        loc.replaceAll(ORIGIN, url.origin).replaceAll('https://rakeza-moj-assistant.vercel.app', url.origin)
      );
    }

    // Strip encoding/length if we rewrite body; pass through for binary
    const ct = (outHeaders.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('javascript') || ct.includes('text/css')) {
      let body = await upstream.text();
      body = body
        .replaceAll(ORIGIN, url.origin)
        .replaceAll('https://rakeza-moj-assistant.vercel.app', url.origin)
        .replaceAll('rakeza-moj-assistant.vercel.app', url.host);
      outHeaders.delete('content-length');
      outHeaders.delete('content-encoding');
      return new Response(body, { status: upstream.status, statusText: upstream.statusText, headers: outHeaders });
    }

    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: outHeaders });
  },
};
