# Design Decisions

This document records the key architectural and design decisions made during the development of the Den Frie Vilje / Ole Kristensen portfolio website.

## Architecture

### Static Site Generation (SSG)

**Decision**: Use SvelteKit with `adapter-static` to produce a fully pre-rendered static site.

**Rationale**: The site is a portfolio/artwork showcase with content that changes infrequently. Static output means zero server infrastructure, instant page loads, and trivial deployment to any CDN or static host. All routes are pre-rendered at build time via `+layout.ts` setting `prerender = true`.

### Filesystem-Based Content

**Decision**: Store all content as Markdown files with YAML frontmatter in `src/content/`, using a directory naming convention inherited from the legacy Stacey CMS.

**Rationale**: Keeps content version-controlled alongside code, avoids external CMS dependencies, and lets the artist/author edit content with any text editor. The numeric prefix convention (`17.oresund`) provides explicit sort ordering while the slug portion becomes the URL path.

### Server-Only Content Loading

**Decision**: Content is loaded exclusively in `+page.server.ts` files using Node.js `fs`/`path` APIs, exposed via the `src/lib/content.ts` module.

**Rationale**: Since the site is fully pre-rendered, server-only data loading keeps the content parsing (YAML, Markdown) out of the client bundle entirely. The `content.ts` API (`getContentList()`, `getContent()`) provides a clean abstraction over the filesystem structure.

### Image Processing Pipeline

**Decision**: A custom Node.js script (`scripts/process-images.js`) copies content images to `static/content/` and generates 480px JPEG thumbnails using Sharp. Runs automatically before `dev` and `build`.

**Rationale**: Co-locating images with their content Markdown files improves authoring ergonomics but requires a build step to make them available as static assets. Sharp provides fast, high-quality thumbnail generation without external dependencies. The `static/content/` output is gitignored to avoid bloating the repository.

## Design System: "Gallery Neon"

### Two-Flavour Identity

**Decision**: A single codebase serves two visual identities — "White Room Gallery" (artist portfolio) and "Warm Bureau" (consultancy) — distinguished by palette tokens, not layout.

**Rationale**: The site represents both Ole Kristensen's personal artwork and his consultancy Den Frie Vilje. Rather than building two sites, a CSS custom property system switches between a light/neon-green artist palette and a dark/neon-yellow bureau palette. Both share typography, layout, and interaction patterns, keeping the codebase DRY.

### Palette Switching via CSS Custom Properties

**Decision**: Two mechanisms — `body.bureau` class (whole-site domain toggle) and `.page-dark` / `.page-light` wrapper divs (per-page overrides) — control palette. Footer adapts automatically via CSS `:has()`.

**Rationale**: In production, the domain (`ole.kristensen.name` vs `denfrievilje.dk`) determines the base palette. However, consultancy pages on the artist domain still need the bureau palette, hence per-page wrappers. Using `:has()` for footer adaptation avoids prop drilling and JavaScript coordination.

### OKLCH Colour Space with P3 Gamut

**Decision**: All colour tokens use OKLCH notation, with neon accents in the extended P3 gamut.

**Rationale**: OKLCH provides perceptually uniform lightness and chroma, making palette tweaks predictable. The P3 gamut enables genuinely vivid neon accents on supporting displays (most modern screens) while gracefully falling back on sRGB devices.

### Tailwind CSS v4 with No Scoped Styles

**Decision**: All styling uses Tailwind v4 utility classes inline in markup, with global styles only in `src/app.css`. No component-level `<style>` blocks.

**Rationale**: Tailwind v4's `@theme` block in `app.css` serves as the single source of truth for design tokens. Inline utilities keep styling co-located with markup, reducing context switching. The `@tailwindcss/vite` plugin eliminates configuration files. Global styles are reserved for prose rendering and animation keyframes that can't be expressed as utilities.

## Typography

### Three-Font System

**Decision**: Space Grotesk (headings/UI), DM Sans (body), Lora (prose/markdown content).

**Rationale**: Space Grotesk's geometric character suits the modern/technical identity. DM Sans at weight 300 provides excellent readability for body text. Lora adds warmth and readability to long-form prose content. All three are Google Fonts loaded in `app.html`, keeping the font stack free of self-hosting complexity.

## Interaction & Animation

### CSS-Only Scroll Animations

**Decision**: Use `animation-timeline: view()` behind a `@supports` query for scroll-driven fade-up effects.

**Rationale**: Progressive enhancement — browsers that support the API get smooth scroll animations, others get static content. No JavaScript animation library needed, reducing bundle size.

### VoronoiGlass Hero Component

**Decision**: Build a custom canvas-based Voronoi tessellation component for the hero section rather than using a static image or video.

**Rationale**: The component creates a distinctive, interactive first impression that showcases the artist's technical craft. Features include Lloyd-relaxed cell distribution, BFS wavefront crossfades, per-cell refraction effects, mouse/touch interaction, and device orientation tilt. Despite its complexity, it's a single self-contained Svelte component with no external dependencies.

### Hover Effects via Tailwind Utilities

**Decision**: All hover effects (underline grow, image scale, row slide-in, arrow shift, grayscale reveal) use inline Tailwind classes rather than CSS animations defined elsewhere.

**Rationale**: Keeps interaction behaviour visible in the markup, making it easy to understand and modify. Tailwind's `group-hover:` and `transition-*` utilities handle all common patterns without custom CSS.

## Infrastructure

### pkgx for Toolchain Management

**Decision**: All commands use `pkgx` as a prefix to manage Node.js and pnpm versions.

**Rationale**: Ensures consistent toolchain versions across developer machines without requiring global Node.js or pnpm installations. The `engines` field in `package.json` pins Node ~24.14.0 and pnpm ~10.30.3.

### Rootless Docker Deployment

**Decision**: Use a multi-stage Dockerfile with `nginx-unprivileged` (rootless) to serve the static build output.

**Rationale**: The static site can be served by any web server. Nginx is lightweight and well-understood. Using the rootless variant (`nginxinc/nginx-unprivileged`) follows security best practices by never running as root, compatible with container platforms that enforce non-root policies (Kubernetes, Cloud Run, etc.).

### GitHub Actions CI/CD

**Decision**: Automated CI pipeline that runs linting, type checking, and builds the Docker image on every push and PR.

**Rationale**: Catches regressions early, ensures the Docker image always builds successfully, and provides a clear path from commit to deployable artifact.

## Content Model

### Frontmatter-Driven Metadata

**Decision**: Rich metadata (title, date, lead, tags, materials, partners, client, videos, appearances) stored in YAML frontmatter rather than in a database or CMS.

**Rationale**: Keeps the content model simple, versionable, and editor-agnostic. The `ContentMeta` TypeScript interface in `content.ts` documents the expected fields. New metadata fields can be added without schema migrations.

### Section-Based Routing

**Decision**: Routes mirror the content directory structure — `/works/`, `/consultancies/`, `/about/`, `/contact/` — with collection pages grouping items by year.

**Rationale**: Intuitive URL structure that maps directly to the filesystem. Year grouping on collection pages provides temporal context without requiring a separate archive system.

### External Interactive Embeds via `embeds` Frontmatter

**Decision**: An interactive piece that lives on its own domain — first case: the [longing.gl](https://longing.gl/player/) full-year timelapse player on the _Longing – Fast Forward_ entry — is embedded with an `<iframe>` pointing at the live deployment, declared as `embeds: [{ url, title }]` in frontmatter and rendered by `EmbedFrame.svelte`. It is not vendored into this repo as a component or package.

**Rationale**: The player is a 1,500-line single SvelteKit route in its own repo, built around three full-viewport `<video>` buffers, `hls.js`, and a Vimeo-API source adapter with a build-time token. Importing it would mean a second copy of that bundle and that token in this site, and two places to keep in step every time the player changes. The live site already serves it behind Cloudflare with relative asset paths and no frame-blocking headers, so an iframe gives a single source of truth for free. `EmbedFrame.svelte` deliberately mirrors `VimeoPlayer.svelte` (same figure/aspect wrapper, same `allow` list) so the two read as one family on a detail page; the block renders before `videos` because the embed is the primary artefact and the Vimeo cuts document it. Host-side switches belong in the URL — the player grew a `?embed` mode (hides its own title and the mobile-app overlays) for exactly this use.
