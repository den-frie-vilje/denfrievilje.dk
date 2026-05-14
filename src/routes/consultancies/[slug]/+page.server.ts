import { getContent } from '$lib/content';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const item = await getContent('consultancies', params.slug);

	if (!item) {
		throw error(404, 'Consultancy not found');
	}

	const research = item.meta.research ? await getContent('research', item.meta.research) : null;

	return {
		item,
		slug: params.slug,
		research
	};
};
