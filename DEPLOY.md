# Going live — Labzank

The site builds to plain static files (`out/`) and talks to Supabase from the browser,
so any static host works. Netlify or Vercel are the easiest.

## 1. Before you deploy (Supabase dashboard)

| Where | What | Why |
|---|---|---|
| Authentication → Sign In / Providers → **Allow new users to sign up: OFF** | Disable public sign-ups | Only people you invite should get accounts. Invite staff from Authentication → Users → *Invite user*, then give them a role (see SUPABASE.md). |
| Authentication → URL Configuration → **Site URL** | `https://your-domain.com` | Magic-link and invite emails point here. |
| Authentication → URL Configuration → **Redirect URLs** | `https://your-domain.com/admin.html`, `https://your-domain.com/admin` | Allowed after sign-in. Keep `http://localhost:3000/admin` for local work. |
| Authentication → Attack Protection → **Leaked password protection: ON** | (Pro plan) | Blocks passwords known from data breaches. |
| Admin panel → Site → **Dictionary visibility → Launch mode** | When reviewed words are ready | Hides drafts and unreviewed words from the public. |

## 2. Netlify (drag & drop, no Git needed)

1. In the project folder: `npm install`, then `npm run build` — this creates the `out` folder.
2. Open https://app.netlify.com/drop and drag the **out** folder onto the page.
3. You get a live link at once. Site settings → Domain management lets you add your own domain.

Environment values are baked in at build time from `.env.local`, so build on a computer that has it.

## 2b. Netlify or Vercel from GitHub (auto-deploy on every push)

1. Push the project to a GitHub repository (`.env.local` stays out of Git — that's fine).
2. Netlify: *Add new site → Import from Git*. Vercel: *Add New → Project*. `netlify.toml` / `vercel.json` already set the build command (`npm run build`) and folder (`out`).
3. Add these environment variables in the host's settings:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://igbixspzzxokgophezrw.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable key from `.env.local`
   - `NEXT_PUBLIC_SITE_URL` = your final address, e.g. `https://labzank.org`
4. Deploy. Every push to GitHub redeploys.

The publishable key is meant to be public — Row Level Security protects the data.
Never put the `service_role` / secret key in the site or in these variables.

## 3. After the first deploy

- Open `/admin.html`, sign in, and check that content loads and saving works.
- Visit `/robots.txt` and `/sitemap.xml`; submit the sitemap in Google Search Console.
- Share a link in WhatsApp to see the preview card (`og.jpg`).

## Known limitation

Poet, poem and book pages open with `#slug` (for example `poets.html#gul-khan-naseer`).
Search engines index the list pages but not each `#slug` separately. Giving every poet and
poem its own crawlable URL needs a server build (Next.js on Vercel without `output: "export"`),
which is a good next step once the content grows.
