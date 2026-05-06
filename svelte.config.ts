import type { Config } from '@sveltejs/kit';
import adapter from '@sveltejs/adapter-static';

const config: Config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// SPA-fallback shell. The adapter-static docs explicitly say:
			// "you should avoid `index.html` where possible to avoid
			// conflicting with a prerendered homepage." `200.html` is the
			// documented convention, matches the skovby setup, and keeps
			// the prerendered `/` page at build/index.html where it belongs.
			fallback: '200.html',
			// Allow non-prerenderable routes if any get added later. Today
			// every route is prerendered via +layout.ts's prerender = true,
			// so this is defensive only.
			strict: false
		}),
		paths: {
			relative: false
		},
		prerender: {
			handleHttpError: ({ path }) => {
				if (path === '/favicon.png') return;
				throw new Error(`404 ${path}`);
			}
		}
	}
};

export default config;
