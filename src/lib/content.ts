import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import yaml from 'js-yaml';

export interface ContentMeta {
	title?: string;
	date?: string;
	lead?: string;
	tags?: string[];
	materials?: string;
	partners?: string;
	client?: string;
	github?: Record<string, string>;
	photocredits?: string;
	technologies?: string[];
	appearances?: Array<{ date: string; occasion: string; place: string; url: string }>;
	videos?: Array<{ id: string; title: string }>;

	// Optional SEO overrides — page-specific values that beat the auto-derived
	// defaults (which fall back to title/lead/first-gallery-image). Set in the
	// content's frontmatter when the on-page lead reads weirdly out of context,
	// or when the auto-picked OG hero crop is awkward at 1200×630.
	description?: string;
	ogImage?: string;
	keywords?: string[];

	[key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
			const html = await marked(body);
			const images = resolveImages(section, slug, item);

			results.push({
				meta,
				html,
				slug,
				images
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
		const html = await marked(body);

		return {
			meta,
			html,
			slug: extractSlug(section),
			images: { gallery: [], thumb: null, thumbSrcset: null, thumbSrcsetWebp: null }
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
	const html = await marked(body);
	const images = resolveImages(section, slug, folder);

	return {
		meta,
		html,
		slug,
		images
	};
}
