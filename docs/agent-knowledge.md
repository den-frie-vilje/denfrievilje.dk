# Agent Knowledge Base

This folder contains notes and documentation for the AI agent to remember key preferences and project-specific details.

## About

This site belongs to **Ole Kristensen**, a software artist who also runs a small design technology consultancy called **Den Frie Vilje**.

- **Artist name**: Ole Kristensen
- **Artist website**: ole.kristensen.name (this site)
- **Consultancy name**: Den Frie Vilje
- **Consultancy website**: denfrievilje.dk (this site)
- **Consultancy logos**: SVG assets in `images/logos/`

The site serves as both a portfolio for Ole's artwork and a showcase for the consultancy's projects.

## Preferences & Requirements

- Use `pnpm` as the package manager, invoked through `pkgx`.
  - Always prefix pnpm commands with `pkgx` (e.g. `pkgx pnpm dev`, `pkgx pnpm build`).
  - `pkgx` is used to manage pnpm itself.
- The project is a Svelte 5 application using SvelteKit and the static adapter.
- TypeScript is enabled throughout the project, with all configuration and component files written in `.ts` or `.svelte` with `lang="ts"`.
- Configuration files (`svelte.config.ts`, `vite.config.ts`) use TypeScript for type safety.
- ESLint and Prettier are used for linting and formatting; ESLint config remains in CommonJS format.

## Key Commands

- `pkgx pnpm dev` — start development server
- `pkgx pnpm build` — build static output
- `pkgx pnpm preview` — preview build
- `pkgx pnpm check` / `check:watch` — type checking
- `pkgx pnpm lint` / `format` — lint/format code

## Design System: "Gallery Neon"

### Vision & Tone

The site is served from both **denfrievilje.dk** (bureau) and **ole.kristensen.name** (artist). It conveys quality, attention to detail, playfulness, elegance, and frontend skilfulness. Modern European/Scandinavian aesthetic, mobile-first but striking on large screens.

### Two-Flavour Identity

The same underlying design language splits into two palettes selected by domain:

- **Works / Artist** — "White Room Gallery": near-white surfaces, generous whitespace, museum-like presentation. **Neon green** accent.
- **Consultancies / Bureau** — "Warm Bureau": medium-dark warm grays, professional and structured. **Neon yellow** accent.

Both flavours share typography, layout grid, animation system, and interaction patterns — only palette differs.

#### Palette switching

Two CSS mechanisms, defined in `src/app.css`:

| Mechanism             | Selector                      | When used                                                                     |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| **Whole-site**        | `body.bureau`                 | Toggled via JS in `+layout.svelte`; switches the entire page including footer |
| **Per-page**          | `.page-dark` wrapper div      | Used on consultancies list + detail pages when in artist mode                 |
| **Footer adaptation** | `body:has(.page-dark) footer` | CSS `:has()` auto-adapts footer when a `.page-dark` section is present        |

In development, a floating domain toggle (bottom-right) lets switching between artist/bureau modes.

### Palette Tokens

All colours in OKLCH colour space (extended P3 gamut for neon accents):

| Token                    | Artist (default)                   | Bureau (`body.bureau` / `.page-dark`)  |
| ------------------------ | ---------------------------------- | -------------------------------------- |
| `--color-surface`        | `oklch(0.98 0.003 100)` near-white | `oklch(0.30 0.012 270)` dark warm gray |
| `--color-ink`            | `oklch(0.12 0.01 260)` near-black  | `oklch(0.93 0.005 260)` light          |
| `--color-ink-secondary`  | `oklch(0.50 0.01 260)`             | `oklch(0.68 0.008 265)`                |
| `--color-accent`         | `oklch(0.75 0.30 150)` neon green  | `oklch(0.91 0.35 100)` neon yellow     |
| `--color-accent-hover`   | `oklch(0.70 0.35 150)`             | `oklch(0.95 0.38 100)`                 |
| `--color-accent-subtle`  | `oklch(0.95 0.06 150)`             | `oklch(0.35 0.04 100)`                 |
| `--color-accent-duotone` | `oklch(0.75 0.30 150 / 0.35)`      | `oklch(0.91 0.35 100 / 0.3)`           |
| `--color-border`         | `oklch(0.93 0.003 100)`            | `oklch(0.37 0.010 270)`                |

### Layout Tokens

Defined in `@theme` block in `src/app.css`:

| Token      | Value                      | Purpose                       |
| ---------- | -------------------------- | ----------------------------- |
| `--max-w`  | `1280px`                   | Max content width             |
| `--gutter` | `clamp(1.5rem, 5vw, 4rem)` | Responsive horizontal padding |
| `--nav-h`  | `3.25rem`                  | Fixed header height           |

### Typography

Three font families loaded from Google Fonts in `src/app.html`:

| Token            | Family        | Usage                                   |
| ---------------- | ------------- | --------------------------------------- |
| `--font-heading` | Space Grotesk | Headings, nav, labels, tags, UI text    |
| `--font-body`    | DM Sans       | Body text (weight 300, line-height 1.6) |
| `--font-serif`   | Lora          | Prose / rendered markdown content       |

Section labels use a consistent pattern: uppercase `font-heading` at `0.68rem` with wide tracking in accent colour, placed above large headings.

### Hero Component (`Hero.svelte`)

Two distinct hero layouts, both using the VoronoiGlass component:

- **Artist hero** — split layout: VoronoiGlass fills the upper portion (up to 60svh), below it a 2-column grid with "Ole Kristensen" in large type (left) and tagline + accent bar + location (right)
- **Bureau hero** — full-viewport VoronoiGlass background (extends behind the nav with `-mt-[var(--nav-h)]`), Den Frie Vilje logo and tagline overlaid in a 2-column grid

#### VoronoiGlass (`VoronoiGlass.svelte`)

Custom canvas component that renders portfolio images through animated Voronoi cell tessellation:

- Lloyd-relaxed Voronoi seeds for even cell distribution
- Per-cell image refraction offsets (glass shard effect)
- BFS wavefront crossfade between images (automatic slideshow + click-triggered)
- Mouse/touch-interactive: seed displacement, per-cell activity system, drag-to-reveal
- Device orientation tilt on mobile
- Multi-resolution image loading (picks appropriate resolution for canvas size)

### Header & Navigation (`Header.svelte`)

- **Fixed top nav** with glass-morphism: translucent `--color-surface` background + 16px backdrop blur, border bottom
- **Desktop**: horizontal nav links — Works, Consultancies, About, Contact
- **Mobile**: animated hamburger (3 lines → X) → fullscreen overlay menu with centered nav links
- **Bureau mode**: shows Den Frie Vilje SVG logo instead of text name, with scroll-driven opacity (fades in as the hero logo scrolls out of view)

### Scroll-Driven Animations

CSS-only, `@supports (animation-timeline: view())` for progressive enhancement:

- `animate-fade-up` — fade + slide up on scroll into view (the only scroll animation class currently in use)

### Lightbox

Defined in `app.css` as `.lightbox-overlay`, used in both work and consultancy detail pages:

- Fixed fullscreen overlay, near-black background (92% opacity)
- Keyboard navigation (Escape, ArrowLeft, ArrowRight)
- Click outside to close, prev/next buttons, image counter
- Images constrained to 90vw × 85vh

### Page Layouts

#### Home page (`+page.svelte`)

Sections reorder based on mode: bureau shows consultancies first, artist shows works first (using Svelte 5 snippets).

- **Works section**: 2-column asymmetric grid (`1.3fr` / `0.7fr`) — first featured work spans the left column, two smaller items stacked right
- **Consultancies section**: horizontal list rows with thumbnail, title, lead, client, date, and arrow
- **About section**: accent bar + pull-quote + "Read more" link

#### Works listing (`/works`)

- Header with uppercase label + large heading + subtext
- Items grouped by year
- **Mobile**: card grid with 4:3 thumbnails, title, lead, tags
- **Desktop**: horizontal rows — year label (first item only), square thumbnail, title + lead + tags; separated by horizontal rules between years

#### Works detail (`/works/[slug]`)

- Back link → header with title, lead, date, tags
- Videos (VimeoPlayer embeds), then image gallery (2–3 column grid of clickable thumbnails → lightbox)
- Prose content + metadata sidebar (materials, partners, client) in a `1fr / 280px` grid on large screens
- Appearances list (bordered rows with occasion, place, date)

#### Consultancies listing (`/consultancies`)

- Wrapped in `.page-dark` for bureau palette
- Horizontal list rows: duotone thumbnail (grayscale + accent overlay → colour on hover), title, lead, client, date, arrow

#### Consultancies detail (`/consultancies/[slug]`)

- Wrapped in `.page-dark`
- Same structure as works detail but with client instead of tags, no appearances section

#### About / Contact

- Simple prose pages with `{@html}` rendered markdown
- Contact uses structured `dl` layout for address, phone, email, profiles, affiliations

### Interaction Patterns

All hover effects use Tailwind utilities inline:

| Effect             | CSS / class                                                  | Where used                         |
| ------------------ | ------------------------------------------------------------ | ---------------------------------- |
| Underline grow     | `.hover-line::after` width 0→100%                            | Links                              |
| Image scale        | `group-hover:scale-[1.04]`                                   | Gallery thumbnails                 |
| Row slide-in       | `transition-[padding-left] hover:pl-2`                       | Consultancy + appearance list rows |
| Arrow shift        | `group-hover:translate-x-1`                                  | List row arrows                    |
| Gap expand         | `transition-[gap] hover:gap-3`                               | "View all →" links                 |
| Grayscale → colour | `grayscale → group-hover:grayscale-0` + duotone overlay fade | Consultancy thumbnails             |
| Nav link colour    | `hover:text-[var(--color-accent)]`                           | Header links                       |

### Footer (`Footer.svelte`)

Minimal: copyright + GitHub and LinkedIn links. Centered on small screens, row layout on `sm:` and up. Adapts to bureau palette via `body.bureau` or `body:has(.page-dark)`.

### Technical Notes

- **CSS**: Tailwind CSS v4 with `@tailwindcss/vite` plugin, configured via `@theme` in `src/app.css`
- **Prose styles**: Global in `app.css` (`.prose` class) — serif font, responsive font size, styled headings/links/blockquotes. No separate dark variant needed (inherits palette tokens).
- **No scoped `<style>` blocks** — all styling via Tailwind utilities and global CSS in `app.css`
- **Mobile-first** with responsive breakpoints (`md:`, `lg:`, `sm:`)

- Writing style for work descriptions: Direct, Scandinavian, artist-driven tone. Avoid business jargon; focus on personal, technical, and collaborative aspects. Use clear, unembellished language reflecting the artist's perspective.

## Deployment (nas-sites pull-deploy)

The site is deployed under the [`den-frie-vilje/nas-sites`](https://github.com/den-frie-vilje/nas-sites) pull-deploy pattern. CI builds + Sigstore-cosign-signs the image; the NAS-side agent on Woody reconciles every ~5 min.

- **Container**: rootless `nginxinc/nginx-unprivileged:alpine` listening on port 8080 (no ports below 1024 for non-root)
- **Build**: pkgx-backed multi-stage build via `deploy/Dockerfile`; Node + pnpm versions sourced from `pkgx.yml` via `eval "$(pkgx dev --shellcode)" && dev on` — single source of truth, no inline pins
- **Front door**: per-site Caddy in the same compose project, listening on a per-(site,env) loopback port (denfrievilje uses 18082 staging / 18083 prod). DSM Web Station vhosts terminate TLS and proxy to the loopback port.
- **Apex routing**: a single image serves both `denfrievilje.dk` and `ole.kristensen.name` — JS palette-switches by hostname client-side. `deploy/Caddyfile.production` handles per-domain www→apex 301; no cross-apex redirect.
- **Cloudflare**: both apexes orange-clouded; the NAS agent purges both CF zones after each prod deploy via `CF_ZONE_IDS` plural in `sites.d/<domain>.production.env`.

### Local debugging

```sh
pkgx pnpm build
docker compose -f deploy/compose.staging.yml -f deploy/compose.local.yml up --build
# → http://localhost:8080
```

For per-site URL pattern, GitHub OAuth setup (n/a here — no editor), DSM Web Station vhost layout, and troubleshooting, see [DEPLOY.md](../DEPLOY.md).

## CI/CD (GitHub Actions)

Both workflows are thin callers of [`den-frie-vilje/nas-sites/.github/workflows/build-and-sign.yml@main`](https://github.com/den-frie-vilje/nas-sites/blob/main/.github/workflows/build-and-sign.yml).

| File                                       | Triggers           | Steps                                                                   |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| `.github/workflows/deploy-staging.yml`     | Push to `staging`  | Build → cosign-sign → push to GHCR; agent reconciles staging container  |
| `.github/workflows/deploy-production.yml`  | Push to `main`     | Same flow, with `PUBLIC_SHOW_PALETTE_TOGGLE=false`; agent reconciles prod |

No reviewer gate — the cryptographic gate is the cosign keyless signature itself, verified by the NAS agent before deploy.

## Documentation

Design rationale is recorded in `docs/design-decisions.md`. Content conventions in `docs/content-structure.md`. This file serves as the primary AI agent reference.
