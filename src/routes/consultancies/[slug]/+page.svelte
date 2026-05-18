<script lang="ts">
	import type { PageData } from './$types';
	import VimeoPlayer from '$lib/components/VimeoPlayer.svelte';
	import { getContext } from 'svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import CtaLink from '$lib/components/CtaLink.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import { SITE_URL } from '$lib/site';
	import { isoDate } from '$lib/dates';
	import { PERSON_REF, buildBreadcrumb, buildVideoObject } from '$lib/schema-helpers';

	let { data }: { data: PageData } = $props();
	const getBureau = getContext<() => boolean>('bureau');
	let bureau = $derived(getBureau ? getBureau() : false);

	const pageUrl = $derived(`${SITE_URL}/consultancies/${data.slug}/`);
	const heroImage = $derived(data.item.images.gallery[0] ?? data.item.images.thumb ?? null);
	const workName = $derived(data.item.meta.title || data.slug);
	// SEO fields prefer explicit frontmatter overrides, then fall back to the
	// auto-derived defaults (lead → client-shaped fallback → generated OG).
	const description = $derived(
		data.item.meta.description ??
			data.item.meta.lead ??
			(data.item.meta.client ? `Design technology for ${data.item.meta.client}.` : undefined)
	);
	const ogImage = $derived(data.item.meta.ogImage ?? `/og/consultancies/${data.slug}.png`);
	const seoKeywords = $derived(
		[...(data.item.meta.keywords ?? []), ...(data.item.meta.tags ?? [])].join(', ')
	);

	const videoObjects = $derived.by(() => {
		const videos = data.item.meta.videos;
		if (!videos?.length) return [] as Record<string, unknown>[];
		const upload = isoDate(data.item.meta.date);
		return videos.map((v: { id: string; title: string }) =>
			buildVideoObject(
				v,
				{ id: pageUrl, name: workName, url: pageUrl },
				{ uploadDate: upload, description: data.item.meta.lead }
			)
		);
	});

	const creativeWork = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		'@id': pageUrl,
		name: workName,
		url: pageUrl,
		...(description ? { description } : {}),
		...(data.item.meta.date ? { dateCreated: data.item.meta.date } : {}),
		...(heroImage ? { image: `${SITE_URL}${heroImage}` } : {}),
		...(seoKeywords ? { keywords: seoKeywords } : {}),
		...(data.item.meta.client
			? { sourceOrganization: { '@type': 'Organization', name: data.item.meta.client } }
			: {}),
		creator: PERSON_REF
	}));
	const breadcrumb = $derived(
		buildBreadcrumb([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Consultancies', url: `${SITE_URL}/consultancies/` },
			{ name: workName, url: pageUrl }
		])
	);

	const jsonLd = $derived([creativeWork, breadcrumb, ...videoObjects]);
</script>

<SEO
	title={data.item.meta.title || data.slug}
	{description}
	{ogImage}
	ogType="article"
/>
<JsonLd data={jsonLd} />

<div class="page-dark">
	<article class="px-[var(--gutter)]">
		<PageHeader
			wrap={false}
			backHref="/consultancies"
			backLabel="Consultancies"
			title={data.item.meta.title || data.slug}
		>
			<div class="mt-4 flex flex-wrap items-center gap-3 text-[0.78rem] text-[var(--color-ink-secondary)]">
				{#if data.item.meta.client}
					<span>{data.item.meta.client}</span>
				{/if}
				{#if data.item.meta.date}
					<span class="text-[var(--color-border)]">·</span>
					<span>{data.item.meta.date}</span>
				{/if}
			</div>
		</PageHeader>

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
				<Gallery images={data.item.images.gallery} title={data.item.meta.title} />
			</section>
		{/if}

		<!-- Content -->
		<section class="mx-auto max-w-[var(--max-w)] py-12">
			<div class="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
				<div class="prose">
					{@html data.item.html}
				</div>

				{#if data.item.meta.client || data.research}
					<aside class="border-t border-[var(--color-border)] pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
						<div class="space-y-6">
							{#if data.research}
								<div>
									<SectionLabel tag="h4" class="mb-1">Part of research</SectionLabel>
									<p class="text-[0.85rem] leading-relaxed">
										<a href="/research/{data.research.slug}" class="text-[var(--color-accent)] underline underline-offset-2">{data.research.meta.title || data.research.slug}</a>
									</p>
								</div>
							{/if}
							{#if data.item.meta.client}
								<div>
									<SectionLabel tag="h4" class="mb-1">Client</SectionLabel>
									<p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">{data.item.meta.client}</p>
								</div>
							{/if}
						</div>
					</aside>
				{/if}
			</div>
		</section>

		<!-- Back nav -->
		<nav class="mx-auto max-w-[var(--max-w)] border-t border-[var(--color-border)] py-8">
			<CtaLink href="/consultancies">← All Consultancies</CtaLink>
		</nav>
	</article>
</div>
