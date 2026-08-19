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

## Self-Host - Cloudflare Pages

Host your own instance on Cloudflare Pages with data synced across devices via Cloudflare
D1 (no server to run). The API is unauthenticated, so a public deploy must be put behind an
access control such as Cloudflare Access. Create a D1 database,
then either connect the repo in the Cloudflare dashboard for push-to-deploy (build command
`npm run build:cloudflare`, output `dist`) or deploy from your machine with
`npm run deploy:cloudflare`.

Full guide: **[CLOUDFLARE.md](CLOUDFLARE.md)**.

## Development

```bash
npm install
npm run dev
open http://localhost:5173
```
