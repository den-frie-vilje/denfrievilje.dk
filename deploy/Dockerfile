# Multi-stage Dockerfile — build tooling lives in the builder stage so CI
# only runs `docker build` + push + cosign sign. The reusable build-and-sign
# workflow in nas-sites stays framework-agnostic; this file owns the dev→image
# bridge for the den-frie-vilje / ole.kristensen.name SvelteKit static site.
#
# Stage 1: pkgx-backed builder — same Node + pnpm versions as local dev,
#          pinned inline at every `RUN pkgx ...` (see note on the FROM line
#          below for why pkgx.yml in the working dir is informational only).
# Stage 2: rootless nginx serving the built static output.

# ----- builder --------------------------------------------------
# pkgxdev/pkgx is the official image — pkgx pre-installed, glibc-based
# (pkgx needs glibc, Alpine's musl can't provide it without a compat layer).
#
# Version pinning lives in pkgx.yml — single source of truth across laptop
# dev and CI. The upstream pkgx Docker examples use inline pins per RUN
# (`pkgx +nodejs.org@25 +pnpm.io@10 pnpm …`) which we deliberately reject
# here: that pattern duplicates the version pins across pkgx.yml AND every
# RUN line, and a Node-or-pnpm bump becomes a multi-file refactor.
#
# Instead we use the `eval "$(pkgx dev --shellcode)" && dev on` activation
# pattern from the pkgx interactive-shell docs. `dev on` reads pkgx.yml
# from CWD and puts the right Node + pnpm onto PATH. Each RUN is a fresh
# shell so we re-activate per RUN, but the per-version downloads cached
# by the first activation stay on the layer fs — second/third activations
# are pure PATH manipulation.
FROM pkgxdev/pkgx:latest@sha256:a752ba83d58f0429a21e11206af5be562b44674e1ac0e97f9022ae150a1b6973 AS builder
WORKDIR /app

# pkgx dev shellcode is bash 4+ syntax; the pkgx image's default sh is
# dash. Make every RUN in this stage use bash so `eval "$(pkgx dev …)"`
# parses correctly.
SHELL ["/bin/bash", "-c"]

# pkgx.yml first — `dev on` reads from CWD. Layer caches until the version
# pins change, which is the right cache key.
COPY pkgx.yml ./

# Lockfile + workspace next so the deps-install layer caches until the
# lockfile changes. Source-only edits don't re-run pnpm install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN eval "$(pkgx dev --shellcode 2>/dev/null)" && dev on && \
    pnpm install --frozen-lockfile

# Source tree. Changes here bust the build layer but leave node_modules alone.
COPY . .

# Vite bakes build-time env vars into the client bundle. CI passes
# PUBLIC_GIT_SHA / PUBLIC_BUILD_TIME via --build-arg; PUBLIC_SHOW_PALETTE_TOGGLE
# is the staging-only flag that exposes the floating artist/bureau toggle in
# the built output (otherwise it's gated to dev-mode only). The ENV statements
# re-export them so `pnpm build` sees them as PUBLIC_*-prefixed vars that
# SvelteKit forwards to the client via $env/static/public.
#
# PUBLIC_SITE_HOST / PUBLIC_DOMAIN_MODE are NOT set here — `pnpm build` runs
# build:artist and build:bureau which inline their own values per build, so
# each output tree is self-consistent (canonical URL, og:url, sitemap host,
# JSON-LD url, etc. all match the build's target identity).
ARG VITE_MODE=production
ARG PUBLIC_GIT_SHA=
ARG PUBLIC_BUILD_TIME=
ARG PUBLIC_SHOW_PALETTE_TOGGLE=false
ENV PUBLIC_GIT_SHA=$PUBLIC_GIT_SHA
ENV PUBLIC_BUILD_TIME=$PUBLIC_BUILD_TIME
ENV PUBLIC_SHOW_PALETTE_TOGGLE=$PUBLIC_SHOW_PALETTE_TOGGLE

# Type check first — faster to fail here than in the (slower) Vite build.
# `pnpm build` produces two trees:
#   build-artist/  — PUBLIC_SITE_HOST=ole.kristensen.name PUBLIC_DOMAIN_MODE=artist
#   build-bureau/  — PUBLIC_SITE_HOST=denfrievilje.dk     PUBLIC_DOMAIN_MODE=bureau
# Both trees are copied into the runtime image; nginx picks the right root
# based on the X-Site-Mode request header (see deploy/nginx.conf).
RUN eval "$(pkgx dev --shellcode 2>/dev/null)" && dev on && \
    pnpm check
RUN eval "$(pkgx dev --shellcode 2>/dev/null)" && dev on && \
    pnpm build

# ----- runtime --------------------------------------------------
# nginxinc/nginx-unprivileged runs as UID 101 (nginx user), binds to
# port 8080. Caddy's upstream is `site:8080`.
#
# Rootless rationale: if this image is ever compromised (e.g. a malicious
# file in static/), a root-running nginx widens the blast radius. UID 101
# with no shell and no write access to /usr/share/nginx/html keeps damage
# contained.
FROM nginxinc/nginx-unprivileged:1.29-alpine@sha256:f35982400455b4f359083ba9d1ef573fbbe4221a6a8a194dc7a14beb4e2cd3dc

# Drop the distro's default config so our server block is the only one.
# Install wget — nginxinc/nginx-unprivileged is slim and doesn't ship it;
# the compose healthcheck (`wget --spider http://localhost:8080/`) needs it.
USER root
RUN rm /etc/nginx/conf.d/default.conf \
    && apk add --no-cache wget

# Site nginx config. Listens on 8080 — update the Caddyfile upstream
# (and compose healthchecks) if this ever changes. Maps X-Site-Mode →
# /usr/share/nginx/html/{ole-kristensen,den-frie-vilje}.
COPY --chown=nginx:nginx deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Prerendered SvelteKit output from the builder stage. Two trees, one per
# identity. nginx picks the right root from the X-Site-Mode request header
# set by the upstream proxy (DSM Web Station / Caddy).
COPY --from=builder --chown=nginx:nginx /app/build-artist/ /usr/share/nginx/html/ole-kristensen/
COPY --from=builder --chown=nginx:nginx /app/build-bureau/ /usr/share/nginx/html/den-frie-vilje/

# Drop privilege for the runtime — nginx-unprivileged binds :8080 as
# UID 101, no root needed at runtime.
USER nginx

# Container listens on 8080 (not 80) because nginx runs as a non-root user.
# Compose / Caddy target this port.
EXPOSE 8080
