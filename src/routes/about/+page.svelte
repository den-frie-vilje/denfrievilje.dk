<script lang="ts">
   import type { PageData } from './$types';
   import VoronoiGlass from '$lib/components/VoronoiGlass.svelte';
   import LSystemTree from '$lib/components/LSystemTree.svelte';
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

   <section class="about-section mx-auto max-w-[var(--max-w)] pb-0">
	   <div class="about-grid">
		   <div class="area-prose prose max-w-[65ch]">
			   {@html data.item.html}
		   </div>
		   <aside class="area-aside flex flex-col items-start">
			   <div class="w-full mb-8 aspect-[4/5] max-w-xs md:max-w-xs md:w-full">
				   <VoronoiGlass {images} cellCount={24} />
			   </div>

			   {#if data.item.meta.stack?.length}
				   <div class="mb-8 w-full">
					   <SectionLabel tag="h3" class="mb-3">Stack</SectionLabel>
					   <p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">
						   {data.item.meta.stack.join(' · ')}
					   </p>
				   </div>
			   {/if}

			   {#if data.item.meta.practice?.length}
				   <div class="mb-8 w-full">
					   <SectionLabel tag="h3" class="mb-3">Practice</SectionLabel>
					   <p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">
						   {data.item.meta.practice.join(' · ')}
					   </p>
				   </div>
			   {/if}

			   {#if data.item.meta.selectedWork?.length}
				   <div class="mb-8 w-full">
					   <SectionLabel tag="h3" class="mb-3">Selected work</SectionLabel>
					   <ul class="space-y-3 text-[0.85rem] leading-relaxed">
						   {#each data.item.meta.selectedWork as item}
							   <li>
								   <a href={item.url} class="text-[var(--color-accent)] underline underline-offset-2">{item.title}</a>{#if item.year}<span class="text-[var(--color-ink-secondary)]">&nbsp;({item.year})</span>{/if}
								   <p class="text-[var(--color-ink-secondary)]">{item.body}</p>
							   </li>
						   {/each}
					   </ul>
				   </div>
			   {/if}

			   {#if data.item.meta.currently?.length}
				   <div class="mb-8 w-full">
					   <SectionLabel tag="h3" class="mb-3">Currently</SectionLabel>
					   <dl class="space-y-2 text-[0.85rem]">
						   {#each data.item.meta.currently as { label, value }}
							   <div>
								   <dt class="text-[0.7rem] uppercase tracking-wider text-[var(--color-ink-secondary)]">{label}</dt>
								   <dd>{value}</dd>
							   </div>
						   {/each}
					   </dl>
				   </div>
			   {/if}

			   <div class="w-full">
				   <SectionLabel tag="h3" class="mb-3">Downloads</SectionLabel>
				   <div class="flex flex-col">
					   <a href="/content/about/ole-kristensen-cv-engineer.pdf" class="mb-2 text-[var(--color-accent)] underline" download>Engineer CV (PDF)</a>
					   <a href="/content/about/ole-kristensen-cv.pdf" class="mb-2 text-[var(--color-accent)] underline" download>Artist CV (PDF)</a>
					   <a href="/content/about/ole-kristensen-work-examples.pdf" class="mb-2 text-[var(--color-accent)] underline" download>Work Examples (PDF)</a>
				   </div>
			   </div>
		   </aside>
		   <div class="area-tree">
			   <LSystemTree />
		   </div>
	   </div>
   </section>
</article>

<style>
	/* CSS Grid layout so the tree can occupy a different cell per breakpoint:
	   md+   prose in top-left, aside spans both rows on the right, tree below
	         the prose in the bottom-left cell.
	   sm    single column, stacked prose → aside → tree, so the tree is the
	         last thing on the page and rests against the footer rule. */
	.about-grid {
		display: grid;
		row-gap: 3rem;
		grid-template-columns: 1fr;
		grid-template-areas:
			'prose'
			'aside'
			'tree';
	}
	@media (min-width: 768px) {
		.about-grid {
			grid-template-columns: 2fr 1fr;
			column-gap: 3rem;
		}
		.about-grid {
			grid-template-areas:
				'prose aside'
				'tree aside';
		}
	}
	.area-prose {
		grid-area: prose;
	}
	.area-aside {
		grid-area: aside;
	}
	.area-tree {
		grid-area: tree;
		/* Grid items default to min-width: auto (= min-content). The canvas
		   inside has an intrinsic width, which would otherwise force the
		   grid track to stay at least as wide as the canvas — preventing
		   the column from shrinking when the viewport gets smaller. */
		min-width: 0;
	}
</style>
