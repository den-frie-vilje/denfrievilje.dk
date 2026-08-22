<script lang="ts">
	import type { PageData } from './$types';
	import VimeoPlayer from '$lib/components/VimeoPlayer.svelte';
	import EmbedFrame from '$lib/components/EmbedFrame.svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AppearanceRow from '$lib/components/AppearanceRow.svelte';
	import SourceCodeLinks from '$lib/components/SourceCodeLinks.svelte';
	import CtaLink from '$lib/components/CtaLink.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import { SITE_URL } from '$lib/site';
	import { isoDate } from '$lib/dates';
	import {
		PERSON_REF,
		buildBreadcrumb,
		buildVideoObject,
		creativeWorkRef
	} from '$lib/schema-helpers';

	let { data }: { data: PageData } = $props();

	const pageUrl = $derived(`${SITE_URL}/works/${data.slug}/`);
	const heroImage = $derived(data.item.images.gallery[0] ?? data.item.images.thumb ?? null);
	const workName = $derived(data.item.meta.title || data.slug);
	// SEO fields prefer explicit frontmatter overrides, then fall back to the
	// auto-derived defaults (lead → meta description, generated OG screenshot).
	const description = $derived(data.item.meta.description ?? data.item.meta.lead);
	const ogImage = $derived(data.item.meta.ogImage ?? `/og/works/${data.slug}.png`);
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

	const eventObjects = $derived.by(() => {
		const apps = data.item.meta.appearances;
		if (!apps?.length) return [] as Record<string, unknown>[];
		const out: Record<string, unknown>[] = [];
		for (const a of apps as Array<{ date: string; occasion: string; place: string; url: string }>) {
			const start = isoDate(a.date);
			if (!start) continue;
			out.push({
				'@context': 'https://schema.org',
				'@type': 'Event',
				name: a.occasion,
				startDate: start,
				// `eventStatus` only takes EventScheduled/Cancelled/Postponed/etc.
				// per schema.org. Past events that happened normally need no
				// status — the date alone makes it clear the event is over.
				eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
				location: { '@type': 'Place', name: a.place },
				...(a.url ? { url: a.url } : {}),
				workPerformed: creativeWorkRef({ id: pageUrl, name: workName, url: pageUrl })
			});
		}
		return out;
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
		creator: PERSON_REF
	}));
	const breadcrumb = $derived(
		buildBreadcrumb([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Works', url: `${SITE_URL}/works/` },
			{ name: workName, url: pageUrl }
		])
	);

	const jsonLd = $derived([creativeWork, breadcrumb, ...videoObjects, ...eventObjects]);
</script>

<SEO
	title={data.item.meta.title || data.slug}
	{description}
	{ogImage}
	ogType="article"
/>
<JsonLd data={jsonLd} />

<svelte:head>
	{#if heroImage}
		<link rel="preload" as="image" href={heroImage} fetchpriority="high" />
	{/if}
</svelte:head>

<div class="page-light">
<article class="px-[var(--gutter)]">
	<PageHeader
		wrap={false}
		backHref="/works"
		backLabel="Works"
		title={data.item.meta.title || data.slug}
		lead={data.item.meta.lead ?? null}
		leadSize="lg"
	>
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
	</PageHeader>

	<!-- External embeds (iframe) — primary artefact, so they lead -->
	{#if data.item.meta.embeds?.length}
		<section class="mx-auto max-w-[var(--max-w)] pb-12">
			<div class="grid gap-6">
				{#each data.item.meta.embeds as embed (embed.url)}
					<EmbedFrame url={embed.url} title={embed.title} />
				{/each}
			</div>
		</section>
	{/if}

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

			{#if data.item.meta.materials || data.item.meta.partners || data.item.meta.client || data.item.meta.technologies || data.item.meta.github || data.research}
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
						       		<SourceCodeLinks
						       			user={data.item.meta.github.user}
						       			repo={data.item.meta.github.repo}
						       			repos={data.item.meta.github.repos}
						       		/>
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
					<AppearanceRow
						href={appearance.url}
						occasion={appearance.occasion}
						place={appearance.place}
						date={appearance.date}
					/>
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
