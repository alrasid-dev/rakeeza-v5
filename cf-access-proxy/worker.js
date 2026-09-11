const ORIGIN = 'https://rakeza-moj-assistant.vercel.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.set('Host', new URL(ORIGIN).host);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');
    headers.delete('accept-encoding');

    // Avoid origin bot walls rejecting Workers/empty UA
    const ua = headers.get('user-agent') || '';
    if (!ua || /python-urllib|curl|wget|httpclient|go-http/i.test(ua)) {
      headers.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
      cf: { cacheEverything: false },
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(target.toString(), init);
    const outHeaders = new Headers(upstream.headers);

    const loc = outHeaders.get('Location');
    if (loc) {
      outHeaders.set(
        'Location',
        loc
          .replaceAll(ORIGIN, url.origin)
          .replaceAll('https://rakeza-moj-assistant.vercel.app', url.origin)
          .replaceAll('https://rakeeza-v5.vercel.app', url.origin)
      );
    }

    const ct = (outHeaders.get('content-type') || '').toLowerCase();
    if (
      ct.includes('text/html') ||
      ct.includes('application/json') ||
      ct.includes('javascript') ||
      ct.includes('text/css') ||
      ct.includes('application/manifest')
    ) {
      let body = await upstream.text();
      body = body
        .replaceAll(ORIGIN, url.origin)
        .replaceAll('https://rakeza-moj-assistant.vercel.app', url.origin)
        .replaceAll('https://rakeeza-v5.vercel.app', url.origin)
        .replaceAll('rakeza-moj-assistant.vercel.app', url.host)
        .replaceAll('rakeeza-v5.vercel.app', url.host);
      outHeaders.delete('content-length');
      outHeaders.delete('content-encoding');
      return new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
