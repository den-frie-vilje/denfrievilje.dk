# Deployment

Site-specific deploy notes for `denfrievilje.dk` (and the same image's other apex, `ole.kristensen.name`). The CD machinery itself — image build/sign in CI, agent on the NAS, signature verification flow — lives in [`den-frie-vilje/nas-sites`](https://github.com/den-frie-vilje/nas-sites) and is documented there:

- [PULL-DEPLOY-MODEL.md](https://github.com/den-frie-vilje/nas-sites/blob/main/docs/PULL-DEPLOY-MODEL.md) — operator manual for the agent.
- [NAS-BOOTSTRAP.md](https://github.com/den-frie-vilje/nas-sites/blob/main/docs/NAS-BOOTSTRAP.md) — fresh-NAS provisioning.
- [BRANCH-PROTECTION.md](https://github.com/den-frie-vilje/nas-sites/blob/main/docs/BRANCH-PROTECTION.md) — required GitHub repo settings.

This file is the per-site overlay: the URL pattern, dual-apex specifics, the GitHub workflow flow, and the local dev loop.

---

## URL pattern

This site is unusual in the den-frie-vilje stack: **one image, two apexes**. The same SvelteKit prerendered tree serves both `denfrievilje.dk` (bureau palette, neon yellow) and `ole.kristensen.name` (artist palette, neon green) — JS detects `window.location.hostname` and applies the bureau body class client-side.

| Role                | Hostname                                       | TLS                              | Purpose |
| ------------------- | ---------------------------------------------- | -------------------------------- | --- |
| Staging origin      | `denfrievilje-dk.stage.denfrievilje.dk`        | `*.stage.denfrievilje.dk` wildcard | Editor / dev preview. `X-Robots-Tag: noindex, nofollow`. |
| Production origin   | `denfrievilje-dk.prod.denfrievilje.dk`         | `*.prod.denfrievilje.dk` wildcard | Internal canonical NAS origin. |
| Public apex (bureau) | `denfrievilje.dk`                             | Cloudflare                       | Public bureau identity. |
| Public www          | `www.denfrievilje.dk`                          | Cloudflare                       | 301 → apex by Caddy. |
| Public apex (artist) | `ole.kristensen.name`                         | Cloudflare                       | Public artist identity. |
| Public www          | `www.ole.kristensen.name`                      | Cloudflare                       | 301 → apex by Caddy. |

Both apex hostnames are CF-orange-clouded against the production origin. CF terminates TLS at the edge; the cert at the NAS only needs to cover `*.prod.denfrievilje.dk`.

## Architecture

```
  Browser → Cloudflare (apex)
              ↓
          DSM Web Station (TLS terminate, multi-SAN cert)
              ↓
          Caddy (per-(site,env) container, on nas-deploy network)
              ├── per-domain www → apex 301
              └── reverse_proxy → site:8080
                                   ↓
                                 site (static nginx, GHCR-pulled image,
                                       palette switching by JS in browser)
```

CI builds + cosign-signs the image. The NAS agent (every ~5 min) pulls, verifies the signature, and `docker compose up -d --wait`s if the digest changed. There is no inbound deploy endpoint.

## Repository layout

```
deploy/
├── Dockerfile             # multi-stage: pkgx-pinned Node + pnpm builder → rootless nginx 8080
├── compose.staging.yml    # caddy + site (PUBLIC_SHOW_PALETTE_TOGGLE=true)
├── compose.production.yml # caddy + site (PUBLIC_SHOW_PALETTE_TOGGLE=false)
├── compose.local.yml      # local-dev override (binds to laptop port, builds local image)
├── Caddyfile.staging      # single-host reverse proxy
├── Caddyfile.production   # per-apex www→apex 301; no cross-apex redirect
├── nginx.conf             # SPA fallback + cache headers
├── staging.env.example    # CADDY_PORT shape
└── production.env.example # CADDY_PORT shape

src/
├── app.html               # %sveltekit.env.PUBLIC_GIT_SHA% baked into <meta x-build-sha>
├── routes/+layout.ts      # prerender = true; trailingSlash = 'always'
└── routes/+layout.svelte  # bureau detection by hostname; toggle gated on PUBLIC_SHOW_PALETTE_TOGGLE

.github/workflows/
├── deploy-staging.yml     # thin caller of nas-sites/build-and-sign.yml
└── deploy-production.yml  # same — no reviewer gate, no content-only fast-path

pkgx.yml                   # nodejs.org: ^25, pnpm.io: ^10 — single source of truth
```

---

## Day-to-day

### Developer flow

1. Branch off `staging`, work, PR back to `staging`.
2. Merge to `staging` → `Deploy to staging` workflow fires → image at `ghcr.io/den-frie-vilje/denfrievilje:staging-latest` → agent rolls out to staging container within ~5 min.
3. Verify on `https://denfrievilje-dk.stage.denfrievilje.dk/` — the floating bureau/artist toggle is exposed (staging-only via `PUBLIC_SHOW_PALETTE_TOGGLE=true`), so you can flip palettes without two staging hostnames.
4. PR `staging` → `main` to promote. Merge → `Deploy to production` fires → image at `:production-latest` → agent rolls out to prod container → CF cache purged on both zones.

The cryptographic gate is the cosign keyless signature, not a reviewer prompt. Branch protection on `main` is set to require PR + signed commits + linear history (matches the nas-sites BRANCH-PROTECTION.md recommendation).

### Local dev with the deploy stack

```sh
pkgx pnpm build
docker compose \
  -f deploy/compose.staging.yml \
  -f deploy/compose.local.yml \
  up --build
# → http://localhost:8080
```

The override builds locally from `deploy/Dockerfile`, binds to a laptop-reachable port, and sets `PUBLIC_SHOW_PALETTE_TOGGLE=true` so you can verify both palettes via `/etc/hosts` faking each apex to `127.0.0.1`.

### Pure-laptop dev (no Docker)

```sh
pkgx pnpm dev          # http://localhost:5173 — Vite dev server, palette toggle exposed by import.meta.env.DEV
```

### Rollback

`git revert` the bad commit on `main`, open a PR, merge — CI builds the reverted code; the agent picks it up. For an in-anger fast rollback, edit `deploy/compose.production.yml` to pin `image:` to a previous immutable tag (`production-2026-MM-DDTHH-MM-SSZ-abc12345`) instead of `production-latest`, push to `main`, agent deploys within ~5 min.

---

## NAS-side configuration

Per-site state on Woody at `/volume1/docker/denfrievilje.dk/`:

| Path                                              | Owner          | Purpose |
| ------------------------------------------------- | -------------- | --- |
| `/volume1/docker/denfrievilje.dk/repo/`           | `deploy:users` | git clone of this repo (agent does fetch + reset) |
| `/volume1/docker/denfrievilje.dk/staging/staging.env` | `root:docker 0640` | `CADDY_PORT=18082` |
| `/volume1/docker/denfrievilje.dk/production/production.env` | `root:docker 0640` | `CADDY_PORT=18083` |
| `/volume1/docker/nas-sites/sites.d/denfrievilje.dk.staging.env` | `root:docker 0640` | DOMAIN/ENV/REPO/BRANCH/COMPOSE_FILE_REL; CF empty for staging |
| `/volume1/docker/nas-sites/sites.d/denfrievilje.dk.production.env` | `root:docker 0640` | Same plus `CF_API_TOKEN` + `CF_ZONE_IDS=<denfrievilje.dk>,<ole.kristensen.name>` (multi-zone purge) |

DSM Web Station vhosts:

| Vhost hostname(s)                                   | Cert                          | Backend            |
| --------------------------------------------------- | ----------------------------- | ------------------ |
| `denfrievilje-dk.stage.denfrievilje.dk`             | `*.stage.denfrievilje.dk`     | `127.0.0.1:18082`  |
| `denfrievilje-dk.prod.denfrievilje.dk` + `denfrievilje.dk` + `www.denfrievilje.dk` + `ole.kristensen.name` + `www.ole.kristensen.name` | `*.prod.denfrievilje.dk` (CF terminates the public-apex hostnames; Web Station cert is for the .prod. SAN) | `127.0.0.1:18083`  |

---

## Troubleshooting

For agent-side or general CD-pipeline issues, see [nas-sites PULL-DEPLOY-MODEL.md §Troubleshooting](https://github.com/den-frie-vilje/nas-sites/blob/main/docs/PULL-DEPLOY-MODEL.md#troubleshooting).

### Site stays stale after a production deploy

CF cache. The agent purges both zones after each successful prod deploy via `CF_ZONE_IDS` plural. If the purge failed, the agent log says so:

```sh
sudo grep nas-sites-deploy /var/log/messages | grep -i 'CF purge'
```

Check the token has `Zone:Cache Purge:Purge` scope on **both** zones (denfrievilje.dk + ole.kristensen.name). Manual purge:

```sh
for zone in <denfrievilje.dk-zone-id> <ole.kristensen.name-zone-id>; do
  curl -X POST "https://api.cloudflare.com/client/v4/zones/$zone/purge_cache" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}'
done
```

### Wrong palette on a fresh page load

Browser localStorage from a previous staging session may persist. Production builds set `PUBLIC_SHOW_PALETTE_TOGGLE=false`, which makes `+layout.svelte` ignore localStorage and trust the hostname check only — so this should not happen in production. If you see it, check that the production image was actually built with `PUBLIC_SHOW_PALETTE_TOGGLE=false` (`<meta name="x-build-sha">` should NOT show toggle markup in the page source).

### Verify build SHA matches what's deployed

Every prerendered page has `<meta name="x-build-sha" content="...">` and `<meta name="x-build-time" content="...">`. Compare against `git rev-parse main`:

```sh
curl -s https://denfrievilje.dk/ | grep -oE 'x-build-sha[^>]*content="[^"]*"'
git rev-parse main
```
