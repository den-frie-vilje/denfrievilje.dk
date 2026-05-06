# SEO

This page records the SEO architecture choices made for the site. The user-facing goal is "be discoverable and look right when shared"; the engineering goal is "do that without scattering metadata logic across every page".

## Dual-origin: one repo, two builds, header-routed at the edge

The site lives at two apexes — `denfrievilje.dk` (Den Frie Vilje, the bureau identity) and `ole.kristensen.name` (Ole Kristensen, the artist identity). Both must rank independently in search, so each origin needs its own canonical URL, its own `og:url`, its own `og:site_name`, its own sitemap, and its own robots.txt.

The chosen pattern is **two static prerenders, one image, header-based selection at nginx**:

- `pnpm build:artist` runs Vite with `PUBLIC_SITE_HOST=ole.kristensen.name PUBLIC_DOMAIN_MODE=artist BUILD_OUTPUT_DIR=build-artist`.
- `pnpm build:bureau` runs Vite with `PUBLIC_SITE_HOST=denfrievilje.dk PUBLIC_DOMAIN_MODE=bureau BUILD_OUTPUT_DIR=build-bureau`.
- `pnpm build` runs `prebuild` (process-images + OG generation, both shared between builds) then both per-mode builds.
- The Docker image copies both trees side-by-side: `/usr/share/nginx/html/ole-kristensen/` and `/usr/share/nginx/html/den-frie-vilje/`.
- `deploy/nginx.conf` uses a `map $http_x_site_mode $site_root` directive: header `X-Site-Mode: artist` selects the artist tree; anything else (including no header) falls back to the bureau tree.
- The upstream proxy (DSM Web Station vhost for `ole.kristensen.name`, plus any staging URL operating in artist mode) injects `X-Site-Mode: artist`. Production `denfrievilje.dk` and `www.denfrievilje.dk` send no header → bureau.
- `Vary: X-Site-Mode` is emitted on responses so any intermediate cache keys correctly per identity.

Per-build outputs are gitignored (`build-artist/`, `build-bureau/`).

### What's correctly different per origin

| | `ole.kristensen.name` | `denfrievilje.dk` |
|---|---|---|
| `<title>` | `… — Ole Kristensen` | `… — Den Frie Vilje` |
| `<meta name="description">` | artist copy | bureau copy |
| `<link rel="canonical">` | `https://ole.kristensen.name/...` | `https://denfrievilje.dk/...` |
| `og:url`, `og:site_name`, `og:locale` | artist | bureau |
| Default `og:image` | `/og/default-ole-kristensen.png` | `/og/default-den-frie-vilje.png` |
| `/sitemap.xml` URLs | artist host | bureau host |
| `/robots.txt` `Sitemap:` line | artist host | bureau host |
| `<body class>` | `artist` | `bureau` (drives palette switch in `app.css`) |

Per-page OG (works/consultancies) is shared across both origins — the visual style there is content-type, not origin.

## Single source of truth

All site identity strings (URL, names, descriptions, OG image paths, Person/Organization JSON-LD) live in [`src/lib/site.ts`](../src/lib/site.ts). The two key constants are read from `$env/static/public`:

- `PUBLIC_SITE_HOST` → `SITE_URL = https://${HOST}` (default `denfrievilje.dk`)
- `PUBLIC_DOMAIN_MODE` → `PRERENDER_BUREAU = mode !== 'artist'` (default bureau)

Pages and the SEO component import from this module — there are no hard-coded host strings in route files.

## Reusable SEO component

[`src/lib/components/SEO.svelte`](../src/lib/components/SEO.svelte) emits, in one place:

- `<title>`, `<meta name="description">`, `<link rel="canonical">`
- Open Graph (`og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:site_name`, `og:locale`)
- Twitter Card (`summary_large_image`)
- Optional `<meta name="robots" content="noindex,nofollow">` when `noindex` is passed

Pages render `<SEO ... />` with whatever per-page overrides they have. Defaults fall back to identity-aware site name/description via the `bureau` context already used elsewhere in the app.

Canonical URL is composed from `SITE_URL + page.url.pathname`. SvelteKit's `trailingSlash: 'always'` setting makes those URLs stable.

## JSON-LD

[`src/lib/components/JsonLd.svelte`](../src/lib/components/JsonLd.svelte) wraps `JSON.stringify` with U+003C escaping so a stray closing-script literal in a string field cannot break out of the surrounding `<script type="application/ld+json">`. The data prop is `$derived` so it stays reactive across client-side navigation.

What we emit:

- **Home**: `Person` (Ole) + `Organization` (Den Frie Vilje ApS) on the same page.
- **`/works/[slug]/`**: `CreativeWork` (with title, lead, dateCreated, image, keywords, creator) + `BreadcrumbList`.
- **`/consultancies/[slug]/`**: `CreativeWork` (with optional `sourceOrganization` from the client field) + `BreadcrumbList`.

`Person`/`Organization` are heaviest on the home page because that's where AI Overviews and Google Knowledge Panels typically lift them from.

## Sitemap and robots

Both are SvelteKit endpoints with `prerender = true` so each build's tree gets its own host-correct copy:

- [`src/routes/robots.txt/+server.ts`](../src/routes/robots.txt/+server.ts) — emits `Sitemap: ${SITE_URL}/sitemap.xml`.
- [`src/routes/sitemap.xml/+server.ts`](../src/routes/sitemap.xml/+server.ts) — walks `getContentList('works'|'consultancies')` plus the static paths, emits absolute URLs against `SITE_URL`.

Both are listed in `kit.prerender.entries` in [`svelte.config.ts`](../svelte.config.ts) because no page links to them; without those entries, adapter-static's crawler wouldn't hit them.

## Open Graph images

OG images are rendered as **Svelte components**, not as inline HTML strings in the build script. The pipeline:

1. Layouts live in [`src/lib/og/ArtistOG.svelte`](../src/lib/og/ArtistOG.svelte) and [`src/lib/og/BureauOG.svelte`](../src/lib/og/BureauOG.svelte). They use the same Google Fonts and brand colours as the rest of the site.
2. SvelteKit routes under [`src/routes/_og/`](../src/routes/_og/) render those components with content loaded server-side from `src/content/`. The branch sets `prerender = false` and `csr = false`, so it doesn't ship in the static build but is reachable on the dev server.
3. The root layout detects `_og/*` URLs and skips Header/Footer/palette toggle, so the screenshot captures only the OG layout.
4. [`scripts/generate-og-images.js`](../scripts/generate-og-images.js) launches Puppeteer, reuses an existing dev server on `:5173` if one is running, otherwise spins up Vite in-process, then visits each `/_og/...` URL and screenshots `.og-root > *` at 1200×630.

Outputs land in `static/og/` (gitignored) and are referenced as `/og/default-artist.png`, `/og/default-bureau.png`, `/og/works/<slug>.png`, `/og/consultancies/<slug>.png`. The `<SEO>` default-OG resolution is identity-aware: artist mode → `/og/default-artist.png`, bureau mode → `/og/default-bureau.png`.

The script uses mtime-based incremental rebuilds keyed on `(content mtime, OG component mtime)`, so editing `ArtistOG.svelte` invalidates all artist outputs without needing a manual flag. Pass `--force` to bypass the cache.

## Why drive the dev server with Puppeteer instead of generating HTML in Node

A previous iteration of `generate-og-images.js` shipped ~150 lines of inline HTML/CSS template strings. Two problems with that:

1. The brand styling (colours, fonts, spacing tokens) lived in two places — `app.css` for the site, the script for OG — and would drift.
2. Editing the layout meant editing JavaScript template literals instead of `.svelte` files, with no Svelte tooling support.

Driving SvelteKit routes with Puppeteer keeps the layouts in normal `.svelte` files with normal Svelte/Tailwind tooling, and makes the script a thin orchestrator instead of the source of truth for visual design.

## What's not done (yet)

- `llms.txt` for AI crawlers — opportunistic, easy to add later.
- Per-page OG generation for `/about`, `/contact`, listing pages — currently those use the identity defaults.
- Lighthouse / Core Web Vitals tuning beyond what SvelteKit + adapter-static give for free.
- Validation of the generated JSON-LD against schema.org's tester (https://validator.schema.org).
