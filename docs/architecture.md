# SVG Animator Architecture

## Overview

SVG Animator is a browser-based motion editor built as a pnpm monorepo:

- `apps/web` — Next.js 16 App Router UI
- `packages/types` — Shared TypeScript domain types
- `packages/engine` — Headless SVG parse, animation, and export compilers

## Data Flow

```
Upload SVG → parseSvg() → Project JSON → Zustand store
                                              ↓
                                    sampleProject(time)
                                              ↓
                                    Canvas render + Inspector
                                              ↓
                                    exportProject(format)
                                              ↓
                                    SMIL / CSS / JS / Lottie / React
```

## Core Principles

1. **SVG string is never mutated during editing** — only the structured `Project` model changes.
2. **Keyframes store property snapshots** at specific times.
3. **Export is a compiler** — same timeline data compiles to multiple output formats.
4. **Client-first** — IndexedDB autosave; cloud API is optional Phase 3.

## Storage

- **Local**: Dexie.js IndexedDB (`svg-animator` database)
- **Cloud** (stub): `POST /api/projects` in-memory store

## Export Formats

| Format | Compiler | Runtime |
|--------|----------|---------|
| SMIL | `export/smil.ts` | None |
| CSS | `export/css.ts` | None (inline styles) |
| JS | `export/js.ts` | Inline IIFE player |
| React | `export/react.ts` | React |
| Lottie | `export/lottie.ts` | lottie-web |
| Project | JSON | SVG Animator |

## Testing

- **Unit**: Vitest in `packages/engine` and `packages/types`
- **E2E**: Playwright in `apps/web`
