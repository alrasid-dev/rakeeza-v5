# Cloudflare access proxy (bypass *.vercel.app blocks)

Saudi ministry/ISP networks may block `*.vercel.app`. This Worker reverse-proxies the production Vercel app on a `*.workers.dev` URL.

## Deploy (temporary preview account)

```bash
cd cf-access-proxy
npx wrangler deploy --temporary
```

Claim the preview account within ~60 minutes via the Claim URL printed by Wrangler so the Worker survives.

## Live URL (current box deploy)

See repo README / STATUS for the active `workers.dev` URL.
