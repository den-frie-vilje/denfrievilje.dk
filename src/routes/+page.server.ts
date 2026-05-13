import { getContentList, getContent } from '$lib/content';
import type { PageServerLoad } from './$types';

function extractYear(date?: string): number {
	if (!date) return 0;
	const match = date.match(/(\d{4})/);
	return match ? parseInt(match[1], 10) : 0;
}

export const load: PageServerLoad = async () => {
	const works = await getContentList('works');
	const consultancies = await getContentList('consultancies');
	const research = await getContentList('research');

	const [worksSection, consultanciesSection, researchSection, aboutSection] = await Promise.all([
		getContent('works', ''),
		getContent('consultancies', ''),
		getContent('research', ''),
		getContent('about', '')
	]);

	// Sort newest first
	works.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));
	consultancies.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));
	research.sort((a, b) => extractYear(b.meta.date) - extractYear(a.meta.date));

	// Featured works: those tagged "Featured", sorted newest first
	const featuredWorks = works.filter((w) => w.meta.tags?.includes('Featured'));

	// Get top 3 featured for the selected works grid
	const featured = featuredWorks.slice(0, 3);

	// Hero slideshow images — from featured works
	const heroImages = featuredWorks
		.filter((w) => w.images.thumb)
		.map((w) => {
			const base = w.images.thumb!.replace('thumb-480.jpg', '');
			return {
				sizes: [
					{ width: 480, url: `${base}thumb-480.jpg` },
					{ width: 960, url: `${base}thumb-960.jpg` },
					{ width: 1920, url: `${base}thumb-1920.jpg` }
				]
			};
		});

	return {
		featured,
		heroImages,
		allWorks: works,
		consultancies,
		research,
		worksSection,
		consultanciesSection,
		researchSection,
		aboutSection
	};
};
