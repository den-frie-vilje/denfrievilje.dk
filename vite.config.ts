import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

// Honour a PORT assigned by the environment (e.g. the Claude Code preview
// runner with `autoPort: true` in .claude/launch.json) so two checkouts can
// run side by side; fall back to Vite's defaults otherwise. Nothing in this
// site depends on a specific port — no OAuth callbacks, webhooks or CORS
// allow-lists — so a drifting port is harmless.
const envPort = Number(process.env.PORT) || undefined;

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: envPort ?? 5173,
		strictPort: false
	},
	preview: {
		port: envPort ?? 4173
	}
});
