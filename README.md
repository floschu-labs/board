# board

A privacy-focused, local-only Kanban board. No account required — your data stays in your browser.

![Board Screenshot](docs/screenshot.webp)

## Use It Now

👉 **[floschu.github.io/board](https://floschu.github.io/board/)**

- Works instantly in your browser
- Install as an app: click the install icon in your browser's address bar
- All data stays 100% local on your device
- Works offline after first visit

---

## Self-Host - Docker

Run your own instance with data persisted to SQLite. Just provide a port and a folder for your data.

### Docker Compose

```bash
git clone https://github.com/floschu/board.git
cd board
docker compose up -d
open http://localhost:3000
```

### Docker via ghcr

```bash
docker run -d -p 3000:3000 -v board-data:/app/data ghcr.io/floschu/board
open http://localhost:3000
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on inside the container |
| `DATA_DIR` | `/app/data` | Directory where the SQLite database (`board.db`) is stored |

Mount a volume or bind a local folder to `DATA_DIR` so your data survives container restarts:

```bash
# Named volume (managed by Docker)
docker run -d -p 3000:3000 -v board-data:/app/data ghcr.io/floschu/board

# Local folder (e.g. for Unraid, Synology, or manual backups)
docker run -d -p 3000:3000 -v /path/to/your/folder:/app/data ghcr.io/floschu/board
```

## Self-Host - Cloudflare

Run your own synced instance on Cloudflare (data in [Cloudflare D1](https://developers.cloudflare.com/d1/),
no server to run). The database is **auto-provisioned** and your data **persists across
updates**.

**Recommended: fork + connect** (so updates are one click later):

1. **Fork** this repo.
2. Cloudflare → **Workers & Pages → Create → Workers → Import a repository** → your fork.
   The build and D1 are configured automatically.
3. Update anytime with GitHub's **Sync fork** button (or enable Actions on your fork for
   automatic daily updates).

Just want a quick look? One-click **Deploy to Cloudflare** (a standalone copy — updates are
manual):

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/floschu/board)

The `/api/data` endpoint is unauthenticated, so if the deployment is public, put it behind an
access control such as [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/).

Full guide (CLI, updates, privacy): **[CLOUDFLARE.md](CLOUDFLARE.md)**.

## Development

```bash
npm install
npm run dev
open http://localhost:5173
```
