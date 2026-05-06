import type { Config } from '@sveltejs/kit';
import adapter from '@sveltejs/adapter-static';

// One repo → two prerendered trees (artist + bureau), driven by per-build
// env. `pnpm build:artist` and `pnpm build:bureau` set BUILD_OUTPUT_DIR to
// `build-artist` / `build-bureau`; the Dockerfile copies each tree to its
// own nginx root and a request-time X-Site-Mode header picks the right one.
const OUTPUT_DIR = process.env.BUILD_OUTPUT_DIR || 'build';

const config: Config = {
	kit: {
		adapter: adapter({
			pages: OUTPUT_DIR,
			assets: OUTPUT_DIR,
			// SPA-fallback shell. The adapter-static docs explicitly say:
			// "you should avoid `index.html` where possible to avoid
			// conflicting with a prerendered homepage." `200.html` is the
			// documented convention, matches the skovby setup, and keeps
			// the prerendered `/` page at build/index.html where it belongs.
			fallback: '200.html',
			// Allow non-prerenderable routes if any get added later. The
			// /_og/* tree is non-prerendered by design.
			strict: false
		}),
		paths: {
			relative: false
		},
		prerender: {
			// /sitemap.xml and /robots.txt are +server endpoints not linked
			// from any page, so the crawler won't reach them on its own —
			// list them explicitly.
			entries: ['*', '/sitemap.xml', '/robots.txt'],
			handleHttpError: ({ path }) => {
				if (path === '/favicon.png') return;
				throw new Error(`404 ${path}`);
			}
		}
	}
};

export default config;
