# Cloudflare access proxy (bypass *.vercel.app blocks)

Saudi ministry/ISP networks may block `*.vercel.app`. This Worker reverse-proxies the production Vercel app on a `*.workers.dev` URL.

## What it fixes

- **Set-Cookie**: strips `Domain=` so `rakeeza_session` binds to the `workers.dev` host
- **Host**: does not override `Host` (fetch uses the Vercel origin URL); sets `X-Forwarded-Host` / `X-Forwarded-Proto`
- **Binary exports**: PDF/DOCX streamed without text rewrite; strips stale `Content-Encoding` / `Content-Length`
- **HTML/JS/JSON**: rewrites absolute `*.vercel.app` URLs to the public workers origin
- **Redirects**: rewrites `Location` the same way

## Deploy (temporary preview account)

```bash
cd cf-access-proxy
npx wrangler deploy --temporary
```

Claim the preview account within ~60 minutes via the Claim URL printed by Wrangler so the Worker survives:

https://dash.cloudflare.com/claim-preview?claimToken=hg4HQhliIEvH_RqCcMPfS9baZ5thSzwQoHQxOQqLS94

Keep the same worker name `rakeza-moj-access` (see `wrangler.toml`) so the URL stays:

https://rakeza-moj-access.decorous-bramble-251.workers.dev

## Live URL

See repo README / STATUS for the active `workers.dev` URL.
