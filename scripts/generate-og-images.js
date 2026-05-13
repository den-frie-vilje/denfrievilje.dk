#!/usr/bin/env node

/**
 * Generate Open Graph (1200x630) images by screenshotting the SvelteKit
 * `/_og/...` routes:
 *   - default-artist.png   ← /_og/default/artist/
 *   - default-bureau.png   ← /_og/default/bureau/
 *   - works/<slug>.png     ← /_og/works/<slug>/
 *   - consultancies/<slug>.png ← /_og/consultancies/<slug>/
 *
 * The OG layouts live as Svelte components in src/lib/og/ — the script just
 * orchestrates Puppeteer + a Vite dev server. If a dev server is already
 * running on http://localhost:5173 (i.e. the user invoked `pnpm dev`), the
 * script reuses it; otherwise it spins one up in-process.
 *
 * Bump TEMPLATE_VERSION in src/lib/og/ components OR pass --force to
 * regenerate everything.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const STATIC_DIR = path.join(ROOT, 'static');
const OG_DIR = path.join(STATIC_DIR, 'og');
const VIEWPORT = { width: 1200, height: 630 };
const FORCE = process.argv.includes('--force');
const REUSE_PORT = 5173;
const SPAWN_PORT = 5183;

function extractSlug(dirname) {
	const parts = dirname.split('.');
	const num = parseInt(parts[0], 10);
	return isNaN(num) ? dirname : parts.slice(1).join('.');
}

function listSection(section) {
	const dir = path.join(CONTENT_DIR, section);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((name) => fs.statSync(path.join(dir, name)).isDirectory())
		.sort()
		.map((entry) => {
			const slug = extractSlug(entry);
			const folder = path.join(dir, entry);
			const mdPath = path.join(folder, 'index.md');
			if (!fs.existsSync(mdPath)) return null;
			const raw = fs.readFileSync(mdPath, 'utf8');
			const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
			const meta = m ? (yaml.load(m[1]) ?? {}) : {};
			const images = fs
				.readdirSync(folder)
				.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f) && !/^thumb|^00\.thumb/i.test(f))
				.sort();
			const heroImagePath = images.length ? path.join(folder, images[0]) : null;
			const sourceMtime = Math.max(
				fs.statSync(mdPath).mtimeMs,
				heroImagePath ? fs.statSync(heroImagePath).mtimeMs : 0
			);
			return { slug, meta, sourceMtime };
		})
		.filter(Boolean);
}

function needsRebuild(outPath, sourceMtime) {
	if (FORCE) return true;
	if (!fs.existsSync(outPath)) return true;
	return fs.statSync(outPath).mtimeMs < sourceMtime;
}

async function isServerLive(port) {
	try {
		const res = await fetch(`http://localhost:${port}/_og/default/artist/`, {
			signal: AbortSignal.timeout(2000)
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function withServer(fn) {
	if (await isServerLive(REUSE_PORT)) {
		console.log(`Reusing dev server on :${REUSE_PORT}`);
		return await fn(REUSE_PORT);
	}
	console.log(`Starting in-process Vite on :${SPAWN_PORT}`);
	const vite = await createServer({
		root: ROOT,
		server: { port: SPAWN_PORT, strictPort: true },
		logLevel: 'warn'
	});
	await vite.listen();
	try {
		// Wait until the dev server is actually responding.
		const start = Date.now();
		while (Date.now() - start < 30000) {
			if (await isServerLive(SPAWN_PORT)) break;
			await new Promise((r) => setTimeout(r, 250));
		}
		return await fn(SPAWN_PORT);
	} finally {
		await vite.close();
	}
}

async function shoot(page, url, outPath) {
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	await page.goto(url, { waitUntil: 'load', timeout: 20000 });
	await page.evaluate(() => document.fonts.ready);
	const frame = await page.$('.og-root > *');
	if (frame) {
		await frame.screenshot({ path: outPath, type: 'png' });
	} else {
		await page.screenshot({
			path: outPath,
			type: 'png',
			clip: { x: 0, y: 0, ...VIEWPORT }
		});
	}
}

async function main() {
	const start = Date.now();
	fs.mkdirSync(OG_DIR, { recursive: true });

	// Use the same source-mtime gating as scripts/process-images.js so the
	// step is incremental: regenerate only when the upstream content has
	// changed since the last successful render.
	const aboutMtime = fs.existsSync(path.join(CONTENT_DIR, 'about', 'ole-kristensen.jpg'))
		? fs.statSync(path.join(CONTENT_DIR, 'about', 'ole-kristensen.jpg')).mtimeMs
		: 0;
	const logoMtime = fs.existsSync(
		path.join(STATIC_DIR, 'images', 'logos', 'den frie vilje logo black.svg')
	)
		? fs.statSync(path.join(STATIC_DIR, 'images', 'logos', 'den frie vilje logo black.svg')).mtimeMs
		: 0;
	const componentMtime = Math.max(
		fs.statSync(path.join(ROOT, 'src', 'lib', 'og', 'ArtistOG.svelte')).mtimeMs,
		fs.statSync(path.join(ROOT, 'src', 'lib', 'og', 'BureauOG.svelte')).mtimeMs
	);

	const works = listSection('works');
	const consultancies = listSection('consultancies');
	const research = listSection('research');

	const jobs = [];
	// Output filenames are brand slugs (matching SITE_OG_* in src/lib/site.ts)
	// so the public asset URL never exposes the internal artist/bureau labels.
	const defaultArtistOut = path.join(OG_DIR, 'default-ole-kristensen.png');
	if (needsRebuild(defaultArtistOut, Math.max(aboutMtime, componentMtime))) {
		jobs.push({ url: '/_og/default/artist/', out: defaultArtistOut });
	}
	const defaultBureauOut = path.join(OG_DIR, 'default-den-frie-vilje.png');
	if (needsRebuild(defaultBureauOut, Math.max(logoMtime, componentMtime))) {
		jobs.push({ url: '/_og/default/bureau/', out: defaultBureauOut });
	}
	for (const item of works) {
		const out = path.join(OG_DIR, 'works', `${item.slug}.png`);
		if (needsRebuild(out, Math.max(item.sourceMtime, componentMtime))) {
			jobs.push({ url: `/_og/works/${item.slug}/`, out });
		}
	}
	for (const item of consultancies) {
		const out = path.join(OG_DIR, 'consultancies', `${item.slug}.png`);
		if (needsRebuild(out, Math.max(item.sourceMtime, componentMtime))) {
			jobs.push({ url: `/_og/consultancies/${item.slug}/`, out });
		}
	}
	for (const item of research) {
		const out = path.join(OG_DIR, 'research', `${item.slug}.png`);
		if (needsRebuild(out, Math.max(item.sourceMtime, componentMtime))) {
			jobs.push({ url: `/_og/research/${item.slug}/`, out });
		}
	}

	if (jobs.length === 0) {
		console.log('OG images up to date.');
		return;
	}

	console.log(`Generating ${jobs.length} OG image${jobs.length === 1 ? '' : 's'}…`);

	await withServer(async (port) => {
		const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
		try {
			const page = await browser.newPage();
			await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
			for (const job of jobs) {
				await shoot(page, `http://localhost:${port}${job.url}`, job.out);
				process.stdout.write('.');
			}
		} finally {
			await browser.close();
		}
	});

	const elapsed = Date.now() - start;
	console.log(`\n✓ OG images generated in ${elapsed}ms`);
}

main().catch((err) => {
	console.error('OG image generation failed:', err);
	process.exit(1);
});
