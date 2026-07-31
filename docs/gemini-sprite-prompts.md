# Gemini Sprite Prompt Pack — SIP-N-Sanity

Use these prompts to generate final 16-bit assets, then drop PNGs into `assets/sprites/` (and wire paths in components). Prefer **transparent backgrounds**, **limited palettes** (16–32 colors), **no anti-aliasing**, and **consistent light from top-left**.

**Global style prefix** (prepend to every prompt):

> 16-bit SNES-era pixel art, isometric or orthographic as noted, crisp pixels, no blur, no photorealism, cute but slightly grotesque corporate office comedy game, vibrant but grounded colors (teal desks, amber CRT glow, rose accents — avoid purple nebula gradients), transparent background PNG, consistent pixel scale.

---

## 1. Office background (full-bleed hero plane)

**Filename:** `office-floor.png`  
**Size:** 640×360 or 1280×720 (even multiples)  
**Prompt:**

> [GLOBAL] Wide isometric cutaway of a Tier-1 VoIP call center floor, three windows with daylight, four wooden desks with CRT monitors showing green text, ugly patterned carpet tiles, fluorescent lights, coffee stains, one red emergency phone on the wall, empty of characters, readable silhouette shapes, game background plate.

---

## 2. Stall doors (three variants)

**Filenames:** `stall-door-blue.png`, `stall-door-green.png`, `stall-door-brown.png`  
**Size:** 64×128 each  

> [GLOBAL] Closed bathroom stall door, front orthographic view, slightly scuffed, metal latch on the right, [COLOR: muted steel-blue / institutional green / dirty beige-brown], thick black pixel outline, suitable as a clickable game sprite.

---

## 3. Clean toilet reveal

**Filename:** `toilet-clean.png` · **Size:** 64×64  

> [GLOBAL] Sparkling clean porcelain toilet, slightly exaggerated shine pixels, tiny sparkle stars, bathroom stall interior, humorous holy-grail energy, orthographic.

---

## 4. Ogre in stall

**Filename:** `ogre-stall.png` · **Size:** 96×96  

> [GLOBAL] Grotesque but cartoony pixel-art ogre peeking from a bathroom stall, oversized head, tiny angry eyes, green-gray skin, mouth open mid-yell about toilet paper, door half-open, comedic not horror-gore.

---

## 5. Witch Boss

**Filename:** `witch-boss.png` · **Size:** 96×128  

> [GLOBAL] Stereotypical angry office manager as a witchy boss: cat-eye glasses, severe bun, burnt cigarette in hand, pointed finger, charcoal suit, furious expression, standing portrait, office comedy villain, orthographic.

---

## 6. Smoke balcony

**Filename:** `smoke-balcony.png` · **Size:** 160×96  

> [GLOBAL] Tiny outdoor office smoking balcony, metal railing, ashtray, sad potted plant, gray city haze, door back to office, cozy but pathetic break spot, isometric vignette.

---

## 7. Santa coworker (do not acknowledge)

**Filename:** `santa-desk.png` · **Size:** 64×96  

> [GLOBAL] Office worker sitting at a desk who is unmistakably Santa Claus in full suit and beard, wearing a headset, typing on a softphone UI, completely mundane pose, no Christmas props on desk, serious about tickets, isometric character sprite.

---

## 8. Player agent

**Filename:** `player-agent.png` · **Size:** 32×32 (top-down) and `player-agent-iso.png` 48×64  

> [GLOBAL] Tired Tier-1 support agent, hoodie, headset, coffee, [top-down for stealth grid / isometric for office], readable silhouette, idle pose.

---

## 9. Stealth enemies

**Filenames:** `enemy-qa.png`, `enemy-sales.png`, `enemy-hw.png` · **Size:** 32×32 top-down  

> [GLOBAL] Top-down pixel character, [QA manager with clipboard / chatty salesperson with smile / hardware tech with screwdriver], distinct color coding (red clipboard / yellow jacket / orange vest), facing indicator, simple.

---

## 10. HUD icons

**Filenames:** `icon-sanity.png`, `icon-csat.png`, `icon-queue.png`, `icon-smoke.png` · **Size:** 16×16  

> [GLOBAL] Tiny UI icon, [heart-shaped coffee cup for sanity / five-point star for CSAT / stack of paper tickets for queue / cigarette with ember for smoke break], 16×16, high contrast, one accent color each (mint / sky / coral / amber).

---

## 11. Falling outage ticket

**Filename:** `ticket-red.png` · **Size:** 96×32  

> [GLOBAL] Red urgent support ticket card sprite, torn edge pixels, bold enough to overlay white monospace text, orthographic UI element.

---

## Swap-in checklist

1. Export PNGs with transparency; keep power-of-two or even dimensions.  
2. Place under `assets/sprites/`.  
3. Replace CSS placeholder blocks in `components/office/*` and Konva `Rect` placeholders in mini-games with `Image` / `<img>`.  
4. Keep `image-rendering: pixelated` on all sprites.  
5. Do not add a second acknowledgment for Santa beyond the off-season tooltip.
