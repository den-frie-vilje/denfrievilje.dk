import { error } from '@sveltejs/kit';
import { getContent } from '$lib/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const item = await getContent('consultancies', params.slug);
	if (!item) throw error(404, 'consultancy not found');
	const heroImage = item.images.gallery[0] ?? item.images.thumb ?? null;
	const lead = item.meta.lead || (item.meta.client ? `For ${item.meta.client}` : null);
	return {
		title: item.meta.title || params.slug,
		lead,
		heroImage
	};
};
