# SIP-N-Sanity

**Please Hold** — a sarcastic 16-bit VoIP support survival game.

Survive 9:00 AM–5:00 PM balancing **Sanity**, **CSAT**, and the **Queue**. Face the Bathroom Gamble, Lunch Stealth, a typing Outage, coffee, and one optional Smoke Break (sunny outdoor scene).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Pace:** ~1 in-game minute per real second (full shift ≈ 8 minutes), plus mini-games.  
**Keys:** `P` pause · `M` mute

## Stack

Next.js 14 · Zustand · Tailwind · react-konva · framer-motion

## Docs

- [`contextAnchor.md`](./contextAnchor.md) — canonical design / roadmap
- [`docs/gemini-sprite-prompts.md`](./docs/gemini-sprite-prompts.md) — **full Gemini shot list** (drop PNGs in `public/sprites/`)
- [`docs/HOSTING.md`](./docs/HOSTING.md) — Docker / rbyt3r.com handoff

## Docker (for deploy workspace)

```bash
docker compose up --build
```

Requires `output: "standalone"` in `next.config.mjs` (already set).

## Local playthrough checklist

- [ ] Clock in; meters + clock advance
- [ ] Answer tickets; Sanity / CSAT / Queue change
- [ ] Coffee (limited) / Pause / Mute
- [ ] Smoke Break → outdoor scene → Back Inside
- [ ] Desk chatter bubbles appear
- [ ] 10:30 Bathroom · 12:00 Stealth · 3:00 Outage
- [ ] Click Santa → off-season tooltip only
- [ ] Survive to 5:00 or hit game over

## Hosting

Local playable build lives here. See [`docs/HOSTING.md`](./docs/HOSTING.md) for Docker → [rbyt3r.com](https://rbyt3r.com).
