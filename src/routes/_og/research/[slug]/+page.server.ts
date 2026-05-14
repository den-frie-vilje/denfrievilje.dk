import { error } from '@sveltejs/kit';
import { getContent } from '$lib/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const item = await getContent('research', params.slug);
	if (!item) throw error(404, 'research entry not found');
	const heroImage = item.images.gallery[0] ?? item.images.thumb ?? null;
	return {
		title: item.meta.title || params.slug,
		lead: item.meta.lead ?? null,
		heroImage
	};
};
