import { getContentList } from '$lib/content';
import { SITE_URL, SITE_NAME_BUREAU, SITE_NAME_ARTIST, PRERENDER_BUREAU } from '$lib/site';
import type { RequestHandler } from './$types';

export const prerender = true;

// Atom feed of works, newest first. Per-host like the other endpoints —
// each build emits its identity's name and absolute URLs against its
// own canonical host. Discovered via <link rel="alternate"> in
// SEO.svelte; readers (Are.na, NetNewsWire, RSS aggregators) auto-fetch.

function extractYear(date?: string): number {
	if (!date) return 0;
	const match = date.match(/(\d{4})/);
	return match ? parseInt(match[1], 10) : 0;
}

function isoDate(date?: string): string {
	const year = extractYear(date);
	if (year > 0) return `${year}-01-01T00:00:00Z`;
	return new Date().toISOString();
}

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async () => {
	const works = await getContentList('works');
	works.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));

	const siteName = PRERENDER_BUREAU ? SITE_NAME_BUREAU : SITE_NAME_ARTIST;
	const feedUrl = `${SITE_URL}/works.xml`;
	const updated = works.length > 0 ? isoDate(works[0].meta.date) : new Date().toISOString();

	const entries = works
		.map((w) => {
			const url = `${SITE_URL}/works/${w.slug}/`;
			const title = escapeXml(w.meta.title || w.slug);
			const summary = escapeXml(w.meta.description || w.meta.lead || '');
			const published = isoDate(w.meta.date);
			return `\t<entry>
\t\t<title>${title}</title>
\t\t<link rel="alternate" type="text/html" href="${url}"/>
\t\t<id>${url}</id>
\t\t<updated>${published}</updated>
\t\t<published>${published}</published>${summary ? `\n\t\t<summary>${summary}</summary>` : ''}
\t</entry>`;
		})
		.join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
\t<title>${escapeXml(siteName)} — Works</title>
\t<link rel="self" type="application/atom+xml" href="${feedUrl}"/>
\t<link rel="alternate" type="text/html" href="${SITE_URL}/works/"/>
\t<id>${feedUrl}</id>
\t<updated>${updated}</updated>
\t<author>
\t\t<name>Ole Kristensen</name>
\t\t<uri>${SITE_URL}</uri>
\t</author>
${entries}
</feed>
`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' }
	});
};
