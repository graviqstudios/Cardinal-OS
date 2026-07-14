# Self-hosting LiveKit for Constellation voice/video

Constellation voice channels use [LiveKit](https://livekit.io) (open-source,
Apache-2.0). Self-hosting means **no per-minute fees and no time limits**.

The app is config-driven. With no LiveKit env set, voice rooms show a
"not enabled" placeholder and everything else (text chat, shared timer,
discovery, leaderboard) still works. Set three server-only vars to turn rooms on:

```
LIVEKIT_URL=wss://livekit.graviq.in   # ws://localhost:7880 locally
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

The app mints room tokens at `/api/livekit/token` (room name = the voice channel
id; only pod members get a token) and the browser connects straight to
`LIVEKIT_URL`.

---

## 1. Local development (already set up)

`livekit-server.exe` lives at `C:\Users\pssat\livekit\`. Start it with:

```
C:\Users\pssat\livekit\start-livekit.bat
```

Dev mode uses built-in keys — already in `.env.local`:

```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

Restart `npm run dev` after changing env (Next reads env only at startup).
Dev mode is insecure/single-node — **never** use `devkey`/`secret` in production.

---

## 2. Production — Oracle Cloud Always Free

Oracle's Always Free **Ampere A1** VM (up to 4 ARM cores / 24 GB RAM) runs
LiveKit at zero cost and supports the UDP traffic WebRTC needs (Vercel/Supabase
cannot host this). LiveKit's images are multi-arch, so ARM is fine.

### 2.1 Create the VM

1. cloud.oracle.com → **Compute → Instances → Create instance**
2. **Image:** Canonical Ubuntu 22.04 (or 24.04)
3. **Shape:** `VM.Standard.A1.Flex` — Ampere ARM, e.g. 2 OCPU / 12 GB (free up to 4/24)
4. Keep **"Assign a public IPv4 address"** checked
5. Add your SSH public key, then Create. Note the **public IP**.

> Ampere A1 capacity is often exhausted in popular regions ("Out of host
> capacity"). Retry, or pick a different availability domain/region.

### 2.2 DNS (both names must resolve before TLS is issued)

Add two **A records** under `graviq.in` pointing at the VM's public IP:

```
livekit.graviq.in   A   <VM_PUBLIC_IP>
turn.graviq.in      A   <VM_PUBLIC_IP>
```

Verify: `nslookup livekit.graviq.in` returns the VM IP.

### 2.3 Open the ports — BOTH layers

LiveKit needs:

| Proto | Port | Purpose |
|---|---|---|
| TCP | 80 | TLS certificate issuance (Let's Encrypt) |
| TCP | 443 | HTTPS / WSS + TURN over TLS |
| TCP | 7881 | WebRTC over TCP (fallback) |
| UDP | 3478 | TURN/UDP |
| UDP | 50000-60000 | WebRTC media |

**(a) Oracle cloud firewall:** Networking → your VCN → **Security Lists** →
Default Security List → **Add Ingress Rules** (Source `0.0.0.0/0`, one rule per
row above).

**(b) The instance's own iptables — the classic Oracle gotcha.** Oracle's Ubuntu
images ship with iptables rules that drop everything except SSH, so the cloud
rules alone do nothing. SSH in and run:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 7881 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 50000:60000 -j ACCEPT
sudo netfilter-persistent save     # survive reboot
```

### 2.4 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
```

### 2.5 Generate the LiveKit config

```bash
docker run --rm -it -v $PWD:/output livekit/generate
```

Answer the prompts:

- **Primary domain:** `livekit.graviq.in`
- **TURN domain:** `turn.graviq.in`
- **Email:** your email (for Let's Encrypt)

It writes a folder containing `caddy.yaml`, `docker-compose.yaml`,
`livekit.yaml`, `redis.conf` and `init_script.sh`, and **generates your API key
and secret** (they're in `livekit.yaml` under `keys:`).

### 2.6 Start it

```bash
cd <generated-folder>
sudo ./init_script.sh          # installs + registers the systemd service
systemctl status livekit-docker
```

Manage with `sudo systemctl start|stop|restart livekit-docker`. Caddy fetches
the TLS certs automatically on first boot (this is why DNS must already resolve).

### 2.7 Point Cardinal at it

In **Vercel → Project → Settings → Environment Variables** (Production):

```
LIVEKIT_URL=wss://livekit.graviq.in
LIVEKIT_API_KEY=<from livekit.yaml>
LIVEKIT_API_SECRET=<from livekit.yaml>
```

Then **redeploy** (env is read at build/boot). Voice channels will switch from
the placeholder to a working "Join voice" room.

### 2.8 Verify

```bash
# From your laptop — should return a 200/426 (not a timeout):
curl -i https://livekit.graviq.in
```

Then open a voice channel in two browsers (two accounts) and join.

---

## Troubleshooting

- **"Voice isn't enabled" in prod** → env vars missing or not redeployed.
- **Join spins forever / connects then drops** → UDP blocked. Re-check §2.3(b)
  iptables; this is the most common failure.
- **TLS cert errors** → DNS wasn't resolving when Caddy first ran. Fix DNS, then
  `sudo systemctl restart livekit-docker`.
- **`wss://` refused** → `LIVEKIT_URL` must be `wss://` (not `ws://`) in
  production; browsers block insecure websockets from an HTTPS page.
- **Out of host capacity (Oracle)** → try another availability domain/region.

## Alternative: LiveKit Cloud

Don't want to run a server? Create a free LiveKit Cloud project and set the same
three env vars to its url/key/secret. Free tier is capped monthly (~5,000
participant-minutes) but needs zero ops.
