/**
 * robots.txt, per-environment content prerendered at build time into each
 * identity tree (unlinked endpoint route, listed explicitly in
 * svelte.config.ts prerender.entries).
 *
 * Production builds (PUBLIC_ALLOW_INDEXING=true in .env.production) allow
 * crawling and advertise the per-identity sitemap: SITE_URL is baked per
 * build, so build-artist adverts ole.kristensen.name and build-bureau
 * adverts denfrievilje.dk.
 *
 * Staging and dev builds (PUBLIC_ALLOW_INDEXING=false in .env.staging and
 * .env.development) disallow everything and advertise no sitemap: the
 * staging origin serves duplicates of production content and must never
 * enter a search index. Belt and braces with the X-Robots-Tag header in
 * deploy/Caddyfile.staging; the baked file is the primary strap because it
 * deploys atomically with the image, the header is the backstop.
 *
 * `$env/static/public`, not dynamic: the value is sourced from the Vite
 * mode file at build time and a missing declaration fails the build loudly
 * instead of silently falling back. Fail-closed on top of that: only the
 * literal 'true' bakes the indexable variant.
 */
import { PUBLIC_ALLOW_INDEXING } from '$env/static/public';
import { SITE_URL } from '$lib/site';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const allowIndexing = PUBLIC_ALLOW_INDEXING === 'true';

	const body = allowIndexing
		? `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
		: `# Staging or development build, not intended for search engines.
User-agent: *
Disallow: /
`;
	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
};
