import { getContent, getContentList } from '$lib/content';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function extractYear(date?: string): number {
	if (!date) return 0;
	const match = date.match(/(\d{4})/);
	return match ? parseInt(match[1], 10) : 0;
}

export const load: PageServerLoad = async ({ params }) => {
	const item = await getContent('research', params.slug);

	if (!item) {
		throw error(404, 'Research entry not found');
	}

	// Cross-section: surface works (and consultancies) whose frontmatter
	// declares `research: <slug>` so the research detail page can show its
	// concrete outcomes alongside the publications.
	const [works, consultancies] = await Promise.all([
		getContentList('works'),
		getContentList('consultancies')
	]);
	const relatedWorks = works
		.filter((w) => w.meta.research === params.slug)
		.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));
	const relatedConsultancies = consultancies
		.filter((c) => c.meta.research === params.slug)
		.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));

	return {
		item,
		slug: params.slug,
		relatedWorks,
		relatedConsultancies
	};
};
