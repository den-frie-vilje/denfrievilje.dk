import { getContentList, getContent } from '$lib/content';
import type { PageServerLoad } from './$types';

function extractYear(date?: string): number {
	if (!date) return 0;
	const match = date.match(/(\d{4})/);
	return match ? parseInt(match[1], 10) : 0;
}

export const load: PageServerLoad = async () => {
	const items = await getContentList('research');
	const section = await getContent('research', '');

	items.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));

	const grouped: { year: number; items: typeof items }[] = [];
	for (const item of items) {
		const year = extractYear(item.meta.date);
		const existing = grouped.find((g) => g.year === year);
		if (existing) {
			existing.items.push(item);
		} else {
			grouped.push({ year, items: [item] });
		}
	}

	return {
		grouped,
		section,
		title: 'Research'
	};
};
