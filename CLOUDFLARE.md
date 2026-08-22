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

## One-click deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/floschu/board)

Clicking the button ([docs](https://developers.cloudflare.com/workers/platform/deploy-buttons/)):

1. **copies this repo to your own GitHub account** (so your deployment is fully independent
   of the upstream project),
2. reads `wrangler.toml` and **auto-provisions the D1 database** (no ids to copy, no
   bindings to click), and
3. builds and deploys the Worker, then wires up push-to-deploy on your copy.

That's the whole setup. The tables are created automatically on first use.

## CLI deploy (alternative)

No fork needed — deploy straight from a clone:

```bash
git clone https://github.com/floschu/board.git
cd board
npm install
npx wrangler login
npm run deploy:cloudflare
```

`wrangler deploy` auto-provisions the D1 database on first run and writes its id into your
local `wrangler.toml`. Re-run `npm run deploy:cloudflare` any time to publish an update.

### Custom domain (optional)

Cloudflare dashboard → your Worker → **Settings → Domains & Routes** → add your domain.

## Keeping up to date

Your deployment tracks **your copy** of the repo, so new releases arrive by updating that
copy. **Your data is never touched by an update** — the D1 database is a separate resource;
only the code changes.

- **Manual (one click):** when a new release lands, open your copy on GitHub and click
  **Sync fork** → it redeploys automatically with the new version.
- **Automatic:** this repo ships `.github/workflows/update-from-upstream.yml`, which your
  copy inherits. It checks daily (and on demand) for the latest upstream **release** and
  merges it into your copy — preserving your auto-provisioned database id — which triggers a
  redeploy. Delete that workflow if you'd rather update by hand.

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
