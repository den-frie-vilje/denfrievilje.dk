import fs from 'fs';
import path from 'path';
import { error } from '@sveltejs/kit';
import sharp from 'sharp';
import type { RequestHandler } from './$types';

// Dev-only image proxy used by the picker UI. Reads a file from disk and
// streams a resized JPEG so the picker's thumbnail grid is light even when
// the source folder contains thousands of full-resolution photos. Mirrors
// the safe-path checks from the picker's +page.server.ts.

export const prerender = false;

const ALLOWED_PREFIXES = [
	process.env.HOME ? path.resolve(process.env.HOME) : null,
	'/Volumes'
].filter(Boolean) as string[];

function safeResolve(input: string): string {
	const resolved = path.resolve(input);
	if (!ALLOWED_PREFIXES.some((p) => resolved === p || resolved.startsWith(p + path.sep))) {
		throw error(400, 'path outside allowed roots');
	}
	return resolved;
}

export const GET: RequestHandler = async ({ url }) => {
	if (!import.meta.env.DEV) throw error(404, 'picker is dev-only');

	const raw = url.searchParams.get('path');
	if (!raw) throw error(400, 'missing ?path=');
	const filePath = safeResolve(raw);
	if (!fs.existsSync(filePath)) throw error(404, 'not found');

	const size = parseInt(url.searchParams.get('size') ?? '320', 10);
	const buf = await sharp(filePath)
		.rotate()
		.resize(Math.min(Math.max(size, 80), 1024), null, { withoutEnlargement: true })
		.jpeg({ quality: 70 })
		.toBuffer();

	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'no-store'
		}
	});
};
