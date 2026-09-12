# Cloudflare access proxy (bypass *.vercel.app blocks)

Saudi ministry/ISP networks may block `*.vercel.app`. This Worker reverse-proxies the production Vercel app on a `*.workers.dev` URL.

## What it fixes

- **Set-Cookie**: strips `Domain=` so `rakeeza_session` binds to the `workers.dev` host
- **Host**: does not override `Host` (fetch uses the Vercel origin URL); sets `X-Forwarded-Host` / `X-Forwarded-Proto`
- **Binary exports**: PDF/DOCX streamed without text rewrite; strips stale `Content-Encoding` / `Content-Length`
- **HTML/JS/JSON**: rewrites absolute `*.vercel.app` URLs to the public workers origin
- **Redirects**: rewrites `Location` the same way

## Live URL (2026-09-12)

**https://rakeza-moj-access.iridescent-attempt.workers.dev**

Claim the preview account within ~60 minutes so the Worker survives:

https://dash.cloudflare.com/claim-preview?claimToken=-XoYqtJCIc2EPr8Ak8RAlbBGSz_AAYxaHyNVVmY5Q50

(Prior Decorous Bramble URL cannot be updated from this box — migrate to the URL above.)

## Redeploy

```bash
cd cf-access-proxy
npx wrangler deploy --temporary
```

Keep worker name `rakeza-moj-access` in `wrangler.toml`. After deploy, claim the new Claim URL immediately if the subdomain changes.
