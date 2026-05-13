import { getContent } from '$lib/content';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const item = await getContent('works', params.slug);

	if (!item) {
		throw error(404, 'Work not found');
	}

	// If this work names a research umbrella, load it so the sidebar can
	// link back. Resolved at request time rather than at content-parse
	// time to keep cross-section coupling out of the content layer.
	const research = item.meta.research ? await getContent('research', item.meta.research) : null;

	return {
		item,
		slug: params.slug,
		research
	};
};
