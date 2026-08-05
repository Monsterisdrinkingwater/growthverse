# GrowthVerse — Deployment Guide

## Quick Deploy to Vercel

### One-Click Deploy

A one-click link is intentionally not published until this project has a verified public repository URL. Do not substitute a placeholder repository URL.

### Manual Deploy

1. Push your code to GitHub / GitLab / Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Vercel auto-detects Next.js — no framework preset needed
5. Add environment variables (see below)
6. Click **Deploy**

---

## Environment Variables

All variables are listed in `.env.example`. Configure them in **Vercel → Project → Settings → Environment Variables**.

The build and runtime require **Node.js 22 or newer**.

### Optional

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | Enables provider-backed AI chat, reflection, and exploration summaries | Built-in local fallback responses |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key | Not required for basic usage |
| `DOUBAN_API_URL` | Douban book API service URL | `http://localhost:3900` |
| `NEXT_PUBLIC_SUPABASE_URL` | Reserved for the optional Supabase schema; current app data is local | Unset |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reserved for the optional Supabase schema | Unset |
| `RNOTE_API_KEY` | 小红书 API key | Falls back to mock data |
| `BILIBILI_SESSDATA` | Bilibili session cookie | Falls back to mock data |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

> **Important:** `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets in them.

> **Current persistence model:** exploration paths, reflections, settings, and other personal state are stored in browser `localStorage`. The SQL files under `supabase/migrations/` define an optional future backend schema; the current runtime does not read from or write to Supabase and does not require a service-role key.

### Douban sidecar service

`DOUBAN_API_URL=http://localhost:3900` only works when the Next.js app and `douban-book-api` service can reach the same machine. Start it locally with:

```bash
cd douban-book-api
npm ci
npm start
```

For a Vercel deployment, deploy that service separately and set `DOUBAN_API_URL` to its reachable HTTPS URL. If it is omitted or unavailable, the app uses its documented fallback behavior.

---

## Custom Domain

1. Go to **Vercel → Project → Settings → Domains**
2. Add your domain (e.g. `growthverse.app`)
3. Update DNS records as shown:
   - **Type:** A / CNAME
   - **Value:** Provided by Vercel
4. Wait for DNS propagation (up to 24h)
5. SSL certificate is provisioned automatically

---

## Post-Deployment Checklist

- [ ] All required env vars are set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` is set to the production domain
- [ ] OpenAI API key has sufficient quota
- [ ] `DOUBAN_API_URL` points to a reachable service if real Douban data is required
- [ ] Test chat, exploration, and reflection features

---

## Troubleshooting

### Build fails with "Module not found"
Run `npm install` locally and commit the updated `package-lock.json`.

### Images not loading from external sources
Check that the image hostname is listed in `next.config.mjs` under `images.remotePatterns`.

### AI features return errors
- Verify `OPENAI_API_KEY` is set (not just in `.env.local` but also in Vercel env vars)
- Check that the key has access to the required models

### API routes return 500 in production
- Check Vercel function logs: **Vercel → Project → Functions**
- Verify `OPENAI_API_KEY` and any optional external API credentials used by the failing route

### Douban data falls back in production
- A Vercel function cannot reach `localhost` on your development machine
- Deploy `douban-book-api` separately and set `DOUBAN_API_URL` to that public service
- Verify its `/ping` endpoint returns `pong`

---

## Local Production Build

Test a production build locally before deploying:

```bash
npm run build
npm start
```

This runs the optimized production build on `http://localhost:3000`.
