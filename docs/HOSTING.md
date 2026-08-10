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

## Notes

- App is a static-friendly client game; no database required  
- Ensure `next.config.mjs` keeps `output: "standalone"` for the Docker `server.js` entry  
- Do not commit secrets; none are required for the game itself
