# Self-host on Cloudflare

Run your own **synced** board on Cloudflare — the app is served from a Worker and your data
lives in [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite). No server to
manage, generous free tier, and an alternative to the Docker self-host path.

> [!IMPORTANT]
> **The `/api/data` endpoint has no authentication of its own.** Anyone who can reach the
> deployment can read, overwrite, and delete the whole board. If it's reachable from the
> public internet (a `*.workers.dev` URL or a public custom domain), put an access control
> in front of it — [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
> is the zero-code option. See [Make it private](#make-it-private).

## Deploy (recommended: fork + connect)

This path is a couple of clicks more than the button below, but it gives you **easy updates**
afterwards (see [Keeping up to date](#keeping-up-to-date)).

1. **Fork this repo** to your GitHub account (the **Fork** button, top-right). A fork keeps a
   link to upstream — so you get GitHub's one-click **Sync fork** — and it includes the
   update workflow.
2. In Cloudflare: **Workers & Pages → Create → Workers → Import a repository** → pick your
   fork. Keep the defaults — `wrangler.toml` drives the build (`npm run build:cloudflare`)
   and **auto-provisions the D1 database** (no ids to paste, no bindings to click). Deploy.
3. Then [make it private](#make-it-private) and add a custom domain if you want.

Tables are created automatically on first use.

## Quick try (Deploy button)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/floschu/board)

One click ([docs](https://developers.cloudflare.com/workers/platform/deploy-buttons/)):
Cloudflare copies the repo to your account, auto-provisions D1, and deploys. Great for a
quick look — but it makes a **standalone copy** (not a fork, and without the workflows), so
**updates are manual** (see below). If you'll keep it, use the fork path above instead.

## CLI deploy (alternative)

No fork needed — deploy from a clone; updates are a manual re-run:

```bash
git clone https://github.com/floschu/board.git
cd board
npm install
npx wrangler login
npm run deploy:cloudflare   # auto-provisions D1 on first run
```

### Custom domain (optional)

Cloudflare dashboard → your Worker → **Settings → Domains & Routes** → add your domain.

## Keeping up to date

**Your data is never touched by an update** — D1 is a separate resource; only the code changes.

- **Forked (recommended):** when a release lands, open your fork on GitHub and click
  **Sync fork → Update branch** — the push redeploys automatically. To make it hands-off,
  enable Actions on your fork (its **Actions** tab → enable workflows): the bundled
  `.github/workflows/update-from-upstream.yml` then checks daily for the latest upstream
  **release** and merges it in (keeping your D1 database id).
- **Button copy / CLI:** no fork link and no workflows, so pull the latest release into your
  copy and push (the push redeploys):
  ```bash
  git remote add upstream https://github.com/floschu/board.git   # once
  git fetch upstream --tags
  git merge "$(gh release view --repo floschu/board --json tagName -q .tagName)"
  git push
  ```
  Or switch to the fork path for one-click updates.

## Make it private

To restrict the deployment to just you:

Cloudflare **Zero Trust → Access → Applications → Add an application → Self-hosted**:

- **Application domain:** your Worker's `*.workers.dev` URL and/or your custom domain.
- **Policy:** Action **Allow**, Include → **Emails** → your email address.
- **Login method:** One-time PIN (email code), or Google/GitHub, etc.

Access gates the whole hostname, including `/api/*`, so the D1 API is protected too.

## How it works

The default GitHub Pages build stores data in your browser. The Cloudflare build
(`--mode cloudflare`, storage mode `api`) talks to the Worker instead:

| File | Role |
|------|------|
| `worker/index.js` | Serves the SPA (`ASSETS`) and handles `/api/data` against D1 (a Workers port of `server/`). Creates tables lazily. |
| `worker/validation.js` | Payload validation. Keep in sync with `server/validation.js`. |
| `wrangler.toml` | Worker entry, static-assets config, and the D1 binding (no id — auto-provisioned). |
| `.env.cloudflare` | Build flags (`VITE_STORAGE_MODE=api`, `VITE_BASE_URL=/`). |

None of this affects `npm run dev`, the default `npm run build`, or the Docker path.

## Local test

```bash
npm run build:cloudflare
npx wrangler dev
```

Open the printed URL, add a card, reload → it persists in a local D1. Inspect it with:

```bash
npx wrangler d1 execute board --local --command "SELECT * FROM cards"
```

## Notes

- The whole dataset is re-saved on every change (small payloads for a personal board),
  matching the Docker server's behaviour.
- To remove Cloudflare support entirely: delete `worker/`, `wrangler.toml`,
  `.env.cloudflare`, `.github/workflows/update-from-upstream.yml`, this file, and the
  `*:cloudflare` scripts in `package.json`; then delete the Worker and D1 database in the
  dashboard.
