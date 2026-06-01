<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import CtaLink from '$lib/components/CtaLink.svelte';
	import DuotoneImage from '$lib/components/DuotoneImage.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
	import EntryRow from '$lib/components/EntryRow.svelte';
	import TeaserSectionHeader from '$lib/components/TeaserSectionHeader.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import {
		ORGANIZATION_ID,
		ORGANIZATION_JSONLD,
		ORGANIZATION_URL,
		PERSON_ADDRESS,
		PERSON_NAME,
		PERSON_SAME_AS,
		PERSON_URL,
		SITE_URL
	} from '$lib/site';
	import { buildPersonJsonLd } from '$lib/person';
	import { buildCreativeWorkItemList } from '$lib/schema-helpers';
	import type { PageData } from './$types';
	import { getContext } from 'svelte';

	let { data }: { data: PageData } = $props();
	const getBureau = getContext<() => boolean>('bureau');
	let bureau = $derived(getBureau ? getBureau() : false);

	// Shuffle hero images client-side so each visit shows a different starting
	// image. $derived.by re-runs if `data` changes (client-side navigation),
	// satisfying svelte-check's state_referenced_locally rule.
	const heroImages = $derived.by(() => [...data.heroImages].sort(() => Math.random() - 0.5));

	// LCP preload: hint the browser to fetch the first hero image (whichever
	// the unshuffled order delivers via SSR) before it sees the <img> tag.
	// imagesrcset lets the browser pick the right size for the viewport.
	const lcpHero = $derived(data.heroImages[0]);
	const lcpHeroSrcset = $derived(
		lcpHero ? lcpHero.sizes.map((s: { width: number; url: string }) => `${s.url} ${s.width}w`).join(', ') : ''
	);

	// ItemList JSON-LD — names which works / consultancies the homepage is
	// featuring and in which order. Each ListItem references the canonical
	// detail URL, where Google indexes the actual <img> tags + the work's
	// own CreativeWork JSON-LD. Eligible for carousel rich results.
	const featuredWorksList = $derived(
		buildCreativeWorkItemList(
			data.featured.map((w) => ({ slug: w.slug, name: w.meta.title || w.slug })),
			{ name: 'Selected works', baseUrl: `${SITE_URL}/works`, descending: true }
		)
	);
	const personJsonLd = $derived(
		buildPersonJsonLd(data.aboutSection?.meta.person, {
			personUrl: PERSON_URL,
			organizationUrl: ORGANIZATION_URL,
			organizationId: ORGANIZATION_ID,
			name: PERSON_NAME,
			sameAs: PERSON_SAME_AS,
			address: PERSON_ADDRESS
		})
	);
	const consultanciesList = $derived(
		buildCreativeWorkItemList(
			data.consultancies.slice(0, 4).map((c) => ({ slug: c.slug, name: c.meta.title || c.slug })),
			{ name: 'Consultancies', baseUrl: `${SITE_URL}/consultancies`, descending: true }
		)
	);
	const researchList = $derived(
		buildCreativeWorkItemList(
			data.research.slice(0, 4).map((r) => ({ slug: r.slug, name: r.meta.title || r.slug })),
			{ name: 'Research', baseUrl: `${SITE_URL}/research`, descending: true }
		)
	);
</script>

<SEO />
<JsonLd
	data={[
		...(personJsonLd ? [personJsonLd] : []),
		ORGANIZATION_JSONLD,
		featuredWorksList,
		consultanciesList,
		researchList
	]}
/>

<svelte:head>
	{#if lcpHeroSrcset}
		<link rel="preload" as="image" imagesrcset={lcpHeroSrcset} imagesizes="100vw" fetchpriority="high" />
	{/if}
</svelte:head>

<Hero images={heroImages} />

{#snippet worksSection()}
<!-- Works -->
<section class="px-[var(--gutter)] py-[clamp(5rem,10vw,10rem)]">
	<div class="animate-fade-up mx-auto max-w-[var(--max-w)]">
		<TeaserSectionHeader
			eyebrow={data.worksSection?.meta.teaser_label ?? data.worksSection?.meta.label ?? null}
			title={data.worksSection?.meta.title ?? 'Works'}
			lead={data.worksSection?.meta.teaser_lead ?? data.worksSection?.meta.lead ?? null}
		/>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_0.7fr]">
			{#each data.featured as work, i (work.slug)}
			{#if i === 0}
					<a href="/works/{work.slug}" class="group block no-underline">
						{#if work.images.thumb}
							<ResponsiveImage
								src={work.images.thumb}
								srcset={work.images.thumbSrcset}
								srcsetWebp={work.images.thumbSrcsetWebp}
								sizes="(min-width: 768px) 60vw, 100vw"
								alt={work.meta.title}
								class="mb-4 aspect-[16/10] bg-[var(--color-accent-subtle)]"
								innerClass="transition-transform duration-500 group-hover:scale-[1.04]"
							/>
						{/if}
						<h3 class="mb-1 font-heading text-[1.1rem] font-medium tracking-tight">{work.meta.title}</h3>
						{#if work.meta.date}
							<span class="text-[0.75rem] text-[var(--color-ink-secondary)]">{work.meta.date}</span>
						{/if}
						{#if work.meta.lead}
							<p class="mt-1.5 max-w-[45ch] text-[0.85rem] text-[var(--color-ink-secondary)]">{work.meta.lead}</p>
						{/if}
					</a>
				{/if}
			{/each}

			<div class="flex flex-col gap-6">
				{#each data.featured.slice(1, 3) as work (work.slug)}
				<a href="/works/{work.slug}" class="group block no-underline">
						{#if work.images.thumb}
							<ResponsiveImage
								src={work.images.thumb}
								srcset={work.images.thumbSrcset}
								srcsetWebp={work.images.thumbSrcsetWebp}
								sizes="(min-width: 768px) 30vw, 100vw"
								alt={work.meta.title}
								class="mb-4 aspect-[4/3] bg-[var(--color-accent-subtle)]"
								innerClass="transition-transform duration-500 group-hover:scale-[1.04]"
							/>
						{/if}
						<h3 class="mb-1 font-heading text-[1.1rem] font-medium tracking-tight">{work.meta.title}</h3>
						{#if work.meta.date}
							<span class="text-[0.75rem] text-[var(--color-ink-secondary)]">{work.meta.date}</span>
						{/if}
					</a>
				{/each}
			</div>
		</div>

		<div class="mt-12">
			<CtaLink href="/works">View all works →</CtaLink>
		</div>
	</div>
</section>
{/snippet}

{#snippet consultanciesSection()}
<!-- Consultancies -->
<section class="px-[var(--gutter)] py-[clamp(5rem,10vw,10rem)]">
	<div class="animate-fade-up mx-auto max-w-[var(--max-w)]">
		<TeaserSectionHeader
			eyebrow={data.consultanciesSection?.meta.teaser_label ?? data.consultanciesSection?.meta.label ?? null}
			title={data.consultanciesSection?.meta.title ?? 'Consultancies'}
			lead={data.consultanciesSection?.meta.teaser_lead ?? data.consultanciesSection?.meta.lead ?? null}
			tight
		/>

		<div class="flex flex-col [&>*:first-child]:border-t-0">
			{#each data.consultancies.slice(0, 4) as consultancy (consultancy.slug)}
				<EntryRow
					href="/consultancies/{consultancy.slug}"
					title={consultancy.meta.title || consultancy.slug}
					lead={consultancy.meta.lead}
					thumb={consultancy.images?.thumb ? { src: consultancy.images.thumb, srcset: consultancy.images.thumbSrcset, srcsetWebp: consultancy.images.thumbSrcsetWebp } : null}
					metaParts={[consultancy.meta.client, consultancy.meta.date]}
				/>
			{/each}
		</div>

		<div class="mt-12">
			<CtaLink href="/consultancies">View all consultancies →</CtaLink>
		</div>
	</div>
</section>
{/snippet}

{#snippet researchSection()}
<!-- Research -->
<section class="px-[var(--gutter)] py-[clamp(5rem,10vw,10rem)]">
	<div class="animate-fade-up mx-auto max-w-[var(--max-w)]">
		<TeaserSectionHeader
			eyebrow={data.researchSection?.meta.teaser_label ?? data.researchSection?.meta.label ?? null}
			title={data.researchSection?.meta.title ?? 'Research'}
			lead={data.researchSection?.meta.teaser_lead ?? data.researchSection?.meta.lead ?? null}
			tight
		/>

		<div class="flex flex-col [&>*:first-child]:border-t-0">
			{#each data.research.slice(0, 4) as item (item.slug)}
				<EntryRow
					href="/research/{item.slug}"
					title={item.meta.title || item.slug}
					lead={item.meta.lead}
					thumb={item.images?.thumb ? { src: item.images.thumb, srcset: item.images.thumbSrcset, srcsetWebp: item.images.thumbSrcsetWebp } : null}
					metaParts={[
						item.publications.length > 0 ? `${item.publications.length} publication${item.publications.length === 1 ? '' : 's'}` : null,
						item.meta.date
					]}
				/>
			{/each}
		</div>

		<div class="mt-12">
			<CtaLink href="/research">View all research →</CtaLink>
		</div>
	</div>
</section>
{/snippet}

{#if bureau}
	{@render consultanciesSection()}
	{@render worksSection()}
	{@render researchSection()}
{:else}
	{@render worksSection()}
	{@render consultanciesSection()}
	{@render researchSection()}
{/if}

<!-- About -->
<section class="px-[var(--gutter)] py-[clamp(5rem,10vw,10rem)]">
	<div class="animate-fade-up mx-auto max-w-[var(--max-w)]">
		<SectionLabel class="mb-4">About</SectionLabel>
		<div class="grid grid-cols-1 items-start gap-8 md:grid-cols-[3px_1fr]">
			<div class="hidden h-full min-h-16 bg-[var(--color-accent)] md:block"></div>
			<div>
				{#if data.aboutSection?.meta.teaser}
					<p class="max-w-[45ch] text-[clamp(1.1rem,2vw,1.4rem)] leading-relaxed text-[var(--color-ink)]">
						{data.aboutSection.meta.teaser}
					</p>
				{/if}
				<CtaLink href="/about" class="mt-8">Read more →</CtaLink>
			</div>
		</div>
	</div>
</section>
