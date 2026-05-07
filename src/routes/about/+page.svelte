<script lang="ts">
   import type { PageData } from './$types';
   import VoronoiGlass from '$lib/components/VoronoiGlass.svelte';
   import { getContext } from 'svelte';
   import SectionLabel from '$lib/components/SectionLabel.svelte';
   import PageTitle from '$lib/components/PageTitle.svelte';
   import type { ImageSrcSet } from '$lib/components/VoronoiGlass.svelte';
   import SEO from '$lib/components/SEO.svelte';
   import JsonLd from '$lib/components/JsonLd.svelte';
   import {
	   ORGANIZATION_ID,
	   ORGANIZATION_URL,
	   PERSON_ADDRESS,
	   PERSON_NAME,
	   PERSON_SAME_AS,
	   PERSON_URL
   } from '$lib/site';
   import { buildPersonJsonLd } from '$lib/person';

   let { data }: { data: PageData } = $props();
   const getBureau = getContext<() => boolean>('bureau');
   let bureau = $derived(getBureau ? getBureau() : false);

   // Single image srcset for VoronoiGlass
   const images: ImageSrcSet[] = [
	   {
		   sizes: [
			   { width: 480, url: '/content/about/ole-kristensen.jpg' },
			   { width: 960, url: '/content/about/ole-kristensen.jpg' },
			   { width: 1920, url: '/content/about/ole-kristensen.jpg' }
		   ]
	   }
   ];

   // Same Person JSON-LD as the homepage emits — same @id so Google links
   // them as one entity. The frontmatter `person:` block in this file is
   // the single source of truth.
   const personJsonLd = $derived(
	   buildPersonJsonLd(data.item.meta.person, {
		   personUrl: PERSON_URL,
		   organizationUrl: ORGANIZATION_URL,
		   organizationId: ORGANIZATION_ID,
		   name: PERSON_NAME,
		   sameAs: PERSON_SAME_AS,
		   address: PERSON_ADDRESS
	   })
   );
</script>

<SEO
	title="About"
	description={data.item.meta.description ?? data.item.meta.teaser}
	ogImage={data.item.meta.ogImage}
	ogType="profile"
/>
{#if personJsonLd}
	<JsonLd data={personJsonLd} />
{/if}


<article class="px-[var(--gutter)]">
   <header class="mx-auto max-w-[var(--max-w)] py-[clamp(3rem,6vw,6rem)]">
	   <SectionLabel class="mb-4">About</SectionLabel>
	   <PageTitle>{data.item.meta.title || 'About'}</PageTitle>
   </header>

   <section class="mx-auto max-w-[var(--max-w)] pb-[clamp(5rem,10vw,10rem)]">
	   <div class="flex flex-col md:flex-row gap-12">
		   <div class="prose max-w-[65ch] w-full md:w-2/3">
			   {@html data.item.html}
		   </div>
		   <aside class="w-full md:w-1/4 flex flex-col items-start mt-8 md:mt-0 md:ml-8">
			   <div class="w-full mb-6 aspect-[4/5] max-w-xs md:max-w-xs md:w-full">
				   <VoronoiGlass {images} cellCount={24} />
			   </div>
			   <h2 class="font-heading text-lg font-semibold mb-4">Downloads</h2>
			   <a href="/content/about/ole-kristensen-cv.pdf" class="mb-2 text-[var(--color-accent)] underline" download>Artist CV (PDF)</a>
			   <a href="/content/about/ole-kristensen-work-examples.pdf" class="mb-2 text-[var(--color-accent)] underline" download>Work Examples (PDF)</a>
		   </aside>
	   </div>
   </section>
</article>
