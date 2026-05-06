import { getContentList } from '$lib/content';
import {
	SITE_URL,
	SITE_NAME_BUREAU,
	SITE_NAME_ARTIST,
	SITE_DESCRIPTION_BUREAU,
	SITE_DESCRIPTION_ARTIST,
	PRERENDER_BUREAU
} from '$lib/site';
import type { RequestHandler } from './$types';

export const prerender = true;

// Soft standard from llmstxt.org — markdown-ish file at /llms.txt that
// helps LLM crawlers (Claude, ChatGPT, Perplexity, etc.) understand what
// the site is and which pages matter. Per-host like /robots.txt and
// /sitemap.xml — the artist build emits Ole's identity, the bureau build
// emits Den Frie Vilje's, both pointing at their own canonical URLs.

function extractYear(date?: string): number {
	if (!date) return 0;
	const match = date.match(/(\d{4})/);
	return match ? parseInt(match[1], 10) : 0;
}

export const GET: RequestHandler = async () => {
	const [works, consultancies] = await Promise.all([
		getContentList('works'),
		getContentList('consultancies')
	]);

	works.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));
	consultancies.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));

	const name = PRERENDER_BUREAU ? SITE_NAME_BUREAU : SITE_NAME_ARTIST;
	const description = PRERENDER_BUREAU ? SITE_DESCRIPTION_BUREAU : SITE_DESCRIPTION_ARTIST;

	const lines: string[] = [];
	lines.push(`# ${name}`);
	lines.push('');
	lines.push(`> ${description}`);
	lines.push('');
	lines.push('## Pages');
	lines.push(
		`- [About](${SITE_URL}/about/): Ole Kristensen — visual artist, programmer and scenographer working at the intersection of art and software.`
	);
	lines.push(`- [Contact](${SITE_URL}/contact/): Studio contact details.`);
	lines.push(
		`- [Works](${SITE_URL}/works/): Index of interactive installations, live performances and software-driven artworks.`
	);
	lines.push(
		`- [Consultancies](${SITE_URL}/consultancies/): Index of design-technology projects for cultural and commercial clients.`
	);
	lines.push('');

	if (works.length > 0) {
		lines.push('## Works');
		for (const w of works) {
			const title = w.meta.title || w.slug;
			const lead = w.meta.description || w.meta.lead || '';
			const suffix = lead ? `: ${lead.replace(/\s+/g, ' ').trim()}` : '';
			lines.push(`- [${title}](${SITE_URL}/works/${w.slug}/)${suffix}`);
		}
		lines.push('');
	}

	if (consultancies.length > 0) {
		lines.push('## Consultancies');
		for (const c of consultancies) {
			const title = c.meta.title || c.slug;
			const lead = c.meta.description || c.meta.lead || '';
			const suffix = lead ? `: ${lead.replace(/\s+/g, ' ').trim()}` : '';
			lines.push(`- [${title}](${SITE_URL}/consultancies/${c.slug}/)${suffix}`);
		}
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
	});
};
