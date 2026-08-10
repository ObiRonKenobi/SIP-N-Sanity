# SIP-N-Sanity — Context Anchor

**Product name:** SIP-N-Sanity  
**Subtitle:** Please Hold  
**Repo:** `ObiRonKenobi/SIP-N-Sanity`  
**This workspace:** develop until locally playable  
**Later workspace:** Docker container + live host on [rbyt3r.com](https://rbyt3r.com)

---

## 1. Elevator Pitch

A sarcastic, 16-bit time-management and survival game where you play as a Tier 1 VoIP technical support agent. Players must balance mental health (Sanity), customer satisfaction (CSAT), and a never-ending ticket queue to survive the 9:00 AM to 5:00 PM shift—navigating unhelpful coworkers, network outages, bathroom luck, an optional smoke break, and the sheer absurdity of corporate life.

---

## 2. Style, Tone & Lore

- **Visual Style:** Cute, vibrant, 16-bit isometric pixel art. The adorable aesthetic contrasts with soul-crushing tech support reality.
- **Humor & Tone:** Dry, sarcastic, and highly relatable to customer service / office workers. Passive-aggressive tooltips, absurd corporate jargon, realistic VoIP headaches.
- **Cast (locked pending art):**
  - **Player / hero** — tired Tier-1 agent (glasses, goatee, hoodie, headset). Existing sprites in `public/sprites/characters/player/`.
  - **Office Witch** — the boss / manager. Opposite-facing desk (`desk-manager.png`). Baseball bat energy.
  - **Santa** — clearly Santa in a suit on calls. Lore: **no one ever acknowledges why he’s there.** He is slightly annoying; tooltip only: *"He is a regular employee working off-season."*
  - **Floor clones (6–8 desks)** — identical coworkers: blue eyes, blonde hair, formally dressed Jewish office workers. **Same face/body**; tell them apart only by **different colored yarmulkes**. Reuse one base sprite + recolor the kippah (or thin Gemini variants).
- **Clone chatter (pending):** speech bubbles in **Hebrew** (e.g. bagels / office kvetch lines). SFX: recorded **“chchchchchchch”** voice fritter (not TTS). English placeholders OK until audio + copy land.
- **Placeholders first:** CSS/canvas placeholders until Gemini-generated sprites are swapped in (see `docs/gemini-sprite-prompts.md`).

---

## 3. Technical Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| State | Zustand |
| Styling | Tailwind CSS + pixel-art CSS (`image-rendering: pixelated`) |
| Mini-games | `react-konva` / Canvas |
| Animation | `framer-motion` (dialogs / transitions) |
| Data | JSON (tickets, door outcomes, smoke outcomes, office layout) |

---

## 4. Folder Structure

```text
/app
  /games
    /lunch-stealth      # 12PM Stealth mini-game
    /typing-outage      # 3PM Typing mini-game
    /bathroom-gamble    # 10:30AM Luck mini-game
  /components
    /ui                 # meters, tickets, timers, Smoke Break button
    /layout             # Main dashboard layout
    /office             # Office static assets, avatars
  /store
    index.ts            # Zustand store (GameState)
    tickets.ts          # Ticket data & generation logic
  /assets
    /sprites            # Pixel art images
    /sounds             # 16-bit WAV/MP3 effects
  /data
    ticket-db.json
    door-outcomes.json
    smoke-outcomes.json
    office-layout.json
  /docs
    gemini-sprite-prompts.md
contextAnchor.md
```

---

## 5. Daily Schedule & Core Mechanics

The game runs from **9:00 AM to 5:00 PM**.

### Main loop — Support Console
Pop-up tickets with multiple-choice answers. Balance three meters:

| Meter | Range | Notes |
| --- | --- | --- |
| Sanity | 0–100 | Drains on foolish customers / office chaos; refilled via breaks. **Game over at 0** |
| CSAT | 0–100 | Drops on sarcastic / wrong answers. **Game over at 0** |
| Queue | 0–99 | Climbs constantly; **game over at 100** |

**Game over** if Sanity hits 0, CSAT hits 0, or Queue hits 100. **Win** if you survive until 5:00 PM. Ending screens pull a random quip from `data/endings.json` per scenario.

### 10:30 AM — The Bathroom Gamble
Luck mini-game: pick one of three stall doors.

| Outcome | Sanity | Dialog vibe |
| --- | --- | --- |
| Clean toilet | +10 | "Ah, a moment of peace." |
| The Ogre | −20 | "GIVE ME TOILET PAPER!" (door slam) |
| Empty stall | 0 | Lonely stall. You just stand there. |

Resume console ~10:40 AM.

### 12:00 PM — Lunch Stealth (same isometric office)
At noon, coworkers **stand up from their desks** and wander the floor in the same isometric office view. Objective: sneak to the **breakroom doorway** without getting pulled into a conversation. Caught talking → Sanity drain and back to work. Reach breakroom → Sanity +10.


### 3:00 PM — The Outage
Typing defense: falling red tickets with VoIP jargon (`JITTER`, `PACKET LOSS`, etc.). Type to destroy. Ticket hits bottom → Queue +2.

### Optional — Sneak a Cigarette (once per playthrough)
HUD **Smoke Break** button. Disabled after `hasSmoked === true`.

| Result | Chance | Sanity | Notes |
| --- | --- | --- | --- |
| Success | 33% | +30 | Zippo + inhale; "Fresh air and a cancer stick…" |
| Failure | 67% | −40 | Witch Boss: "GET BACK TO WORK, YOU LECH!" |

Witch yelling must **not** fire during bathroom or lunch mini-games.

---

## 6. Global State Machine (Zustand)

**Meters:** `sanity`, `csat`, `queue`  
**Time:** `gameTime` (minutes since 9:00), `currentPhase`  
**Flags:**

- `hasSmoked: boolean` — defaults false; locks Smoke Break after use
- `isBathroomTime: boolean` — true at 10:30
- `smokeRNG: number` — RNG when smoke is clicked
- `bathroomDoors: array` — shuffled outcomes for clean / ogre / empty

Central `setInterval` advances time and queue; phase transitions at 10:30, 12:00, 3:00. Late day: queue pressure increases. Lunch sneak uses talk-radii on the isometric floor (not vision cones / not top-down).


---

## 7. Visual & Artistic Direction

- Bathroom: three closed, slightly different-colored 16-bit stall doors
- The Ogre: grotesque pixel ogre peeking from a stall
- The Witch Boss: angry office manager (cat-eye glasses, burnt cigarette)
- Smoke Break: pixel outdoor balcony / smoking area
- Santa: desk sprite; click → off-season employee tooltip only

---

## 8. Core Data Models

### Ticket example

```json
{
  "ticketID": "TS-420",
  "callerName": "Boomer McOld",
  "problem": "I plugged my headset in but it won't wake up.",
  "answers": [
    { "text": "Have you tried turning it off and on again?", "effect": { "sanity": -5, "csat": 0, "queue": -1 } },
    { "text": "It is plugged into the USB port, correct?", "effect": { "sanity": -10, "csat": -10, "queue": 2 } },
    { "text": "Please verify you plugged it into your ears first.", "effect": { "sanity": 0, "csat": -15, "queue": 1 } }
  ]
}
```

### Door outcomes

```json
{
  "doorOutcomes": [
    { "id": 0, "text": "A shining, pristine porcelain throne. You sigh in peace.", "sanityEffect": 10 },
    { "id": 1, "text": "An ogre belches, 'GIVE ME TOILET PAPER!' and slams the door.", "sanityEffect": -20 },
    { "id": 2, "text": "An empty, lonely stall. You just stand there for a moment.", "sanityEffect": 0 }
  ]
}
```

### Smoke break outcomes

```json
{
  "smokeBreakOutcomes": [
    { "id": "win", "text": "Cool smoke fills your lungs. You forget your troubles.", "sanityEffect": 30, "probability": 0.33 },
    { "id": "lose", "text": "The Witch catches you. 'YOU FUME-LOVING LEECH! GET BACK HERE!'", "sanityEffect": -40, "probability": 0.67 }
  ]
}
```

---

## 9. Implementation Phases (Cursor order)

1. **Phase 0** — This context file, Next.js scaffold, GitHub sync  
2. **Phase 1** — Zustand store, day timer, phase transitions (console-log first)  
3. **Phase 2** — HUD, ticket engine, Smoke Break button + lock, bathroom trigger  
4. **Phase 3** — Bathroom Gamble (`react-konva`)  
5. **Phase 4** — Lunch stealth + Outage typing  
6. **Phase 5** — Audio, Santa lore, balance, Gemini sprite prompt pack, local playthrough polish  

Do **not** build mini-game art before the global state machine and Smoke Break lock work.

---

## 10. Hosting Handoff (other workspace)

**Out of scope for day-to-day play in this repo’s primary workflow — but Docker artifacts live here for copy/paste.**

When the game is playable locally:

1. See [`docs/HOSTING.md`](docs/HOSTING.md)  
2. `docker compose up --build` → port 3000  
3. Reverse-proxy on **rbyt3r.com** from the deployment workspace  

Dockerfile + compose are in the repo root. Drop Gemini sprites into `public/sprites/` before building so they ship in the image.


---

## 11. Audio Checklist (Phase 5)

- Keyboard clacks, SIP ringtone for tickets  
- Bathroom door squeak, ogre grunt/slam  
- Witch yelling (distorted 16-bit)  
- Zippo lighter click + deep inhale (successful smoke)

---

*Canonical reference for SIP-N-Sanity. Prefer this file over older “SIP & Sanity: Please Hold” drafts when titles conflict.*
