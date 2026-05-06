<script lang="ts">
	import type { PageData } from './$types';
	import VimeoPlayer from '$lib/components/VimeoPlayer.svelte';
	import { getContext } from 'svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import CtaLink from '$lib/components/CtaLink.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import { SITE_URL } from '$lib/site';

	let { data }: { data: PageData } = $props();
	const getBureau = getContext<() => boolean>('bureau');
	let bureau = $derived(getBureau ? getBureau() : false);

	const pageUrl = $derived(`${SITE_URL}/works/${data.slug}/`);
	const heroImage = $derived(data.item.images.gallery[0] ?? data.item.images.thumb ?? null);
	const ogImage = $derived(`/og/works/${data.slug}.png`);
	const creativeWork = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		name: data.item.meta.title || data.slug,
		url: pageUrl,
		...(data.item.meta.lead ? { description: data.item.meta.lead } : {}),
		...(data.item.meta.date ? { dateCreated: data.item.meta.date } : {}),
		...(heroImage ? { image: `${SITE_URL}${heroImage}` } : {}),
		...(data.item.meta.tags ? { keywords: data.item.meta.tags.join(', ') } : {}),
		creator: { '@type': 'Person', name: 'Ole Kristensen', url: SITE_URL }
	}));
	const breadcrumb = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
			{ '@type': 'ListItem', position: 2, name: 'Works', item: `${SITE_URL}/works/` },
			{
				'@type': 'ListItem',
				position: 3,
				name: data.item.meta.title || data.slug,
				item: pageUrl
			}
		]
	}));
</script>

<SEO
	title={data.item.meta.title || data.slug}
	description={data.item.meta.lead}
	{ogImage}
	ogType="article"
/>
<JsonLd data={[creativeWork, breadcrumb]} />

<div class="page-light">
<article class="px-[var(--gutter)]">
	<header class="mx-auto max-w-[var(--max-w)] py-[clamp(3rem,6vw,6rem)]">
		<a href="/works" class="mb-6 inline-block font-heading text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--color-accent)] no-underline transition-[gap] hover:gap-3">← Works</a>
		<PageTitle>{data.item.meta.title}</PageTitle>
		{#if data.item.meta.lead}
			<p class="mt-4 max-w-[50ch] text-[1.1rem] leading-relaxed text-[var(--color-ink-secondary)]">{data.item.meta.lead}</p>
		{/if}
		<div class="mt-4 flex flex-wrap items-center gap-3">
			{#if data.item.meta.date}
				<span class="text-[0.78rem] text-[var(--color-ink-secondary)]">{data.item.meta.date}</span>
			{/if}
			{#if data.item.meta.tags}
				<span class="text-[var(--color-border)]">·</span>
				{#each data.item.meta.tags as tag}
					<Tag>{tag}</Tag>
				{/each}
			{/if}
		</div>
	</header>

	<!-- Videos -->
	{#if data.item.meta.videos?.length}
		<section class="mx-auto max-w-[var(--max-w)] pb-12">
			<div class="grid gap-6">
				{#each data.item.meta.videos as video}
					<VimeoPlayer id={video.id} title={video.title} />
				{/each}
			</div>
		</section>
	{/if}

	<!-- Image Gallery -->
	{#if data.item.images.gallery.length > 0}
		<section class="mx-auto max-w-[var(--max-w)] pb-12">
			<Gallery images={data.item.images.gallery} title={data.item.meta.title} photocredits={data.item.meta.photocredits} />
		</section>
	{/if}

	<!-- Content -->
	<section class="mx-auto max-w-[var(--max-w)] py-12">
		<div class="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
			<div class="prose">
				{@html data.item.html}
			</div>

			{#if data.item.meta.materials || data.item.meta.partners || data.item.meta.client}
				<aside class="border-t border-[var(--color-border)] pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
					       <div class="space-y-6">
						       {#if data.item.meta.materials}
							       <div>
							       <SectionLabel tag="h4" class="mb-1">Materials &amp; Equipment</SectionLabel>
							       <p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">{data.item.meta.materials}</p>
						       </div>
					       {/if}
					       {#if data.item.meta.technologies}
					       <div>
						   <SectionLabel tag="h4" class="mb-1">Technologies</SectionLabel>
							   <ul class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">
							       {#each data.item.meta.technologies as tech (tech)}
								   <li>{tech}</li>
							       {/each}
							   </ul>
						       </div>
						       {/if}
						       {#if data.item.meta.partners}
							       <div>
							       <SectionLabel tag="h4" class="mb-1">Partners</SectionLabel>
								       <p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">{data.item.meta.partners}</p>
							       </div>
						       {/if}
						       {#if data.item.meta.client}
							       <div>
							       <SectionLabel tag="h4" class="mb-1">Client</SectionLabel>
								       <p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">{data.item.meta.client}</p>
							       </div>
						       {/if}
						       {#if data.item.meta.github}
							       <div>
							       <SectionLabel tag="h4" class="mb-1">Source Code</SectionLabel>
								       <p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">
									       <a href={`https://github.com/${data.item.meta.github.user}/${data.item.meta.github.repo}`} target="_blank" rel="noopener" class="text-[var(--color-accent)] underline">{data.item.meta.github.user}/{data.item.meta.github.repo}</a>
								       </p>
							       </div>
						       {/if}
					       </div>
				</aside>
			{/if}
		</div>
	</section>

	<!-- Appearances -->
	{#if data.item.meta.appearances?.length}
		<section class="mx-auto max-w-[var(--max-w)] border-t border-[var(--color-border)] py-12">
			<SectionLabel tag="h4" class="mb-6">Appearances</SectionLabel>
			<div class="flex flex-col">
				{#each data.item.meta.appearances as appearance}
					<a
						href={appearance.url}
						target="_blank"
						rel="noopener"
						class="group flex items-center justify-between border-b border-[var(--color-border)] py-3 no-underline transition-[padding-left] duration-300 first:border-t hover:pl-2"
					>
						<span class="font-heading text-[0.9rem] font-medium text-[var(--color-ink)]">{appearance.occasion}</span>
						<div class="flex items-center gap-4 text-[0.78rem] text-[var(--color-ink-secondary)]">
							<span>{appearance.place}</span>
							<span>{appearance.date}</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Back nav -->
	<nav class="mx-auto max-w-[var(--max-w)] border-t border-[var(--color-border)] py-8">
		<CtaLink href="/works">← All Works</CtaLink>
	</nav>
</article>
</div>
