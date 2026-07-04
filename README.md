# Cerebral

**AI-powered SVG animation studio** — think it, animate it.

Professional keyframe editor with Gemini AI, advanced timeline, transform handles, animation presets, PostgreSQL persistence, and multi-format export.

## What makes Cerebral different

| Feature | Cerebral | SVGator | Lottie Creator | Rive |
|---------|----------|---------|----------------|------|
| AI chat-to-animate | ✅ Gemini | ❌ | Partial | ❌ |
| Self-hosted DB | ✅ PostgreSQL | ❌ Cloud | ❌ Cloud | ❌ Cloud |
| Open export formats | ✅ All formats | Paid tiers | Ecosystem lock | Runtime lock |
| Advanced timeline | ✅ Frame snap, zoom, tracks | ✅ | ✅ | ✅ State machines |
| Animation presets | ✅ Built-in | ✅ | ✅ Plugins | ✅ |
| No watermark | ✅ | Free tier watermarked | Varies | Varies |

## Features

- **Gemini AI** — describe animations in chat; AI generates keyframes
- **Animation presets** — fade, slide, bounce, spin, pulse, float, pop
- **Pro timeline** — per-property tracks, frame snap, zoom, easing editor, markers
- **Canvas tools** — drag-move, scale handles, rotation handle, grid snap
- **Layers** — multi-select, group/ungroup, lock, reorder
- **Export** — SMIL, CSS, JS, React, Lottie, `.svganim`
- **Persistence** — PostgreSQL (Docker) + IndexedDB + version snapshots

## Quick Start

### 1. Start database (Docker)

```bash
cd p:\svg-animator
docker compose up -d
```

PostgreSQL on port **5433** · Adminer at http://localhost:8080

### 2. Configure environment

```bash
copy apps\web\.env.example apps\web\.env.local
```

### 3. Install & push schema

```bash
pnpm install
pnpm db:push
```

### 4. Connect Gemini AI

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open http://localhost:3000/settings
3. Paste your key and save

### 5. Run

```bash
pnpm dev
```

Open http://localhost:3000/editor

## AI Animation

1. Import an SVG
2. Open the **AI** tab (right panel) or click **AI** in toolbar
3. Type: *"fade in all elements with stagger"* or *"bounce the logo into view"*
4. AI applies keyframes to your timeline — refine with follow-up prompts

## Full Feature Set

### Drawing Tools (left toolbar)
| Tool | Shortcut | Action |
|------|----------|--------|
| Select | V | Move, scale, rotate with handles |
| Rectangle | R | Drag to draw rect |
| Ellipse | E | Drag to draw ellipse |
| Line | L | Drag to draw line |
| Pen | P | Freehand path |
| Text | T | Click to place text |

### Export Formats
SMIL, CSS, JS, React, Lottie, **GIF**, **WebM**, **MP4**, `.svganim` project file

### State Machines (Layers → States tab)
Rive-style interactive states linked to timeline segments. Export via JS player.

### Share & Collaborate
Toolbar **Share** → create view/edit links. Live presence shows who's editing.

### Inspector
Loop mode (once/loop/ping-pong), triggers (load/hover/click/scroll), path morph UI

### Database migration (new tables)
```bash
pnpm db:push
```
Adds `share_links` and `project_presence` tables.

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm docker:up` | Start PostgreSQL + Adminer |
| `pnpm db:push` | Create/update database tables |
| `pnpm build` | Production build |

## License

MIT
