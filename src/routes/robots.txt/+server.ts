import { SITE_URL } from '$lib/site';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const body = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
};
