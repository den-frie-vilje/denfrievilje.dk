<script lang="ts">
	import type { PageData } from './$types';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import { getContext } from 'svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import DuotoneImage from '$lib/components/DuotoneImage.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import { SITE_URL } from '$lib/site';
	import { buildBreadcrumb, buildCreativeWorkItemList } from '$lib/schema-helpers';

	let { data }: { data: PageData } = $props();
	const getBureau = getContext<() => boolean>('bureau');
	let bureau = $derived(getBureau ? getBureau() : false);

	const pageUrl = `${SITE_URL}/consultancies/`;
	const collectionPage = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		'@id': pageUrl,
		url: pageUrl,
		name: 'Design Technology',
		description:
			data.section?.meta.lead ??
			'Design technology consultancies — bespoke software, interactive systems, and creative engineering for cultural and commercial clients.',
		mainEntity: buildCreativeWorkItemList(
			data.items.map((c) => ({ slug: c.slug, name: c.meta.title || c.slug })),
			{ name: 'Consultancies', baseUrl: `${SITE_URL}/consultancies`, descending: true }
		)
	}));
	const breadcrumb = buildBreadcrumb([
		{ name: 'Home', url: `${SITE_URL}/` },
		{ name: 'Consultancies', url: pageUrl }
	]);
</script>

<SEO
	title="Consultancies"
	description={data.section?.meta.lead ?? 'Design technology consultancies — bespoke software, interactive systems, and creative engineering for cultural and commercial clients.'}
/>
<JsonLd data={[collectionPage, breadcrumb]} />

<div class="page-dark">
	<section class="px-[var(--gutter)] py-[clamp(3rem,6vw,6rem)]">
		<div class="mx-auto max-w-[var(--max-w)]">
			<SectionLabel class="mb-2">{data.section?.meta.label ?? 'Consultancies'}</SectionLabel>
			<div class="relative">
				<img
					src="/images/logos/den%20frie%20vilje%20logo%20knockout.svg"
					alt="Den Frie Vilje"
					class="float-right ml-6"
					style="height: calc(clamp(2.5rem, 5vw, 4rem) * 1.68);"
				/>
				<PageTitle>{@html data.section?.meta.title ?? 'Design Technology'}</PageTitle>
				{#if data.section?.meta.lead}
					<p class="mt-4 max-w-[40ch] text-[0.9rem] text-[var(--color-ink-secondary)]">{data.section.meta.lead}</p>
				{/if}
			</div>
			{#if data.section?.html}
				<p class="mt-8 max-w-[55ch] font-serif text-[1.05rem] leading-relaxed text-[var(--color-ink-secondary)]">{@html data.section.html}</p>
			{/if}
		</div>
	</section>

	<section class="px-[var(--gutter)] pb-[clamp(5rem,10vw,10rem)]">
		<div class="mx-auto max-w-[var(--max-w)]">
			<div class="flex flex-col">
				{#each data.items as item (item.slug)}
					<a href="/consultancies/{item.slug}" class="group grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-[var(--color-border)] py-5 no-underline transition-[padding-left] duration-300 first:border-t hover:pl-2 md:grid-cols-[5rem_1fr_auto] md:gap-6">
						{#if item.images.thumb}
						<DuotoneImage src={item.images.thumb} srcset={item.images.thumbSrcset} srcsetWebp={item.images.thumbSrcsetWebp} sizes="5rem" class="h-10 w-14 shrink-0 overflow-hidden md:h-14 md:w-20" />
						{/if}
						<div>
							<h3 class="mb-0.5 font-heading text-[1.1rem] font-medium tracking-tight">{item.meta.title || item.slug}</h3>
							{#if item.meta.lead}
								<p class="max-w-[40ch] text-[0.82rem] text-[var(--color-ink-secondary)]">{item.meta.lead}</p>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-6 text-[0.75rem] text-[var(--color-ink-secondary)]">
							{#if item.meta.client}
								<span class="hidden md:inline">{item.meta.client}</span>
							{/if}
							{#if item.meta.date}
								<span>{item.meta.date}</span>
							{/if}
							<span class="text-[1.1rem] text-[var(--color-accent)] transition-transform duration-300 group-hover:translate-x-1">→</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
