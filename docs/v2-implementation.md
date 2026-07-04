# Cerebral v2 Implementation Plan

> **Status:** Phase 3 foundation shipped

## Completed

### Phase 1–2
- State machines, timeline v2, player, motion paths, Lottie v2, AI v2 context, HTML embed export

### Phase 3
- [x] **Yjs collab** — HTTP sync (`/api/projects/[id]/yjs`), live toggle in Share dialog, 3s poll + debounced push
- [x] **Auth + workspaces** — User/Workspace models, register/login/logout, `/login`, JWT session cookie
- [x] **Store split** — `editor-types`, `editor-history`, `editor-clipboard` modules extracted from monolith
- [x] **Pen click-to-add** — click to place nodes, Enter/dblclick to finish, click near start to close, Escape to finish

## Setup (after schema change)

```bash
# Stop dev server if prisma generate fails (EPERM on Windows)
pnpm install
pnpm db:push
pnpm dev
```

Set `CEREBRAL_SESSION_SECRET` in `.env` for production auth.

## Verify

| Feature | How |
|---------|-----|
| Auth | `/login` → register → open editor |
| Yjs | Share dialog → enable Live sync → open same project in two tabs |
| Pen | P tool → click points → Enter or double-click to finish |
| Workspaces | Created automatically on register |

## Remaining (future)

- WebSocket transport for Yjs (lower latency than HTTP poll)
- Workspace project scoping in cloud list API
- Full store slice composition (playback, SM, drawing as separate files)
