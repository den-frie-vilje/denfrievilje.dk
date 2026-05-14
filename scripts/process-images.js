#!/usr/bin/env node

/**
 * Image processing script: copies content images to static/ and generates thumbnails using sharp.
 * Run before dev/build: `node scripts/process-images.js`
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { pdf } from 'pdf-to-img';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');
const OUTPUT_DIR = path.join(process.cwd(), 'static', 'content');
const THUMB_SIZES = [480, 960, 1920];
const THUMB_QUALITY = 75;
// WebP at quality 80 lands at roughly 30% smaller than mozjpeg quality 75
// for visually equivalent output. Both formats are emitted so <picture>
// elements can serve WebP to capable browsers and fall back to JPEG.
const WEBP_QUALITY = 80;
const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp)$/i;
// Subfolder images (used by inline markdown refs only, not the gallery) may
// also be vector. SVGs aren't run through Sharp — they're copied verbatim and
// rendered by the browser at any size.
const SUBFOLDER_IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const DOCUMENT_RE = /\.(pdf|svg|doc|docx|txt|rtf|odt|epub)$/i;
const THUMB_RE = /^(thumb|00\.thumb)\.(jpg|jpeg|png|gif|webp)$/i;

function extractSlug(dirname) {
	const parts = dirname.split('.');
	const num = parseInt(parts[0], 10);
	return isNaN(num) ? dirname : parts.slice(1).join('.');
}

/**
 * Render a first-page thumbnail of a PDF at all THUMB_SIZES, in JPEG + WebP.
 * Output names follow `<basename>-thumb-<size>.<ext>` so they sit next to the
 * copied PDF in static/content/<section>/<slug>/ and are easy to resolve from
 * the content layer (see resolvePublications in src/lib/content.ts).
 *
 * Gated on mtime so re-running the script is cheap. Renders the first page
 * at scale 3 once, then downsizes with sharp — much faster than running
 * pdfjs three times.
 */
async function processPdfThumbnails(srcPath, destDir, basename) {
	const srcStat = fs.statSync(srcPath);
	const allFresh = THUMB_SIZES.every((size) => {
		const jpegDest = path.join(destDir, `${basename}-thumb-${size}.jpg`);
		const webpDest = path.join(destDir, `${basename}-thumb-${size}.webp`);
		return (
			fs.existsSync(jpegDest) &&
			fs.statSync(jpegDest).mtimeMs >= srcStat.mtimeMs &&
			fs.existsSync(webpDest) &&
			fs.statSync(webpDest).mtimeMs >= srcStat.mtimeMs
		);
	});
	if (allFresh) return;

	let firstPagePng;
	try {
		const document = await pdf(srcPath, { scale: 3 });
		firstPagePng = await document.getPage(1);
	} catch (err) {
		console.warn(`  ⚠ Failed to rasterise PDF ${srcPath}:`, err.message);
		return;
	}

	for (const size of THUMB_SIZES) {
		const jpegDest = path.join(destDir, `${basename}-thumb-${size}.jpg`);
		if (!fs.existsSync(jpegDest) || fs.statSync(jpegDest).mtimeMs < srcStat.mtimeMs) {
			try {
				await sharp(firstPagePng)
					.flatten({ background: '#ffffff' })
					.resize(size, null, { withoutEnlargement: true })
					.jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
					.toFile(jpegDest);
			} catch (err) {
				console.warn(`  ⚠ Failed to write ${jpegDest}:`, err.message);
			}
		}
		const webpDest = path.join(destDir, `${basename}-thumb-${size}.webp`);
		if (!fs.existsSync(webpDest) || fs.statSync(webpDest).mtimeMs < srcStat.mtimeMs) {
			try {
				await sharp(firstPagePng)
					.flatten({ background: '#ffffff' })
					.resize(size, null, { withoutEnlargement: true })
					.webp({ quality: WEBP_QUALITY })
					.toFile(webpDest);
			} catch (err) {
				console.warn(`  ⚠ Failed to write ${webpDest}:`, err.message);
			}
		}
	}
}

/**
 * Copy any images sitting in immediate subfolders of the content item's dir
 * (e.g. `setups/`) into a mirrored subfolder under static/content/.... These
 * are *inline* assets referenced from the markdown body (![](setups/01.x.jpg))
 * rather than gallery items, so they don't get thumbnails — only a verbatim
 * copy gated on mtime.
 */
function copySubfolderImages(srcDir, destDir) {
	for (const name of fs.readdirSync(srcDir)) {
		const subSrc = path.join(srcDir, name);
		if (!fs.statSync(subSrc).isDirectory()) continue;
		const subDest = path.join(destDir, name);
		fs.mkdirSync(subDest, { recursive: true });
		for (const f of fs.readdirSync(subSrc)) {
			if (!SUBFOLDER_IMAGE_RE.test(f) && !DOCUMENT_RE.test(f)) continue;
			const srcPath = path.join(subSrc, f);
			const destPath = path.join(subDest, f);
			const srcStat = fs.statSync(srcPath);
			if (!fs.existsSync(destPath) || fs.statSync(destPath).mtimeMs < srcStat.mtimeMs) {
				fs.copyFileSync(srcPath, destPath);
			}
		}
	}
}

async function processSection(section) {
	const sectionDir = path.join(CONTENT_DIR, section);
	if (!fs.existsSync(sectionDir)) return;

	const entries = fs.readdirSync(sectionDir).filter((name) => {
		return fs.statSync(path.join(sectionDir, name)).isDirectory();
	});

	for (const entry of entries) {
		const slug = extractSlug(entry);
		const srcDir = path.join(sectionDir, entry);
		const destDir = path.join(OUTPUT_DIR, section, slug);

		const files = fs.readdirSync(srcDir).filter((f) => IMAGE_RE.test(f));
		const docs = fs.readdirSync(srcDir).filter((f) => DOCUMENT_RE.test(f));
		if (files.length === 0 && docs.length === 0) continue;

		fs.mkdirSync(destDir, { recursive: true });

		copySubfolderImages(srcDir, destDir);

		// Copy documents — PDFs additionally get a first-page thumbnail at
		// all THUMB_SIZES so the publications block on detail pages can show
		// a preview without shipping the full file.
		for (const doc of docs) {
			const srcPath = path.join(srcDir, doc);
			const destPath = path.join(destDir, doc);
			const srcStat = fs.statSync(srcPath);
			if (!fs.existsSync(destPath) || fs.statSync(destPath).mtimeMs < srcStat.mtimeMs) {
				fs.copyFileSync(srcPath, destPath);
			}
			if (/\.pdf$/i.test(doc)) {
				const basename = doc.replace(/\.pdf$/i, '');
				await processPdfThumbnails(srcPath, destDir, basename);
			}
		}

		for (const file of files) {
			const srcPath = path.join(srcDir, file);
			const destPath = path.join(destDir, file);

			// Copy original if not already up to date
			const srcStat = fs.statSync(srcPath);
			if (!fs.existsSync(destPath) || fs.statSync(destPath).mtimeMs < srcStat.mtimeMs) {
				fs.copyFileSync(srcPath, destPath);
			}

			// Generate scaled thumbnails at all sizes — JPEG (fallback) +
			// WebP (preferred). Each format is gated independently on
			// mtime so editing the script can rebuild just one variant.
			if (THUMB_RE.test(file)) {
				for (const size of THUMB_SIZES) {
					const jpegDest = path.join(destDir, `thumb-${size}.jpg`);
					if (!fs.existsSync(jpegDest) || fs.statSync(jpegDest).mtimeMs < srcStat.mtimeMs) {
						try {
							await sharp(srcPath)
								.resize(size, null, { withoutEnlargement: true })
								.jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
								.toFile(jpegDest);
						} catch (err) {
							console.warn(
								`  ⚠ Failed to generate thumb-${size}.jpg for ${section}/${slug}/${file}:`,
								err.message
							);
						}
					}
					const webpDest = path.join(destDir, `thumb-${size}.webp`);
					if (!fs.existsSync(webpDest) || fs.statSync(webpDest).mtimeMs < srcStat.mtimeMs) {
						try {
							await sharp(srcPath)
								.resize(size, null, { withoutEnlargement: true })
								.webp({ quality: WEBP_QUALITY })
								.toFile(webpDest);
						} catch (err) {
							console.warn(
								`  ⚠ Failed to generate thumb-${size}.webp for ${section}/${slug}/${file}:`,
								err.message
							);
						}
					}
				}
			}
		}
	}
}

async function main() {
	console.log('Processing content images...');
	const start = Date.now();

	// Clean stale output (but re-create dir)
	// Don't remove — incremental updates are faster

	await processSection('works');
	await processSection('consultancies');
	await processSection('research');

	// Copy about images too
	const aboutDir = path.join(CONTENT_DIR, 'about');
	if (fs.existsSync(aboutDir)) {
		const aboutDest = path.join(OUTPUT_DIR, 'about');
		fs.mkdirSync(aboutDest, { recursive: true });
		for (const f of fs
			.readdirSync(aboutDir)
			.filter((f) => IMAGE_RE.test(f) || DOCUMENT_RE.test(f))) {
			const src = path.join(aboutDir, f);
			const dest = path.join(aboutDest, f);
			const srcStat = fs.statSync(src);
			if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < srcStat.mtimeMs) {
				fs.copyFileSync(src, dest);
			}
		}
	}

	const elapsed = Date.now() - start;
	console.log(`✓ Images processed in ${elapsed}ms`);
}

main().catch((err) => {
	console.error('Image processing failed:', err);
	process.exit(1);
});
