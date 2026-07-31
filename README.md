# SIP-N-Sanity

**Please Hold** — a sarcastic 16-bit VoIP support survival game.

Survive 9:00 AM–5:00 PM balancing **Sanity**, **CSAT**, and the **Queue**. Face the Bathroom Gamble, Lunch Stealth, a typing Outage, and one optional Smoke Break.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Pace:** ~1 in-game minute per real second (full shift ≈ 8 minutes), plus mini-games.

## Stack

Next.js 14 · Zustand · Tailwind · react-konva · framer-motion

## Docs

- [`contextAnchor.md`](./contextAnchor.md) — canonical design / roadmap
- [`docs/gemini-sprite-prompts.md`](./docs/gemini-sprite-prompts.md) — sprite generation prompts

## Local playthrough checklist

- [ ] Clock in; meters + clock advance (~1s per game minute)
- [ ] Answer tickets; Sanity / CSAT / Queue change
- [ ] Smoke Break once → lock; 33/67 outcomes
- [ ] 10:30 Bathroom Gamble → Back to Work ~10:40
- [ ] 12:00 Lunch stealth → breakroom or caught
- [ ] 3:00 Typing outage → clear words / survive timer
- [ ] Click Santa → off-season tooltip only
- [ ] Survive to 5:00 or hit game over

## Hosting

Local playable build lives here. Docker + [rbyt3r.com](https://rbyt3r.com) deployment is handled in a separate workspace.
