# Self-hosting LiveKit for Constellation voice/video

Constellation voice channels use [LiveKit](https://livekit.io) (open-source,
Apache-2.0). Self-hosting means **no per-minute fees and no time limits** — you
pay only for a small always-on server. The app is config-driven: with no
LiveKit env set, voice rooms show a "not enabled" placeholder and everything
else (text chat, the shared timer, discovery) works. Set three env vars to turn
rooms on.

## What Cardinal expects

Three server-only env vars (in `.env.local` locally, and in Vercel for prod):

```
LIVEKIT_URL=wss://your-livekit-host        # signalling URL (wss:// in prod)
LIVEKIT_API_KEY=...                         # from your LiveKit config
LIVEKIT_API_SECRET=...                      # from your LiveKit config
```

The app mints room tokens server-side at `/api/livekit/token` (room name = the
voice channel id; only pod members get a token) and connects the browser
directly to `LIVEKIT_URL`.

## Local development (no infra)

LiveKit ships a dev mode with built-in keys — perfect for testing rooms locally:

```bash
# macOS/Linux
curl -sSL https://get.livekit.io | bash
livekit-server --dev
# or via Docker:
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server --dev
```

Then set:

```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

Open a voice channel in two browser windows and join — you should see/hear each
other. (Dev mode is insecure and single-node; never use it in production.)

## Production (self-hosted)

You need a host that allows persistent UDP (a VPS — Hetzner, Fly.io, Railway,
a droplet — **not** Vercel/Supabase). A minimal `docker-compose.yml`:

```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    command: --config /etc/livekit.yaml
    restart: unless-stopped
    network_mode: host          # needed for WebRTC UDP
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml

  # Optional but recommended so users behind strict NAT can connect:
  coturn:
    image: coturn/coturn:latest
    restart: unless-stopped
    network_mode: host
    command: >
      -n --min-port=49152 --max-port=65535
      --realm=your-domain --use-auth-secret --static-auth-secret=<TURN_SECRET>
```

`livekit.yaml`:

```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  # generate with: docker run --rm livekit/livekit-server generate-keys
  <API_KEY>: <API_SECRET>
turn:
  enabled: true
  domain: your-domain
  tls_port: 5349
```

Put the server behind TLS (Caddy/nginx or LiveKit's built-in TURN/TLS) so the
browser can reach it over `wss://`. Then set `LIVEKIT_URL=wss://your-domain`,
`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` to the generated pair, in Vercel.

## Notes

- Open firewall: TCP 7880/7881, UDP 50000-60000 (and 3478/5349 for TURN).
- `next.config.ts` already sends `Permissions-Policy: camera=(self),
  microphone=(self), display-capture=(self)` so first-party capture works.
- The free LiveKit **Cloud** tier is an alternative (no server to run, capped
  monthly minutes) — just set the same three env vars to the Cloud project's
  url/key/secret.
