import { getContentList, getContent, type Content } from '$lib/content';
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

// Pull a plain-text summary out of a section's index.md frontmatter.
// `lead` is the canonical one-liner; `teaser` is the legacy fallback used by
// about/index.md (where `lead` happens to contain HTML). Strip any tags so
// the output is always plain text — llms.txt is markdown for LLM crawlers,
// not HTML.
function sectionSummary(section: Content | null): string {
	const raw = section?.meta.lead ?? section?.meta.teaser ?? '';
	// Replace tags with a space first so adjacent text doesn't run together
	// (e.g. "electronics.<br />I work" → "electronics. I work"), then
	// collapse the resulting whitespace.
	return raw
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export const GET: RequestHandler = async () => {
	const [
		works,
		consultancies,
		research,
		aboutSection,
		contactSection,
		worksSection,
		consultanciesSection,
		researchSection
	] = await Promise.all([
		getContentList('works'),
		getContentList('consultancies'),
		getContentList('research'),
		getContent('about', ''),
		getContent('contact', ''),
		getContent('works', ''),
		getContent('consultancies', ''),
		getContent('research', '')
	]);

	works.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));
	consultancies.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));
	research.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));

	const name = PRERENDER_BUREAU ? SITE_NAME_BUREAU : SITE_NAME_ARTIST;
	const description = PRERENDER_BUREAU ? SITE_DESCRIPTION_BUREAU : SITE_DESCRIPTION_ARTIST;

	// Per-page suffixes come from each section's index.md `lead` — single
	// source of truth, edited where the content lives. If a section's lead
	// is missing this just omits the suffix instead of falling back to
	// hardcoded copy that would drift.
	const sectionLine = (label: string, slug: string, section: Content | null) => {
		const summary = sectionSummary(section);
		const suffix = summary ? `: ${summary}` : '';
		return `- [${label}](${SITE_URL}/${slug}/)${suffix}`;
	};

	const lines: string[] = [];
	lines.push(`# ${name}`);
	lines.push('');
	lines.push(`> ${description}`);
	lines.push('');
	lines.push('## Pages');
	lines.push(sectionLine('About', 'about', aboutSection));
	lines.push(sectionLine('Contact', 'contact', contactSection));
	lines.push(sectionLine('Works', 'works', worksSection));
	lines.push(sectionLine('Consultancies', 'consultancies', consultanciesSection));
	lines.push(sectionLine('Research', 'research', researchSection));
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

	if (research.length > 0) {
		lines.push('## Research');
		for (const r of research) {
			const title = r.meta.title || r.slug;
			const lead = r.meta.description || r.meta.lead || '';
			const suffix = lead ? `: ${lead.replace(/\s+/g, ' ').trim()}` : '';
			lines.push(`- [${title}](${SITE_URL}/research/${r.slug}/)${suffix}`);
		}
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
	});
};
