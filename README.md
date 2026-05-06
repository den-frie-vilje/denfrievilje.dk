# Den Frie Vilje / Ole Kristensen

Portfolio and artwork website for **Ole Kristensen**, doubling as the showcase for his design-technology consultancy **Den Frie Vilje**. Built as a fully pre-rendered static site with **Svelte 5**, **SvelteKit 2**, **Tailwind CSS v4**, and **TypeScript**.

The same codebase serves two visual identities — a light "White Room Gallery" palette (neon green accent) for the artist portfolio and a dark "Warm Bureau" palette (neon yellow accent) for the consultancy — switched by domain or per-page context.

## Quick Start

### Prerequisites

- [pkgx](https://pkgx.sh/) — manages Node.js and pnpm automatically

### Commands

```sh
pkgx pnpm install          # install dependencies
pkgx pnpm dev              # dev server at http://localhost:5173
pkgx pnpm build            # static build → build/
pkgx pnpm preview          # preview the production build
pkgx pnpm check            # svelte-check + tsc
pkgx pnpm lint             # eslint + prettier check
pkgx pnpm format           # auto-format code
pkgx pnpm test:e2e         # vitest E2E smoke tests against dev server
```

Image processing (`scripts/process-images.js`) runs automatically before `dev` and `build` — it copies images from `src/content/` to `static/content/` and generates 480px thumbnails via Sharp.

## Project Structure

```
src/
├── app.html                        # HTML shell (Google Fonts, meta)
├── app.css                         # Tailwind @theme tokens, global styles
├── content/                        # Markdown content (YAML frontmatter)
│   ├── works/                      # Art portfolio items
│   ├── consultancies/              # Bureau project items
│   ├── about/                      # About page
│   └── contact/                    # Contact page
├── lib/
│   ├── content.ts                  # Content API (getContentList, getContent)
│   └── components/                 # Svelte components
│       ├── Header.svelte           # Fixed nav + mobile menu
│       ├── Footer.svelte           # Copyright + social links
│       ├── Hero.svelte             # Two-variant hero (artist/bureau)
│       ├── VoronoiGlass.svelte     # Interactive canvas tessellation
│       └── VimeoPlayer.svelte      # Responsive Vimeo embeds
└── routes/
    ├── +layout.svelte              # App shell (Header/Footer, domain toggle)
    ├── +layout.ts                  # prerender = true
    ├── +page.server.ts             # Home page data loader
    ├── +page.svelte                # Home page layout
    ├── works/                      # /works collection + /works/[slug]
    ├── consultancies/              # /consultancies collection + detail
    ├── about/                      # /about single page
    └── contact/                    # /contact single page

scripts/
└── process-images.js               # Image copy + thumbnail generation

docs/
├── design-decisions.md             # Architectural & design rationale
├── agent-knowledge.md              # AI agent knowledge base
└── content-structure.md            # Content directory conventions

test/
└── e2e/app.e2e.ts                  # E2E smoke tests (vitest)
```

## Content System

Content lives in `src/content/{section}/{N.slug}/index.md`:

- Sections: `works/`, `consultancies/`, `about/`, `contact/`
- Numeric prefix controls sort order (e.g. `17.oresund`) — stripped to derive URL slug
- Images co-located alongside `index.md`, processed to `static/content/` at build time
- Frontmatter fields: `title`, `date`, `lead`, `tags[]`, `materials`, `partners`, `client`, `videos[]`, `appearances[]`, etc.

See [docs/content-structure.md](docs/content-structure.md) for full details.

## Design System

The "Gallery Neon" design system uses:

- **OKLCH colours** in extended P3 gamut for vivid neon accents
- **Three fonts**: Space Grotesk (headings/UI), DM Sans (body), Lora (prose)
- **Responsive layout** tokens via CSS custom properties (`--max-w`, `--gutter`, `--nav-h`)
- **CSS-only scroll animations** using `animation-timeline: view()` with progressive enhancement
- **Interactive VoronoiGlass hero** — canvas-based Voronoi tessellation with BFS crossfades, mouse/touch interaction, device tilt

See [docs/design-decisions.md](docs/design-decisions.md) for rationale and [docs/agent-knowledge.md](docs/agent-knowledge.md) for the full reference.

## Deployment

The site runs as a Docker container on Synology DSM (NAS host: Woody) under the [`den-frie-vilje/nas-sites`](https://github.com/den-frie-vilje/nas-sites) pull-deploy pattern. CI builds + Sigstore-cosign-signs the image; the NAS-side agent pulls, verifies the signature, and reconciles every ~5 min.

See [DEPLOY.md](DEPLOY.md) for the full per-site overlay (URL pattern, GitHub workflows, dual-apex specifics, troubleshooting).

For local-stack debugging:

```sh
pkgx pnpm build
docker compose -f deploy/compose.staging.yml -f deploy/compose.local.yml up --build
# → http://localhost:8080
```

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow                  | Trigger             | What it does                                                                          |
| ------------------------- | ------------------- | ------------------------------------------------------------------------------------- |
| `deploy-staging.yml`      | Push to `staging`   | Build → cosign-sign → push to GHCR; agent reconciles staging container within ~5 min  |
| `deploy-production.yml`   | Push to `main`      | Same flow, with `PUBLIC_SHOW_PALETTE_TOGGLE=false`; agent reconciles production       |

Both workflows are thin callers of [`den-frie-vilje/nas-sites/.github/workflows/build-and-sign.yml@main`](https://github.com/den-frie-vilje/nas-sites/blob/main/.github/workflows/build-and-sign.yml). No reviewer gate — the cryptographic gate is the cosign keyless signature itself, verified by the NAS agent before deploy.

## Tech Stack

| Technology   | Version      | Purpose                                                    |
| ------------ | ------------ | ---------------------------------------------------------- |
| Svelte       | 5            | UI framework (runes: `$props()`, `$state()`, `$derived()`) |
| SvelteKit    | 2            | Routing, SSG via `adapter-static`                          |
| Tailwind CSS | 4            | Utility-first styling, `@tailwindcss/vite` plugin          |
| TypeScript   | 5            | Type safety throughout                                     |
| Sharp        | 0.34         | Image thumbnail generation                                 |
| Marked       | 17           | Markdown → HTML                                            |
| js-yaml      | 4            | YAML frontmatter parsing                                   |
| Vite         | 5            | Build tooling                                              |
| Vitest       | 1            | Testing                                                    |
| Nginx        | unprivileged | Production static serving                                  |

## License

© Ole Kristensen

## Technology Stack

- **Svelte 5** - Latest reactive framework
- **SvelteKit** - Full-featured framework with routing
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Static Adapter** - Pre-renders to fully static HTML/CSS/JS

## Static Adapter

This project uses `@sveltejs/adapter-static` to generate a fully static site with no server-side requirements. Perfect for hosting on any static hosting service (GitHub Pages, Netlify, Vercel, etc.).

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Compile to static site
- `pnpm preview` - Preview production build
- `pnpm check` - Run type checking
- `pnpm check:watch` - Watch mode for type checking
- `pnpm lint` - Lint code
- `pnpm format` - Format code
