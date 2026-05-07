<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import CtaLink from '$lib/components/CtaLink.svelte';
	import DuotoneImage from '$lib/components/DuotoneImage.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import {
		ORGANIZATION_JSONLD,
		PERSON_ADDRESS,
		PERSON_NAME,
		PERSON_SAME_AS,
		SITE_URL
	} from '$lib/site';
	import { buildPersonJsonLd } from '$lib/person';
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
	const featuredWorksList = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Selected works',
		numberOfItems: data.featured.length,
		itemListElement: data.featured.map((w, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			item: {
				'@type': 'CreativeWork',
				name: w.meta.title || w.slug,
				url: `${SITE_URL}/works/${w.slug}/`
			}
		}))
	}));
	const personJsonLd = $derived(
		buildPersonJsonLd(data.aboutSection?.meta.person, {
			siteUrl: SITE_URL,
			name: PERSON_NAME,
			sameAs: PERSON_SAME_AS,
			address: PERSON_ADDRESS
		})
	);
	const consultanciesList = $derived.by(() => {
		const items = data.consultancies.slice(0, 4);
		return {
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: 'Consultancies',
			numberOfItems: items.length,
			itemListElement: items.map((c, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				item: {
					'@type': 'CreativeWork',
					name: c.meta.title || c.slug,
					url: `${SITE_URL}/consultancies/${c.slug}/`
				}
			}))
		};
	});
</script>

<SEO />
<JsonLd
	data={[
		...(personJsonLd ? [personJsonLd] : []),
		ORGANIZATION_JSONLD,
		featuredWorksList,
		consultanciesList
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
		<div class="mb-[clamp(2rem,4vw,4rem)] flex flex-col items-start justify-between gap-4 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-end">
			<div>
				<SectionLabel class="mb-2">{data.worksSection?.meta.teaser_label ?? 'Selected Works'}</SectionLabel>
				<h2 class="font-heading text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-none tracking-tight">{@html data.worksSection?.meta.title ?? 'Projects &amp; Installations'}</h2>
			</div>
			<p class="text-[0.9rem] text-[var(--color-ink-secondary)] md:max-w-[35ch] md:text-right">{data.worksSection?.meta.teaser_lead ?? 'Interactive installations, live performances, and commissioned work.'}</p>
		</div>

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
		<div class="mb-[clamp(2rem,4vw,4rem)] flex flex-col items-start justify-between gap-4 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-end">
			<div>
				<SectionLabel class="mb-2">{data.consultanciesSection?.meta.label ?? 'Consultancies'}</SectionLabel>
				<h2 class="font-heading text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-none tracking-tight">{@html data.consultanciesSection?.meta.title ?? 'Design Technology'}</h2>
			</div>
			<p class="text-[0.9rem] text-[var(--color-ink-secondary)] md:max-w-[35ch] md:text-right">{data.consultanciesSection?.meta.lead ?? ''}</p>
		</div>

		<div class="flex flex-col">
			{#each data.consultancies.slice(0, 4) as consultancy (consultancy.slug)}
				<a href="/consultancies/{consultancy.slug}" class="group grid grid-cols-[1fr_auto] items-center gap-6 border-b border-[var(--color-border)] px-0 py-5 no-underline transition-[padding-left] duration-300 first:border-t hover:pl-2 md:grid-cols-[5rem_1fr_auto]">
					{#if consultancy.images?.thumb}
					<DuotoneImage src={consultancy.images.thumb} srcset={consultancy.images.thumbSrcset} srcsetWebp={consultancy.images.thumbSrcsetWebp} sizes="5rem" class="hidden h-14 w-20 shrink-0 overflow-hidden md:block" />
					{/if}
					<div>
						<h3 class="mb-0.5 font-heading text-[1.1rem] font-medium tracking-tight">{consultancy.meta.title}</h3>
						{#if consultancy.meta.lead}
							<p class="max-w-[40ch] text-[0.82rem] text-[var(--color-ink-secondary)]">{consultancy.meta.lead}</p>
						{/if}
					</div>
					<div class="flex shrink-0 items-center gap-6 text-[0.75rem] text-[var(--color-ink-secondary)]">
						{#if consultancy.meta.client}
							<span>{consultancy.meta.client}</span>
						{/if}
						{#if consultancy.meta.date}
							<span>{consultancy.meta.date}</span>
						{/if}
						<span class="text-[1.1rem] text-[var(--color-accent)] transition-transform duration-300 group-hover:translate-x-1">→</span>
					</div>
				</a>
			{/each}
		</div>

		<div class="mt-12">
			<CtaLink href="/consultancies">View all consultancies →</CtaLink>
		</div>
	</div>
</section>
{/snippet}

{#if bureau}
	{@render consultanciesSection()}
	{@render worksSection()}
{:else}
	{@render worksSection()}
	{@render consultanciesSection()}
{/if}

<!-- About -->
<section class="px-[var(--gutter)] py-[clamp(5rem,10vw,10rem)]">
	<div class="animate-fade-up mx-auto max-w-[var(--max-w)]">
		<SectionLabel class="mb-4">About</SectionLabel>
		<div class="grid grid-cols-1 items-start gap-8 md:grid-cols-[3px_1fr]">
			<div class="hidden h-full min-h-16 bg-[var(--color-accent)] md:block"></div>
			<div>
				<p class="max-w-[45ch] text-[clamp(1.1rem,2vw,1.4rem)] leading-relaxed text-[var(--color-ink)]">
					{data.aboutSection?.meta.teaser ?? 'Ole Kristensen is a visual artist, programmer and scenographer — developing and appropriating new technology, creating works with software at the core.'}
				</p>
				<CtaLink href="/about" class="mt-8">Read more →</CtaLink>
			</div>
		</div>
	</div>
</section>
