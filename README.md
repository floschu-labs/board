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

Data is persisted in a Docker volume with SQLite.

## Development

```bash
npm install
npm run dev
open http://localhost:5173
```
