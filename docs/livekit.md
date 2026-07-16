# LiveKit setup — Constellation voice/video

Constellation voice channels use [LiveKit](https://livekit.io). The app is
**config-driven**: with no LiveKit env set, voice rooms show a "not enabled"
placeholder and everything else (text chat, shared timer, discovery,
leaderboard) still works. Turn rooms on with three server-only vars:

```
LIVEKIT_URL=wss://…          # ws://localhost:7880 locally
LIVEKIT_API_KEY=…
LIVEKIT_API_SECRET=…
```

The app mints room tokens at `/api/livekit/token` (room name = the voice channel
id; only pod members get a token) and the browser connects straight to
`LIVEKIT_URL`.

**Cloud and self-hosted are interchangeable** — same protocol, same three vars.
Switching between them is a zero-code change.

---

## Option A — LiveKit Cloud (current setup: free, no credit card)

Best place to start. Free "Build" plan, **no credit card required**.

### Steps

1. **cloud.livekit.io** → sign in with **GitHub** or Google.
2. **Create a project** — name `cardinal-os`, pick the region closest to your
   users (e.g. India/Singapore).
3. **Settings → Keys** → create/copy:
   - **API Key**
   - **API Secret** (shown once — copy immediately)
   - **Project URL** — `wss://<project>.livekit.cloud`
4. **Vercel → Settings → Environment Variables** (scope **Production**):
   ```
   LIVEKIT_URL=wss://<project>.livekit.cloud
   LIVEKIT_API_KEY=<key>
   LIVEKIT_API_SECRET=<secret>
   ```
5. **Deployments → ⋯ → Redeploy** (env is only read at boot).
6. Apply migrations `0034_servers_channels.sql` + `0035_public_discovery.sql`
   on production Supabase, or there are no voice channels to join.
7. Test: create a server → **Study Room → Join voice** from two accounts.

### Free-tier limits (hard caps — requests fail, you're never billed)

| Cap | Value |
|---|---|
| WebRTC participant-minutes | **5,000 / month** |
| Downstream data transfer | **50 GB / month** |
| Concurrent participants | 100 |

Minutes are counted **per participant** (a 4-person room burns 4 min/min), so
`room-hours ≈ 5000 ÷ (people × 60)`. Bandwidth scales **quadratically**
(`n × (n−1) × bitrate`) because an SFU forwards each person the other streams.

| Room size | Cameras off | Cameras on |
|---|---|---|
| 2 | ~42 hrs | ~42 hrs |
| 4 | ~21 hrs | ~18 hrs |
| 6 | ~14 hrs | ~7 hrs |
| 10 | ~8 hrs | ~2.5 hrs |

Study rooms are usually camera-off, which is the cheap column. Watch the usage
meter in the LiveKit dashboard; when it starts capping, move to Option B.

---

## Option B — Self-hosted (no minute cap; for scale)

Needs an always-on box with UDP (Vercel/Supabase can't host this). No per-minute
fees — you only pay for the server. For contrast, a €4/mo Hetzner VM includes
**20 TB** of traffic (~400× the Cloud free tier's 50 GB).

Good hosts: Hetzner/DigitalOcean (~€4-6/mo), or **Oracle Cloud Always Free**
(4-core ARM / 24 GB, free forever — but signup requires a card).

### B.1 Create the VM

Ubuntu 22.04, shape `VM.Standard.A1.Flex` (Ampere ARM — LiveKit images are
multi-arch), public IPv4 on, your SSH key added. Note the public IP.

> Oracle often reports "Out of host capacity" for Ampere — retry another
> availability domain/region.

### B.2 DNS (must resolve *before* TLS is issued)

```
livekit.graviq.in   A   <VM_PUBLIC_IP>
turn.graviq.in      A   <VM_PUBLIC_IP>
```

If DNS is on **Cloudflare**, set both to **DNS only (grey cloud)**. The proxy
breaks WebRTC/TURN and fails as "connects then drops".

Verify with `nslookup livekit.graviq.in` before continuing.

### B.3 Open ports — BOTH layers

| Proto | Port | Purpose |
|---|---|---|
| TCP | 80 | TLS issuance |
| TCP | 443 | HTTPS / WSS + TURN over TLS |
| TCP | 7881 | WebRTC over TCP |
| UDP | 3478 | TURN/UDP |
| UDP | 50000-60000 | WebRTC media |

**(a) Cloud firewall:** Networking → VCN → Security Lists → Default → Add
Ingress Rules (source `0.0.0.0/0`).

**(b) The instance's iptables — the classic Oracle gotcha.** Oracle's Ubuntu
images drop everything but SSH, so (a) alone does nothing:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 7881 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 50000:60000 -j ACCEPT
sudo netfilter-persistent save
```

### B.4 Install Docker, generate config, start

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

docker run --rm -it -v $PWD:/output livekit/generate
# prompts: primary domain, TURN domain, email → generates API key + secret

cd <generated-folder>
sudo ./init_script.sh          # installs + registers the systemd service
systemctl status livekit-docker
```

Keys live in `livekit.yaml` under `keys:`. Then set the same three Vercel vars
with `LIVEKIT_URL=wss://livekit.graviq.in` and redeploy.

---

## Local development

`livekit-server.exe` is at `C:\Users\pssat\livekit\`. Start it with:

```
C:\Users\pssat\livekit\start-livekit.bat
```

Dev-mode keys are already in `.env.local`:

```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

Restart `npm run dev` after changing env. Dev mode is insecure/single-node —
never use `devkey`/`secret` in production.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Voice isn't enabled" | Env vars missing, or not redeployed |
| Joins then drops / spins | UDP blocked (self-host: iptables; Cloudflare proxy on) |
| Connections suddenly fail mid-month | Cloud free-tier cap hit — check the usage meter |
| TLS/cert error (self-host) | DNS wasn't resolving when Caddy first ran → fix DNS, `sudo systemctl restart livekit-docker` |
| `wss://` refused | Used `ws://` in production; browsers block insecure websockets from HTTPS |
| No voice channels exist | Migrations 0034/0035 not applied |
