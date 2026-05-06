import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (params.mode !== 'artist' && params.mode !== 'bureau') {
		throw error(404, 'unknown mode');
	}
	return { mode: params.mode };
};
