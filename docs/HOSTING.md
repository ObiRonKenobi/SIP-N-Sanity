# Hosting handoff — SIP-N-Sanity → rbyt3r.com

This repo is developed until **locally playable**. Live hosting belongs in your **deployment workspace**.

## What is included here

- [`Dockerfile`](../Dockerfile) — multi-stage Next.js 14 production image (`output: 'standalone'`)
- [`docker-compose.yml`](../docker-compose.yml) — local/prod-style run on port 3000

## Build & run (any machine / deploy workspace)

```bash
docker compose build
docker compose up -d
# open http://localhost:3000
```

Or:

```bash
docker build -t sip-n-sanity .
docker run --rm -p 3000:3000 sip-n-sanity
```

## Suggested rbyt3r.com wiring (in the other workspace)

1. Clone or copy this repo into the hosting workspace  
2. Build the image as above  
3. Put a reverse proxy (Caddy / nginx / Traefik) in front:
   - e.g. `https://sip.rbyt3r.com` or `https://rbyt3r.com/sip` → `http://sip-n-sanity:3000`  
4. TLS via your existing cert automation  
5. Drop Gemini PNGs into `public/sprites/` **before** build so they are baked into the image (or mount a volume)

## Demo-only deploy (recommended for first rbyt3r.com ship)

The public pitch right now is the **walk demo**, not the unfinished full shift.

| Route | What it is |
| --- | --- |
| `/` | Title screen — **Play demo** is the live CTA; **Clock In** is disabled |
| `/demo` | Office walk → break room → short pitch + BGM |

**Ship the whole Next image** (Docker as above). Do **not** strip the full game code — production already hides layout debug (`LAYOUT_DEBUG` is `NODE_ENV === "development"` only) and the title does not start the unfinished shift.

Optional polish in the deploy workspace:
- Proxy `https://sip.rbyt3r.com/` → container `:3000` (title) or send `/` → `/demo` if you want zero title friction
- Confirm `/music/od-yishama.mp3` is in the image (`public/music/`)
- Smoke-test: title → Play demo → walk to door → break room → music ends once

Do **not** rely on `PUT /api/dev/demo-layout` in production — it is a local layout editor only.

## Notes

- App is a static-friendly client game; no database required  
- Ensure `next.config.mjs` keeps `output: "standalone"` for the Docker `server.js` entry  
- Do not commit secrets; none are required for the game itself
