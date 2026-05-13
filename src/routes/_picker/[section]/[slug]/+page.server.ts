import fs from 'fs';
import path from 'path';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Dev-only gallery picker. Reads thumbnails from a user-provided source
// folder, displays them alongside the content folder's current photos, and
// lets the operator toggle inclusion. On save, files are copied into the
// content folder, deselected ones are removed, and the survivors are
// renumbered to preserve a sortable order.
//
// Filesystem-write side-effects must never ship — this whole tree is gated
// by `prerender = false` so it isn't baked into the static build, plus an
// import.meta.env.DEV check that throws 404 in production-mode dev servers.

export const prerender = false;
export const ssr = true;

const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp)$/i;
const THUMB_RE = /^(thumb|00\.thumb)\.(jpg|jpeg|png|gif|webp)$/i;
// We deliberately allow any absolute path the operator pastes in; a malicious
// PUBLIC URL could otherwise enumerate the filesystem. Reject anything
// outside the user's HOME or /Volumes to keep accidental browsing tight.
const ALLOWED_PREFIXES = [
	process.env.HOME ? path.resolve(process.env.HOME) : null,
	'/Volumes'
].filter(Boolean) as string[];

function assertDev() {
	if (!import.meta.env.DEV) throw error(404, 'picker is dev-only');
}

function safeResolve(input: string): string {
	const resolved = path.resolve(input);
	if (!ALLOWED_PREFIXES.some((p) => resolved === p || resolved.startsWith(p + path.sep))) {
		throw error(400, `path outside allowed roots (${ALLOWED_PREFIXES.join(', ')})`);
	}
	return resolved;
}

function listImagesIn(dir: string): { name: string; mtimeMs: number }[] {
	try {
		return fs
			.readdirSync(dir, { withFileTypes: true })
			.filter((d) => d.isFile() && IMAGE_RE.test(d.name) && !THUMB_RE.test(d.name))
			.map((d) => ({
				name: d.name,
				mtimeMs: fs.statSync(path.join(dir, d.name)).mtimeMs
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	} catch {
		return [];
	}
}

function listSubdirsIn(dir: string): string[] {
	try {
		return fs
			.readdirSync(dir, { withFileTypes: true })
			.filter((d) => d.isDirectory() && !d.name.startsWith('.'))
			.map((d) => d.name)
			.sort();
	} catch {
		return [];
	}
}

function findContentFolder(section: string, slug: string): string {
	const sectionDir = path.join(process.cwd(), 'src', 'content', section);
	if (!fs.existsSync(sectionDir)) throw error(404, `section not found: ${section}`);
	const match = fs
		.readdirSync(sectionDir)
		.find((name) => name === slug || name.replace(/^\d+\./, '') === slug);
	if (!match) throw error(404, `content item not found: ${section}/${slug}`);
	return path.join(sectionDir, match);
}

export const load: PageServerLoad = async ({ params, url }) => {
	assertDev();

	const contentDir = findContentFolder(params.section, params.slug);
	const selected = listImagesIn(contentDir).map((f) => ({
		name: f.name,
		url: `/content/${params.section}/${params.slug}/${f.name}`
	}));

	const sourceRaw = url.searchParams.get('source');
	let source: {
		path: string;
		parent: string | null;
		subdirs: string[];
		images: { name: string; url: string }[];
	} | null = null;

	if (sourceRaw) {
		const resolved = safeResolve(sourceRaw);
		const subdirs = listSubdirsIn(resolved);
		const images = listImagesIn(resolved).map((f) => ({
			name: f.name,
			// Routed through GET /_picker/raw/?path=... so the browser can <img> them
			// without us copying every potential candidate into /static first.
			url: `/_picker/raw?path=${encodeURIComponent(path.join(resolved, f.name))}`
		}));
		const parent = path.dirname(resolved);
		source = {
			path: resolved,
			parent: parent === resolved ? null : parent,
			subdirs,
			images
		};
	}

	return {
		section: params.section,
		slug: params.slug,
		contentDir,
		selected,
		source,
		allowedPrefixes: ALLOWED_PREFIXES
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		assertDev();
		const contentDir = findContentFolder(params.section, params.slug);

		const form = await request.formData();
		const addRaw = form.get('add');
		const keepRaw = form.get('keep');
		if (typeof addRaw !== 'string' || typeof keepRaw !== 'string') {
			return fail(400, { error: 'missing add/keep' });
		}

		// `add` is a newline-separated list of absolute source paths to copy in.
		// `keep` is a newline-separated, *ordered* list of existing-file names
		// to retain. Anything currently in contentDir not listed in `keep` is
		// removed. The combined survivors are then sequentially renumbered.
		const adds = addRaw.split('\n').map((s) => s.trim()).filter(Boolean);
		for (const a of adds) safeResolve(a);

		const keeps = keepRaw.split('\n').map((s) => s.trim()).filter(Boolean);

		const current = listImagesIn(contentDir).map((f) => f.name);
		const thumb = current.find((n) => THUMB_RE.test(n)); // preserve 00.thumb.jpg

		// Remove anything not in keep (and not the thumb)
		for (const name of current) {
			if (THUMB_RE.test(name)) continue;
			if (!keeps.includes(name)) {
				fs.unlinkSync(path.join(contentDir, name));
			}
		}

		// Stage 1: rename surviving files to a tmp prefix so the renumber pass
		// can use clean target names without collisions.
		const stage: { from: string; baseName: string }[] = [];
		for (let i = 0; i < keeps.length; i++) {
			const original = keeps[i];
			const tmp = `__staged_${i}__${original}`;
			fs.renameSync(path.join(contentDir, original), path.join(contentDir, tmp));
			stage.push({ from: tmp, baseName: original.replace(/^\d+\./, '') });
		}

		// Stage 2: copy in the new files with a tmp prefix
		const addStage: { from: string; baseName: string }[] = [];
		for (let i = 0; i < adds.length; i++) {
			const src = adds[i];
			const original = path.basename(src);
			const tmp = `__new_${i}__${original}`;
			fs.copyFileSync(src, path.join(contentDir, tmp));
			addStage.push({ from: tmp, baseName: original.replace(/^\d+\./, '') });
		}

		// Stage 3: sequential renumber. Selected order = staged order + newly
		// added order (appended at the end so the operator's existing ordering
		// is preserved across saves).
		let n = 1;
		for (const item of [...stage, ...addStage]) {
			const padded = String(n).padStart(2, '0');
			const target = `${padded}.${item.baseName}`;
			fs.renameSync(path.join(contentDir, item.from), path.join(contentDir, target));
			n++;
		}

		return {
			success: true,
			finalCount: stage.length + addStage.length,
			thumb: !!thumb
		};
	}
};
