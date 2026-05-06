import { getContentList } from '$lib/content';
import { SITE_URL } from '$lib/site';
import type { RequestHandler } from './$types';

export const prerender = true;

const STATIC_PATHS = ['/', '/works/', '/consultancies/', '/about/', '/contact/'];

export const GET: RequestHandler = async () => {
	const [works, consultancies] = await Promise.all([
		getContentList('works'),
		getContentList('consultancies')
	]);

	const urls = [
		...STATIC_PATHS,
		...works.map((w) => `/works/${w.slug}/`),
		...consultancies.map((c) => `/consultancies/${c.slug}/`)
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((p) => `\t<url><loc>${SITE_URL}${p}</loc></url>`).join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
