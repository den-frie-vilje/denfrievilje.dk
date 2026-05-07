<script lang="ts">
	import type { PageData } from './$types';
	import VimeoPlayer from '$lib/components/VimeoPlayer.svelte';
	import { getContext } from 'svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import CtaLink from '$lib/components/CtaLink.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import { SITE_URL } from '$lib/site';

	let { data }: { data: PageData } = $props();
	const getBureau = getContext<() => boolean>('bureau');
	let bureau = $derived(getBureau ? getBureau() : false);

	const pageUrl = $derived(`${SITE_URL}/consultancies/${data.slug}/`);
	const heroImage = $derived(data.item.images.gallery[0] ?? data.item.images.thumb ?? null);
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

	// Reuse the same isoDate parser shape as works/[slug]; consultancies rarely
	// have appearances, so only VideoObject is wired here.
	const MONTH_TO_NUM: Record<string, number> = {
		jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7,
		aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, january: 1, february: 2, march: 3,
		april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
	};
	function isoDate(input?: string): string | null {
		if (!input) return null;
		const yearMatch = input.match(/(\d{4})/);
		if (!yearMatch) return null;
		const year = yearMatch[1];
		const monthMatch = input.toLowerCase().match(/[a-z]{3,}/);
		const month = monthMatch ? MONTH_TO_NUM[monthMatch[0]] : null;
		const mm = month ? String(month).padStart(2, '0') : '01';
		return `${year}-${mm}-01`;
	}

	const videoObjects = $derived.by(() => {
		const videos = data.item.meta.videos;
		if (!videos?.length) return [] as Record<string, unknown>[];
		const upload = isoDate(data.item.meta.date);
		return videos.map((v: { id: string; title: string }) => ({
			'@context': 'https://schema.org',
			'@type': 'VideoObject',
			name: v.title || (data.item.meta.title ?? data.slug),
			description: data.item.meta.lead || v.title || '',
			contentUrl: `https://vimeo.com/${v.id}`,
			embedUrl: `https://player.vimeo.com/video/${v.id}`,
			thumbnailUrl: `https://vumbnail.com/${v.id}.jpg`,
			...(upload ? { uploadDate: upload } : {}),
			isPartOf: { '@type': 'CreativeWork', name: data.item.meta.title || data.slug, url: pageUrl }
		}));
	});

	const creativeWork = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		'@id': pageUrl,
		name: data.item.meta.title || data.slug,
		url: pageUrl,
		...(description ? { description } : {}),
		...(data.item.meta.date ? { dateCreated: data.item.meta.date } : {}),
		...(heroImage ? { image: `${SITE_URL}${heroImage}` } : {}),
		...(seoKeywords ? { keywords: seoKeywords } : {}),
		...(data.item.meta.client
			? { sourceOrganization: { '@type': 'Organization', name: data.item.meta.client } }
			: {}),
		creator: { '@type': 'Person', name: 'Ole Kristensen', url: SITE_URL }
	}));
	const breadcrumb = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
			{ '@type': 'ListItem', position: 2, name: 'Consultancies', item: `${SITE_URL}/consultancies/` },
			{ '@type': 'ListItem', position: 3, name: data.item.meta.title || data.slug, item: pageUrl }
		]
	}));

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
		<header class="mx-auto max-w-[var(--max-w)] py-[clamp(3rem,6vw,6rem)]">
			<a href="/consultancies" class="mb-6 inline-block font-heading text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--color-accent)] no-underline transition-[gap] hover:gap-3">← Consultancies</a>
			<PageTitle>{data.item.meta.title}</PageTitle>
			<div class="mt-4 flex flex-wrap items-center gap-3 text-[0.78rem] text-[var(--color-ink-secondary)]">
				{#if data.item.meta.client}
					<span>{data.item.meta.client}</span>
				{/if}
				{#if data.item.meta.date}
					<span class="text-[var(--color-border)]">·</span>
					<span>{data.item.meta.date}</span>
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
				<Gallery images={data.item.images.gallery} title={data.item.meta.title} />
			</section>
		{/if}

		<!-- Content -->
		<section class="mx-auto max-w-[var(--max-w)] py-12">
			<div class="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
				<div class="prose">
					{@html data.item.html}
				</div>

				{#if data.item.meta.client}
					<aside class="border-t border-[var(--color-border)] pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
						<SectionLabel tag="h4" class="mb-1">Client</SectionLabel>
						<p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">{data.item.meta.client}</p>
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
