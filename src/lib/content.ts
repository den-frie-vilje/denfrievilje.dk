import fs from 'fs';
import path from 'path';
import { marked, Renderer } from 'marked';
import yaml from 'js-yaml';

/**
 * Render markdown body with relative image hrefs (e.g. `setups/01.x.jpg`)
 * rewritten to the static asset URL for the item — so authors can drop
 * inline `![](setups/foo.jpg)` into the body without thinking about routes.
 * Absolute URLs and `http(s):` URLs are passed through untouched.
 */
async function renderBody(body: string, section: string, slug: string): Promise<string> {
	const renderer = new Renderer();
	const publicBase = `/content/${section}/${slug}`;
	const baseImage = renderer.image.bind(renderer);
	renderer.image = (token) => {
		const { href } = token;
		const rewritten =
			href.startsWith('/') || /^https?:\/\//i.test(href) ? href : `${publicBase}/${href}`;
		return baseImage({ ...token, href: rewritten });
	};
	return marked(body, { renderer });
}

export interface ContentMeta {
	title?: string;
	date?: string;
	lead?: string;
	tags?: string[];
	materials?: string;
	partners?: string;
	client?: string;
	// GitHub source-code references. Either a single `repo` (for one-repo
	// projects) or `repos` (an array, rendered as a list). `user` is the
	// owner/org and applies to all repos.
	github?: { user: string; repo?: string; repos?: string[] };
	photocredits?: string;
	technologies?: string[];
	appearances?: Array<{ date: string; occasion: string; place: string; url: string }>;
	videos?: Array<{ id: string; title: string }>;
	// External interactive embeds, rendered in an iframe on the detail page
	// (e.g. the live longing.gl player). `url` is the full iframe src — put any
	// host-side switches (like `?embed`) in the URL itself. Rendered BEFORE
	// `videos`: an embed is the primary artefact, the Vimeo entries are the
	// documentation of it. Mirrors VimeoPlayer.svelte via EmbedFrame.svelte.
	embeds?: Array<{ url: string; title?: string }>;

	// About-page sidebar lists. `stack` is the technology keyword chips a
	// recruiter scans for; `practice` is the cross-audience competency chips
	// (kind-of-work, not framework names); `currently` is a labelled
	// definition list of role-shape signals for active job-seeking;
	// `selectedWork` is a curated list of flagship projects with one-line
	// descriptions — what the body prose deliberately doesn't enumerate.
	// Together `stack + practice` are also used to derive the schema.org
	// `knowsAbout` for the Person JSON-LD — see the splice in getContent
	// below.
	stack?: string[];
	practice?: string[];
	currently?: Array<{ label: string; value: string }>;
	selectedWork?: Array<{ title: string; url: string; year?: string; body: string }>;

	// Curated publications co-located with the content folder. Each entry
	// points at a file in the same content/<section>/<slug>/ directory; the
	// build-time image script copies the file into static/content/... and
	// renders a first-page thumbnail. Optional fields drive the badge/byline
	// rendered alongside the download link on the detail page.
	publications?: Publication[];

	// Cross-section link: this work / consultancy is an outcome of the
	// research entry with this slug. The work detail page renders a
	// "Part of research" link in the sidebar; the research detail page
	// queries all works with this set and surfaces them below the gallery.
	// One-to-many: a research project has many works, a work has one
	// research umbrella (or none).
	research?: string;

	// Optional SEO overrides — page-specific values that beat the auto-derived
	// defaults (which fall back to title/lead/first-gallery-image). Set in the
	// content's frontmatter when the on-page lead reads weirdly out of context,
	// or when the auto-picked OG hero crop is awkward at 1200×630.
	description?: string;
	ogImage?: string;
	keywords?: string[];

	// Optional rich Person profile — single source of truth for schema.org
	// Person JSON-LD across home + about pages. Live in src/content/about/
	// because that's where the identity is documented; src/lib/person.ts
	// turns this shape into the JSON-LD payload.
	person?: PersonMeta;

	[key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface OrgRef {
	name: string;
	role?: string;
	url?: string;
	/** Wikidata Q-id (e.g. "Q1164334") — emitted as schema.org `sameAs` so
	 *  Google links the relationship to an established entity record. */
	wikidata?: string;
}

export interface PersonMeta {
	givenName?: string;
	familyName?: string;
	birthYear?: number | string;
	birthPlace?: string;
	nationality?: string;
	image?: string;
	jobTitle?: string[];
	worksFor?: Array<OrgRef & { since?: string | number }>;
	pastEmployer?: Array<OrgRef & { from?: string | number; to?: string | number }>;
	alumniOf?: Array<{
		name: string;
		department?: string;
		qualification?: string;
		from?: string | number;
		to?: string | number;
		wikidata?: string;
	}>;
	affiliation?: Array<OrgRef>;
	pastAffiliation?: Array<OrgRef & { from?: string | number; to?: string | number }>;
	memberOf?: Array<{ name: string; url?: string; wikidata?: string }>;
	awards?: Array<{
		title: string;
		organization?: string;
		year?: string | number;
		forWork?: string;
	}>;
	knowsAbout?: string[];
	knowsLanguage?: string[];
}

export interface Publication {
	title: string;
	file: string;
	year?: string | number;
	type?: string;
	author?: string;
	language?: string;
}

export interface ResolvedPublication extends Publication {
	url: string;
	thumb: string | null;
	thumbSrcset: string | null;
	thumbSrcsetWebp: string | null;
}

export interface ContentImages {
	/** Gallery images (excludes thumbs) */
	gallery: string[];
	/** Scaled thumbnail URL (thumb-480.jpg), or null */
	thumb: string | null;
	/** JPEG srcset string for all available thumb sizes (universal fallback) */
	thumbSrcset: string | null;
	/** WebP srcset string for the same sizes (preferred when supported) */
	thumbSrcsetWebp: string | null;
}

export interface Content {
	meta: ContentMeta;
	html: string;
	slug: string;
	images: ContentImages;
	publications: ResolvedPublication[];
}

/**
 * Parse markdown with YAML frontmatter
 */
function parseFrontmatter(content: string): { meta: ContentMeta; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!match) {
		return { meta: {}, body: content };
	}

	const [, frontmatter, body] = match;
	const meta = (yaml.load(frontmatter) as ContentMeta) || {};
	return { meta, body };
}

/**
 * Extract slug from folder name (removes numeric prefix)
 * e.g., "17.oresund" → "oresund"
 */
function extractSlug(dirname: string): string {
	const parts = dirname.split('.');
	const num = parseInt(parts[0], 10);
	return isNaN(num) ? dirname : parts.slice(1).join('.');
}

const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp)$/i;
const THUMB_RE = /^(thumb|00\.thumb)\.(jpg|jpeg|png|gif|webp)$/i;

/**
 * Resolve image URLs for a content item folder.
 */
function resolveImages(section: string, slug: string, folder: string): ContentImages {
	const itemDir = path.join(process.cwd(), 'src', 'content', section, folder);
	const publicBase = `/content/${section}/${slug}`;

	const allFiles = fs
		.readdirSync(itemDir)
		.filter((f) => IMAGE_RE.test(f))
		.sort();

	// Gallery = everything that isn't a thumb
	const gallery = allFiles.filter((f) => !THUMB_RE.test(f)).map((f) => `${publicBase}/${f}`);

	// Thumb: check for generated thumbnails in static/content
	const thumbPath = path.join(process.cwd(), 'static', 'content', section, slug, 'thumb-480.jpg');
	const thumb = fs.existsSync(thumbPath) ? `${publicBase}/thumb-480.jpg` : null;

	// Build per-format srcsets from available thumb sizes. Both JPEG and WebP
	// are emitted by scripts/process-images.js; the consumer (ResponsiveImage,
	// DuotoneImage) wraps them in <picture> with a WebP <source> and a JPEG
	// <img> fallback.
	const thumbSizes = [480, 960, 1920];
	const jpegParts: string[] = [];
	const webpParts: string[] = [];
	for (const size of thumbSizes) {
		const jpegOnDisk = path.join(
			process.cwd(),
			'static',
			'content',
			section,
			slug,
			`thumb-${size}.jpg`
		);
		if (fs.existsSync(jpegOnDisk)) {
			jpegParts.push(`${publicBase}/thumb-${size}.jpg ${size}w`);
		}
		const webpOnDisk = path.join(
			process.cwd(),
			'static',
			'content',
			section,
			slug,
			`thumb-${size}.webp`
		);
		if (fs.existsSync(webpOnDisk)) {
			webpParts.push(`${publicBase}/thumb-${size}.webp ${size}w`);
		}
	}
	const thumbSrcset = jpegParts.length > 0 ? jpegParts.join(', ') : null;
	const thumbSrcsetWebp = webpParts.length > 0 ? webpParts.join(', ') : null;

	return { gallery, thumb, thumbSrcset, thumbSrcsetWebp };
}

/**
 * Resolve frontmatter `publications:` entries to public URLs + thumbnail
 * srcsets. The actual files (PDFs etc.) are copied from src/content/ into
 * static/content/ by scripts/process-images.js, which also rasterises the
 * first page of each PDF to a thumbnail at the same sizes as image thumbs.
 */
function resolvePublications(
	section: string,
	slug: string,
	publications: Publication[]
): ResolvedPublication[] {
	const publicBase = `/content/${section}/${slug}`;
	const staticBase = path.join(process.cwd(), 'static', 'content', section, slug);
	const thumbSizes = [480, 960, 1920];

	return publications.map((pub) => {
		const base = pub.file.replace(/\.[^.]+$/, '');
		const jpegParts: string[] = [];
		const webpParts: string[] = [];
		for (const size of thumbSizes) {
			if (fs.existsSync(path.join(staticBase, `${base}-thumb-${size}.jpg`))) {
				jpegParts.push(`${publicBase}/${base}-thumb-${size}.jpg ${size}w`);
			}
			if (fs.existsSync(path.join(staticBase, `${base}-thumb-${size}.webp`))) {
				webpParts.push(`${publicBase}/${base}-thumb-${size}.webp ${size}w`);
			}
		}
		const thumb480 = path.join(staticBase, `${base}-thumb-480.jpg`);
		return {
			...pub,
			url: `${publicBase}/${pub.file}`,
			thumb: fs.existsSync(thumb480) ? `${publicBase}/${base}-thumb-480.jpg` : null,
			thumbSrcset: jpegParts.length > 0 ? jpegParts.join(', ') : null,
			thumbSrcsetWebp: webpParts.length > 0 ? webpParts.join(', ') : null
		};
	});
}

/**
 * Get all items in a section (works, consultancies, etc.)
 */
export async function getContentList(section: string): Promise<Content[]> {
	const contentDir = path.join(process.cwd(), 'src', 'content', section);

	if (!fs.existsSync(contentDir)) {
		return [];
	}

	const items = fs
		.readdirSync(contentDir)
		.filter((name) => {
			const stat = fs.statSync(path.join(contentDir, name));
			return stat.isDirectory();
		})
		.sort(); // Numeric prefixes sort naturally

	const results: Content[] = [];
	for (const item of items) {
		const mdPath = path.join(contentDir, item, 'index.md');
		if (fs.existsSync(mdPath)) {
			const slug = extractSlug(item);
			const content = fs.readFileSync(mdPath, 'utf8');
			const { meta, body } = parseFrontmatter(content);
			const html = await renderBody(body, section, slug);
			const images = resolveImages(section, slug, item);
			const publications = resolvePublications(section, slug, meta.publications ?? []);

			results.push({
				meta,
				html,
				slug,
				images,
				publications
			});
		}
	}

	return results;
}

/**
 * Get a single content item by slug
 */
export async function getContent(section: string, slug: string): Promise<Content | null> {
	const contentDir = path.join(process.cwd(), 'src', 'content', section);

	if (!fs.existsSync(contentDir)) {
		return null;
	}

	// If slug is empty or matches section (for single pages like "about"), load directly
	if (!slug || slug === section || slug === extractSlug(section)) {
		const mdPath = path.join(contentDir, 'index.md');

		if (!fs.existsSync(mdPath)) {
			return null;
		}

		const content = fs.readFileSync(mdPath, 'utf8');
		const { meta, body } = parseFrontmatter(content);
		const html = await renderBody(body, section, extractSlug(section));

		// Consolidate the top-level sidebar lists into the Person JSON-LD's
		// `knowsAbout`. Single source of truth: edit `stack` / `practice` in
		// frontmatter, and both the rendered sidebar pills and the structured
		// data stay in sync. No-op when neither list is present.
		if (meta.person && (meta.stack?.length || meta.practice?.length)) {
			meta.person.knowsAbout = [...(meta.stack ?? []), ...(meta.practice ?? [])];
		}

		return {
			meta,
			html,
			slug: extractSlug(section),
			images: { gallery: [], thumb: null, thumbSrcset: null, thumbSrcsetWebp: null },
			publications: []
		};
	}

	// Otherwise find folder that matches slug (after removing numeric prefix)
	const dirs = fs.readdirSync(contentDir).filter((name) => {
		const stat = fs.statSync(path.join(contentDir, name));
		return stat.isDirectory() && extractSlug(name) === slug;
	});

	if (dirs.length === 0) {
		return null;
	}

	const folder = dirs[0];
	const mdPath = path.join(contentDir, folder, 'index.md');

	if (!fs.existsSync(mdPath)) {
		return null;
	}

	const content = fs.readFileSync(mdPath, 'utf8');
	const { meta, body } = parseFrontmatter(content);
	const html = await renderBody(body, section, slug);
	const images = resolveImages(section, slug, folder);
	const publications = resolvePublications(section, slug, meta.publications ?? []);

	return {
		meta,
		html,
		slug,
		images,
		publications
	};
}
