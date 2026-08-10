# Gemini Sprite Prompt Pack — SIP-N-Sanity (Complete Shot List)

Drop finished PNGs into **`public/sprites/`** (served at `/sprites/...`). Keep **`assets/sprites/`** as a working folder if you prefer, then copy into `public/sprites/`.

**Rules for every export**
- Transparent background PNG
- Limited palette (16–32 colors), no anti-aliasing, no blur, no photorealism
- Light from top-left; thick readable outlines
- Even pixel dimensions; `image-rendering: pixelated` in-game
- Same character must stay recognizable across all facings/poses

**Global style prefix** (prepend to every prompt as `[GLOBAL]`):

> 16-bit SNES-era pixel art for SIP-N-Sanity, cute but slightly grotesque corporate VoIP office comedy, vibrant grounded colors (teal desks, amber CRT glow, coral accents — avoid purple nebula gradients), crisp pixels, no blur, no photorealism, transparent background PNG, consistent pixel scale and outline weight.

---

## 0. Folder naming convention

```text
public/sprites/
  maps/
  furniture/
  characters/player/
  characters/desk/
  characters/stealth/
  characters/boss/
  bathroom/
  smoke/
  ui/
  vfx/
```

**Layering rule (why desks are separate):**  
Floor map (back) → character sprites → desk tops / monitors (front). That way a walker can pass *behind* a desk. If desks are baked into the room image, you cannot put anyone between carpet and desktop.

---

## 1. Office map — isometric only (NO desks)

Lunch sneak uses this **same** isometric view (no separate top-down room). Coworkers stand up and wander; you sneak to the breakroom doorway.

### 1a. Main game + lunch sneak view (isometric / ¾)

**File:** `maps/office-iso.png` · **Size:** 1280×720  

> [GLOBAL] Wide isometric ¾ cutaway of a Tier-1 VoIP call center for fake company **Livetel**, EMPTY of people, EMPTY of desks and chairs (no furniture), ugly patterned carpet with optional faint rectangular desk-footprint shadows in two rows of four, three daylight windows on the far wall, fluorescent lights, coffee stains, wall phone, clear aisle paths, breakroom doorway far-right with fridge silhouette only, on the wall a corporate **Livetel** logo in black and phosphor green like terminal output (blocky pixel wordmark "LIVETEL", no purple), game background plate, no UI chrome.

~~### 1b. Top-down office map~~ **CANCELLED** — stealth no longer needs a top-down room. Do not generate `office-topdown.png`.

### 1c. Break room map (DONE — `maps/breakroom-iso.png`)

**Attach:** `maps/office-iso.png`. Smaller room, same isometric angle. Furniture baked in.

> Use the attached Livetel office map as the camera/style reference. Draw a SMALLER isometric ¾ cutaway break room in that SAME angle and pixel scale (same diamond foreshortening — do not invent a new tilt). Grimier cute SNES office comedy, muted dirty teal/beige walls, stained carpet, fluorescent light, transparent outside the room silhouette.
>
> Layout as you enter from the office doorway (doorway on the near/bottom or bottom-right edge so it connects to the office map’s breakroom door):
> - LEFT of the room: a tall refrigerator
> - Next to the fridge (along the left/back wall): a SHORT counter with a sink; TWO cabinets above the counter and TWO cabinets below
> - RIGHT of the room: a small break table with exactly TWO chairs
>
> Rules: EMPTY of people; furniture baked into this map; no desks/UI/text; crisp pixels; cozy closet-sized break area.

### 1b. Livetel wall logo (standalone, reusable)

**File:** `ui/livetel-logo.png` · **Size:** 128×48 (and optional `ui/livetel-logo-sm.png` 64×24)

> [GLOBAL] Pixel corporate logo wordmark **LIVETEL**, black and phosphor/terminal green (#00ff66-ish on black or black letters with green glow), blocky 16-bit type, looks like old CRT terminal branding, transparent background, no tagline, suitable to hang on an office wall.

---

## 1d. Desks as separate sprites (required for walk-behind)

Place desks in-game on the footprint grid. Characters render *under* the desk-top layer.

### Isometric desks (in `public/sprites/furniture/`)

Employee desks: sit-facing **bottom-right** (agents look toward the office witch). Manager desk: **not a horizontal flip** — true opposite seating so the camera sees the **back of the CRT / desk**, witch faces the employee floor.

| File | Variant | Status |
| --- | --- | --- |
| `furniture/desk-regular.png` | Coffee ring — generic agents | DONE |
| `furniture/desk-hero.png` | Rubik’s cube — player | DONE |
| `furniture/desk-santa.png` | Mini Christmas tree | DONE |
| `furniture/desk-manager.png` | Rear-facing + baseball bat | DONE |
| `furniture/desk-iso.png` | Alias → regular | DONE |
| `furniture/desk-iso-alt.png` | Alias → hero | DONE |

Layout later: 6–8 employee desks + 1 manager desk. Y-sort so walkers go behind desk tops.

### Manager desk — rear-facing (office witch)

**Attach as references (required):** `furniture/desk-regular.png` (primary — match its exact parallelogram) + `maps/office-iso.png`. Save as `furniture/desk-manager.png`.

**Common failure:** Gemini often rotates the desk **90°** onto the other isometric axis (long edge bottom-left→top-right). That looks “rear-ish” but will not line up with employee desks. We need a **180° walk-around** of the *same* desk footprint.

**Copy-paste prompt:**

> PRIMARY REFERENCE = the attached employee desk sprite. Match its EXACT isometric parallelogram: same edge slopes, same long-axis tilt, same pixel scale and wood color. You are drawing that SAME desk after walking around to the opposite side (180° in world space).
>
> DO NOT:
> - Horizontally flip the PNG (mirrors left/right but still shows the screen face / wrong sit side)
> - Rotate the desk 90° onto the other diamond axis (long edge running bottom-left → top-right is WRONG)
> - Invent a different desk silhouette
>
> Orientation checklist (employee ref → manager):
> - Employee desk: sit / open knee-hole is on the NEAR side (toward bottom-right); CRT SCREEN faces camera (green pixels visible).
> - Manager desk: sit / open knee-hole is on the FAR side (toward top-left, deeper in the room); CRT BACK faces camera (vents, plastic shell, cables hanging down — NO green screen toward viewer).
> - Manager sits on the far side looking toward bottom-right (toward the employee floor). Player sees the rear modesty panel of the desk as the NEAR face.
> - Desktop parallelogram edges must be PARALLEL to the employee desk edges (same tilt). If the employee near-edge slopes one way, the manager near-edge slopes the SAME way.
>
> Props / construction:
> - Soft muted dirty beige/brown wood, subtle shading, thick black outline, transparent BG
> - Same single rectangle desk (drawer pedestal on one end, panel leg on the other — swapped ends vs employee because of 180° turn is OK)
> - Keyboard mostly HIDDEN behind the CRT or only a thin strip peeking on the FAR side of the monitor (manager’s side) — do not place a full keyboard beside the monitor on the near surface
> - Signature prop: ONE wooden baseball bat on the desk (readable, office-comedy menace)
> - Optional tiny coffee mug; no Rubik’s cube; no Christmas tree; no person; no chair
> - 16-bit SNES pixel art, crisp pixels, no blur
>
> Success test: overlay this sprite on the employee desk — footprints should align; only which side is “front” and whether you see screen vs CRT back should differ.

### Top-down desk

~~CANCELLED~~ — not needed. Stealth uses the isometric office.

### Optional chair (iso)

**Same isometric ¾ angle as `office-iso.png` and `desk-iso.png`.**

| File | Size |
| --- | --- |
| `furniture/chair-iso.png` | 32×40 |

> [GLOBAL] Simple office chair in the **same isometric ¾ angle as the Livetel office map and desk-iso**, transparent BG, sits behind/under seated character sprites.

---

## 2. Player — main character

Tired Tier-1 agent: black rimmed glasses, mustache/goatee, dark navy zip hoodie (thin pale stripe on sleeves), headset, messy brown hair, brown pants, dark shoes, burnt-out energy. Optional teal mug with small orange stripe.

**Attach every time:** _ref-player-fullbody-v2.png (best look so far). Optional _ref-player-bust-sheet.png for face close-ups.

**Why Gemini makes sheets:** prompts that say “three poses”, “idle/type/sip”, or “sprite sheet” get packed into one image. Fix = **one pose per generation**, and say **exactly one character, alone**.

**Lock lines** (first paragraph of every player prompt below):

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.

---

### 2a. Desk seated — one PNG each

**Attach:** `_ref-player-fullbody-v2.png` + **`desk-hero.png`** (required for facing) + optional `office-iso.png`.

**Facing lock (seated poses):** Employee desks show the CRT **screen** toward the camera. The agent sits on the **near** open-knee side and looks **into** the desk at that screen. Body stays BACK / rear ¾ (not face-toward-camera). Knees/feet toward the bottom of the frame; torso toward the monitor. Do NOT face bottom-right toward the viewer. Glance poses only turn the **head**; body still faces the desk.

#### `player-desk-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Single full-body seated isometric ¾ sprite that LINES UP with the attached desk: the agent sits in the desk’s open knee-hole (near side) and faces the CRT — looking INTO the desk, away from the viewer. Camera sees the character’s BACK / rear three-quarter (headset back, hoodie back, brown pants, shoes). Tired/slumped IDLE, hands on thighs toward the desk edge. NO desk and NO chair drawn in this sprite. NO mug. Same outfit as reference.
>
> Wrong (reject): character facing the camera or facing bottom-right as if looking out of the room; front-of-face portrait sit.

#### player-desk-type.png

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Same seating orientation as idle: BACK / rear ¾ toward camera, facing the CRT of the attached desk (into the desk, not toward viewer). TYPING pose — arms forward toward keyboard height. Invisible chair only. Same outfit as reference.

#### `player-desk-glance-left.png`

**Attach:** `player-desk-idle.png` only (do **not** attach glance-right — Gemini will copy it). No desk.

Gemini cannot reliably “turn the head the other way.” Describe the result in absolute screen terms:

> EXACTLY ONE character. ONE pose only. No second figure, no sprite sheet, no text, no desk, no chair, no mug. Transparent background. Dark pixel outline only. Full body head-to-shoes. Match the attached idle character’s outfit and seated rear ¾ body (same slumped sit, hands on thighs).
>
> HEAD POSE (critical): He is looking over his shoulder toward the LEFT side of the IMAGE. From the camera we should mainly see the BACK of his head and the BACK of the green headset. His face/glasses are only a small profile peek on the LEFT edge of the head — chin points toward the left side of the frame. Most of the headset earcup faces the viewer.
>
> Wrong (reject): face clearly visible in the center/right of the head; looking toward screen-right; front of glasses toward camera; any furniture.

#### `player-desk-glance-right.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Same seated body orientation as idle (BACK / rear ¾, facing into the desk). Only change: head turns RIGHT, glancing around the office over his right shoulder. No mug. Hands idle on thighs or desk edge. Invisible chair only. Same outfit as reference.

#### `player-desk-phone.png`

Desks already have a coffee mug — no sipping. After looking around, he sneaks a look at his phone.

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Same seated body orientation as idle (BACK / rear ¾, facing into the desk). Head tilted down looking at a small smartphone held in both hands (texting / scrolling). Tiny phone only — readable silhouette, not a giant slab. No mug, no desk, no chair furniture. Same outfit as reference.

**Player desk pose cycle in-game:** idle → type → glance-right → glance-left → glance-right → phone → (repeat).

### 2b. Standing / walk — one PNG each

#### player-front-idle.png

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Single full-body STANDING sprite facing the camera (FRONT), idle/tired stance. Same agent as reference: glasses, goatee, headset, navy hoodie with sleeve stripe, brown pants, dark shoes. Empty hands.

#### player-back-idle.png

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Single full-body STANDING sprite facing AWAY from camera (BACK), idle. Same outfit/proportions as attached reference. Headset visible from behind.

#### player-left-idle.png

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Single full-body STANDING sprite facing LEFT, idle. Same agent as attached reference.

#### player-right-idle.png

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference character.
>
> Single full-body STANDING sprite facing RIGHT, idle — match the standing figure in the attached reference. Same agent. Empty hands preferred (mug optional).

#### Walk frames (2 per facing — enough)

**Yes, 2 walk frames is enough.** Per facing you already have idle; while moving the game flips **walk1 ↔ walk2**. That classic “left foot / right foot” shuffle reads as walking at SNES scale. (A 3rd mid-frame is nicer but not required.)

**Attach every time:** the matching `player-{facing}-idle.png` (same facing). One pose per generation. Keep feet on the same baseline; only legs/arms change.

**Walk contrast rules (so the loop reads):**
- **walk1** = left foot forward / right foot back, opposite arm forward
- **walk2** = right foot forward / left foot back, arms swapped
- Same facing, outfit, scale, and camera as the attached idle
- Subtle motion only — no running leap, no torso twist that changes facing

---

#### `player-front-walk1.png`

**Attach:** `player-front-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference EXACTLY (same front-facing idle character: glasses, goatee, headset, navy hoodie with sleeve stripes, brown pants, dark shoes).
>
> Same FRONT camera as attached (facing viewer). WALK CYCLE frame 1 only: left foot stepped forward toward camera, right foot back, slight opposite arm swing. Keep head/torso almost identical to idle — only limbs change. Same pixel scale and outline weight. No motion lines, no shadow blob, no ground.

#### `player-front-walk2.png`

**Shortcut:** can be a **horizontal mirror** of `player-front-walk1.png` (we do this in-repo). Mic/hair swap sides each step — usually fine at game scale. Prefer a real Gemini walk2 later if the flicker bothers you.

**If generating fresh — attach:** `player-front-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached reference EXACTLY (same front-facing character and outfit).
>
> Same FRONT camera as attached. WALK CYCLE frame 2 only — the OPPOSITE of walk1: right foot stepped forward toward camera, left foot back, arms swapped. Head/torso stay like idle. Keep headset mic on the SAME side as idle (viewer’s left). Same scale. No text, no ground, no second figure.

#### `player-back-walk1.png`

**Attach:** `player-back-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached back-idle reference (headset from behind, hoodie with sleeve stripes, brown pants, dark shoes).
>
> Facing AWAY from camera (BACK). WALK CYCLE frame 1: left leg stepped forward (away from camera / into scene), right leg back, slight arm swing. Torso/head stay like attached idle. Same scale. No furniture, no text.

#### `player-back-walk2.png`

**Attach:** `player-back-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached back-idle reference.
>
> Facing AWAY from camera (BACK). WALK CYCLE frame 2 — opposite foot: right leg forward into the scene, left leg back, arms swapped. Same scale as idle. No text, no ground.

#### `player-left-walk1.png`

**Attach:** `player-left-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached left-idle profile reference (glasses, headset mic, navy hoodie, brown pants).
>
> Facing LEFT (profile). WALK CYCLE frame 1: leading leg stepped left (toward left edge of frame), trailing leg back, slight arm swing. Keep the same left profile — do not turn to face camera. Same scale as attached idle.

#### `player-left-walk2.png`

**Attach:** `player-left-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached left-idle reference.
>
> Facing LEFT. WALK CYCLE frame 2 — opposite foot from walk1: other leg leading toward left edge, arms swapped. Same left profile and scale. No text, no sheet.

#### `player-right-walk1.png`

**Attach:** `player-right-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached right-idle profile reference.
>
> Facing RIGHT (profile). WALK CYCLE frame 1: leading leg stepped right (toward right edge of frame), trailing leg back, slight arm swing. Keep right profile — do not face camera. Same scale as attached idle.

#### `player-right-walk2.png`

**Attach:** `player-right-idle.png`

> EXACTLY ONE character. ONE pose only. Do NOT draw a second figure. Do NOT make a sprite sheet. Do NOT add text labels. Transparent background. Dark pixel outline only — no white sticker border. Full body head-to-shoes. Match the attached right-idle reference.
>
> Facing RIGHT. WALK CYCLE frame 2 — opposite foot from walk1: other leg leading toward right edge, arms swapped. Same right profile and scale. No text, no sheet.

**Checklist (8 files):**  
`player-front-walk1|2` · `player-back-walk1|2` · `player-left-walk1|2` · `player-right-walk1|2`  
Drop each here after BG removal and I’ll crop/resize like the idles.

### 2c. Top-down player

~~CANCELLED~~ — lunch sneak uses walk facings (section 2b), not top-down.

---

## 3. Desk coworkers (isometric seated, 2–3 poses each)

Each coworker needs **idle / type / stretch-or-glance** for fake motion. Layout: player + witch/manager + Santa + **6–8 yarmulke clones**.

### 3a. Santa (never acknowledged; mildly annoying)

| File | Size |
| --- | --- |
| `characters/desk/santa-idle.png` | 48×64 |
| `characters/desk/santa-type.png` | 48×64 |
| `characters/desk/santa-stretch.png` | 48×64 |

> [GLOBAL] Office worker who is unmistakably Santa Claus in full red suit and white beard, headset, seated **character only — no desk furniture**, [idle / typing / restless stretch], no Christmas props, mundane professional pose, slightly annoying body language OK, isometric ¾, transparent BG.

### 3b. Yarmulke clones (floor agents)

**One base character, many kippah colors.** Blue eyes, blonde hair, clean-shaven or light stubble, formal office wear (dress shirt / blazer), headset. Identical face and outfit across desks — **only the yarmulke color changes** (e.g. black, blue, red, green, gold, white, purple, pink).

| Files | Notes |
| --- | --- |
| `characters/desk/clone-base-idle.png` | Master seated idle (pick a default kippah color) |
| `characters/desk/clone-base-type.png` | Typing |
| `characters/desk/clone-base-stretch.png` | Stretch / glance |
| `characters/desk/clone-{color}-*.png` | Optional recolors, or tint kippah in-engine |

> EXACTLY ONE character. Seated isometric rear ¾ (same facing lock as player desk — back toward camera, into desk). Blue eyes, blonde hair, formal Jewish office worker with a clearly visible colored yarmulke, headset, dress shirt. Full body head-to-shoes, no desk/chair in sprite, transparent BG, dark outline only. [idle / typing / stretch]. Do not change face between color variants — only the yarmulke hue.

**Chatter (pending):** Hebrew speech bubbles; SFX = player-recorded “chchchchchchch”. See `contextAnchor.md` §2.

### 3c. Office Witch (boss) — seated at manager desk

Facing opposite employees (rear of CRT toward player — matches `desk-manager.png`). Separate prompts when ready; bat stays on the desk prop, not in her hand unless a special beat.

---

## 4. Lunch sneak cast (same isometric office — standing / walk)

Stealth uses the **same iso office**. These are standing walkers (they left their desks), same camera angle family as player walk set (`front|back|left|right`).

For each character id `witch`, `santa`, `tech`, `sales` and each facing:

| File pattern | Size |
| --- | --- |
| `characters/walk/{id}-{facing}-idle.png` | 32×48 |
| `characters/walk/{id}-{facing}-walk1.png` | 32×48 |
| `characters/walk/{id}-{facing}-walk2.png` | 32×48 |

> [GLOBAL] Full-body pixel character for isometric office sneak, facing {FACING}, same tilt language as the Livetel office / player walk sprites, transparent BG.  
> **Witch:** cat-eye glasses, severe bun, charcoal suit.  
> **Santa:** red suit, white beard, headset, mundane.  
> **Tech manager:** yarmulke clearly visible, button shirt, badge lanyard.  
> **Sales:** bright yellow jacket, chatty energy.

~~Top-down stealth sprites (`*-td-*.png`) CANCELLED.~~

---

## 5. Boss / event portraits

| File | Size | Prompt |
| --- | --- | --- |
| `characters/boss/witch-stand.png` | 96×128 | Standing Witch Boss pointing, cat-eye glasses, burnt cigarette, furious |
| `characters/boss/witch-outdoor.png` | 96×128 | Same Witch outdoors catching you smoking, pointing, wind in hair |
| `characters/boss/ogre-stall.png` | 96×96 | Grotesque cartoony ogre in stall yelling for toilet paper |

> [GLOBAL] … (character details above), orthographic portrait, comedy not gore, transparent BG.

---

## 6. Bathroom set

| File | Size |
| --- | --- |
| `bathroom/stall-door-blue.png` | 64×128 |
| `bathroom/stall-door-green.png` | 64×128 |
| `bathroom/stall-door-brown.png` | 64×128 |
| `bathroom/stall-door-open.png` | 64×128 |
| `bathroom/toilet-clean.png` | 64×64 |
| `bathroom/stall-empty.png` | 64×96 |
| `bathroom/restroom-bg.png` | 640×360 |

> [GLOBAL] Orthographic bathroom stall door, scuffed, latch on right, [steel-blue / institutional green / dirty beige]. Open door variant shows dark interior frame. Clean sparkling toilet with tiny shine pixels. Empty lonely stall interior. Restroom BG: tile floor, three stall frames in a row, EMPTY of characters.

---

## 7. Smoke break — sunny outdoor park (replace sad balcony)

| File | Size |
| --- | --- |
| `smoke/outdoor-park.png` | 1280×720 |
| `smoke/tree-shade.png` | 160×160 |
| `smoke/butterfly-1.png` | 16×16 |
| `smoke/butterfly-2.png` | 16×16 |
| `smoke/squirrel-1.png` | 24×24 |
| `smoke/squirrel-2.png` | 24×24 |
| `smoke/ashtray.png` | 32×24 |
| `smoke/puff-1.png` | 32×32 |
| `smoke/puff-2.png` | 32×32 |
| `smoke/puff-3.png` | 32×32 |

> [GLOBAL] Beautiful sunny outdoor break area behind an office building, blue sky, green grass, large shade tree, warm daylight, space in mid-ground for a standing character (Witch may appear), cheerful but still corporate-adjacent, EMPTY of people, game background plate.  
> Separate tiny looping sprites: butterfly wing flaps, squirrel sit/nibble, smoke puff VFX frames, ashtray prop.

---

## 8. UI chrome & speech bubbles

**Bubbles are reusable frames — text is rendered in-engine. Do NOT bake dialogue into the PNG.**

| File | Size |
| --- | --- |
| `ui/bubble-tail-left.png` | 96×64 |
| `ui/bubble-tail-right.png` | 96×64 |
| `ui/bubble-tail-down.png` | 96×64 |
| `ui/bubble-shout.png` | 96×64 |
| `ui/icon-sanity.png` | 16×16 |
| `ui/icon-csat.png` | 16×16 |
| `ui/icon-queue.png` | 16×16 |
| `ui/icon-smoke.png` | 16×16 |
| `ui/icon-coffee.png` | 16×16 |
| `ui/livetel-logo.png` | 128×48 |
| `ui/livetel-logo-sm.png` | 64×24 |
| `ui/ticket-red.png` | 96×32 |
| `ui/hand-cursor.png` | 24×24 |
| `ui/fridge.png` | 32×48 |
| `ui/coffee-station.png` | 48×48 |

> [GLOBAL] 9-slice friendly comic speech bubble frame with empty white/cream fill center for text, black pixel outline, [tail pointing left / right / down / jagged shout variant], transparent outside.  
> Icons: mint coffee-heart sanity, sky star CSAT, coral ticket stack queue, amber cigarette smoke, brown coffee mug. **Livetel** logo black + phosphor green. Red urgent ticket card for outage. Pixel hand cursor. Breakroom fridge. Coffee station urn.

---

## 9. Generation order (recommended)

1. Iso office map **without desks** + Livetel logo (`office-iso` — already usable)  
2. Separate iso desks + optional chair  
3. Player walk facings + seated poses  
4. Coworker seated poses + **standing walk sets** for lunch sneak (Witch, Santa, Tech, Sales)  
5. Outdoor smoke park + critters + Witch outdoor  
6. Bathroom set + ogre  
7. UI bubbles + icons + VFX  

Do **not** generate top-down room maps or top-down stealth characters.

## 10. Swap-in checklist

1. Export PNG with transparency; even dimensions.  
2. Save under `public/sprites/` matching paths above.  
3. Game loads via `/sprites/...`; missing files fall back to CSS/canvas placeholders.  
4. Draw order: **map → characters → desks/monitors** so walkers go behind desks.  
5. Keep Santa lore: click → only “He is a regular employee working off-season.”  
6. Never bake speech text into bubble PNGs.
