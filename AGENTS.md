# Den Frie Vilje — Project Guidelines

Portfolio/artwork website for Ole Kristensen. Static SvelteKit site with filesystem-based markdown content.

## Build & Test

All commands require `pkgx` prefix (it manages pnpm/Node):

```sh
pkgx pnpm install          # install deps
pkgx pnpm dev              # dev server (runs image processing first)
pkgx pnpm build            # static build → build/
pkgx pnpm check            # svelte-check + tsc
pkgx pnpm lint             # eslint + prettier check
pkgx pnpm format           # auto-format
pkgx pnpm test             # vitest (E2E smoke tests against dev server)
```

Image processing (`scripts/process-images.js`) runs automatically before `dev` and `build` — it copies images from `src/content/` to `static/content/` and generates 480px thumbnails.

## Architecture

- **Svelte 5** with runes (`$props()`, `$state()`, `$derived()`) — no legacy `export let` or `$:`
- **SvelteKit 2** with `adapter-static` — entire site is prerendered, `+layout.ts` sets `prerender = true`
- **Tailwind CSS v4** — `@tailwindcss/vite` plugin, theme tokens in `@theme` block in `src/app.css`
- **Content loading** is server-only (`fs`/`path` in `+page.server.ts` via `src/lib/content.ts`)
- **Markdown** parsed with `marked`, frontmatter with `js-yaml`, rendered via `{@html}`

### Content System

Content lives in `src/content/{section}/{N.slug}/index.md`:

- Sections: `works/`, `consultancies/`, `about/`, `contact/`
- Numeric prefix controls sort order (e.g. `17.oresund`) — stripped to derive URL slug
- Images co-located alongside `index.md`, processed to `static/content/` at build time
- Frontmatter fields: `title`, `date`, `lead`, `tags[]`, `materials`, `partners`, `client`, `github`, `photocredits`, `appearances[]`, `videos[]`

See [docs/content-structure.md](docs/content-structure.md) for full details.

### Key Files

| Path                        | Purpose                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `src/lib/content.ts`        | Content API: `getContentList()`, `getContent()`, frontmatter parsing |
| `src/app.css`               | Tailwind `@theme` tokens, design system utilities                    |
| `src/lib/components/`       | Header, Footer, Hero, VimeoPlayer                                    |
| `scripts/process-images.js` | Image copy + thumbnail generation                                    |

### Route Pattern

Collection pages (`works/`, `consultancies/`): `+page.server.ts` calls `getContentList()` → groups by year → grid layout.
Detail pages (`[slug]/`): `+page.server.ts` calls `getContent()` → detail layout with videos, gallery lightbox, prose.
Single pages (`about/`, `contact/`): `+page.server.ts` calls `getContent()` → prose layout.

## Code Style

- TypeScript everywhere — `.ts` config files, `lang="ts"` in Svelte components
- Tailwind utility classes inline in markup — no scoped `<style>` except for prose `:global()` selectors
- Svelte 5 snippets for slot rendering: `{@render children()}`
- Design tokens via CSS custom properties: `var(--color-ink)`, `var(--color-neon)`, etc.

See [docs/agent-knowledge.md](docs/agent-knowledge.md) for the full design system ("Gallery Neon") reference.

## Conventions

- Use the **Svelte MCP server** (`list-sections` → `get-documentation` → `svelte-autofixer`) when working on Svelte code
- Record design and architectural decisions in `./docs`
- `extractYear()` helper is currently duplicated in 3 route files — follow existing pattern until centralized
- The `build/` directory is committed for deployment — rebuild after content/code changes

## Deployment (nas-sites pull-deploy)

The site runs as a Docker container on Synology DSM under the [`den-frie-vilje/nas-sites`](https://github.com/den-frie-vilje/nas-sites) pull-deploy pattern. Per-site overlay in [DEPLOY.md](DEPLOY.md).

`deploy/` artifacts in this repo:

- `deploy/Dockerfile` — multi-stage: pkgx-backed builder reading `pkgx.yml` for Node + pnpm versions → rootless `nginxinc/nginx-unprivileged:alpine` (port 8080).
- `deploy/nginx.conf` — port 8080, trailing-slash directory-index lookup, SPA fallback to `/200.html`.
- `deploy/Caddyfile.{staging,production}` — staging is single-host; production handles **both** apexes (`denfrievilje.dk` + `ole.kristensen.name`) with per-domain www→apex 301.
- `deploy/compose.{staging,production,local}.yml` — caddy + site, image refs `ghcr.io/den-frie-vilje/denfrievilje:{staging,production}-latest`.

Local debugging:

```sh
pkgx pnpm build
docker compose -f deploy/compose.staging.yml -f deploy/compose.local.yml up --build
# → http://localhost:8080
```

## CI/CD (GitHub Actions)

Both workflows are thin callers of `den-frie-vilje/nas-sites/.github/workflows/build-and-sign.yml@v1`, pinned to a release tag rather than a branch: the reusable workflow signs the images we deploy, so upstream changes should reach this site as a reviewable bump of the tag, not silently.

| Workflow             | File                                      | Triggers                                             |
| -------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Deploy to staging    | `.github/workflows/deploy-staging.yml`    | Push to `staging` — build, cosign-sign, push to GHCR |
| Deploy to production | `.github/workflows/deploy-production.yml` | Push to `main` — same flow, no reviewer gate         |

The NAS-side agent on Woody reconciles every ~5 min: pulls, cosign-verifies, `docker compose up -d --wait`, optionally purges Cloudflare cache (multi-zone, both apexes).

## Svelte MCP Tools

Use the Svelte MCP server for comprehensive Svelte 5/SvelteKit documentation:

1. **list-sections** — discover available docs sections (use FIRST)
2. **get-documentation** — fetch full docs for relevant sections
3. **svelte-autofixer** — analyze Svelte code for issues (use before finalizing any Svelte code)
4. **playground-link** — generate playground link (only after user confirms, never when writing to project files)
