<script lang="ts">
	import type { PageData } from './$types';
	import VimeoPlayer from '$lib/components/VimeoPlayer.svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import CtaLink from '$lib/components/CtaLink.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
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

	const pageUrl = $derived(`${SITE_URL}/research/${data.slug}/`);
	const heroImage = $derived(data.item.images.gallery[0] ?? data.item.images.thumb ?? null);
	const workName = $derived(data.item.meta.title || data.slug);
	const description = $derived(data.item.meta.description ?? data.item.meta.lead);
	const ogImage = $derived(data.item.meta.ogImage ?? `/og/research/${data.slug}.png`);
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
				eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
				location: { '@type': 'Place', name: a.place },
				...(a.url ? { url: a.url } : {}),
				workPerformed: creativeWorkRef({ id: pageUrl, name: workName, url: pageUrl })
			});
		}
		return out;
	});

	// Research entries are scholarly CreativeWorks with associated publications.
	// We emit a Research-typed CreativeWork plus a CreativeWork for each
	// publication so search engines surface them as related items.
	const researchWork = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		additionalType: 'Research',
		'@id': pageUrl,
		name: workName,
		url: pageUrl,
		...(description ? { description } : {}),
		...(data.item.meta.date ? { dateCreated: data.item.meta.date } : {}),
		...(heroImage ? { image: `${SITE_URL}${heroImage}` } : {}),
		...(seoKeywords ? { keywords: seoKeywords } : {}),
		creator: PERSON_REF,
		...(data.item.publications.length > 0
			? {
					hasPart: data.item.publications.map((p) => ({
						'@type': 'CreativeWork',
						name: p.title,
						url: `${SITE_URL}${p.url}`,
						...(p.year ? { datePublished: String(p.year) } : {}),
						...(p.author ? { author: { '@type': 'Person', name: p.author } } : {}),
						...(p.language ? { inLanguage: p.language } : {}),
						encodingFormat: 'application/pdf'
					}))
				}
			: {})
	}));
	const breadcrumb = $derived(
		buildBreadcrumb([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Research', url: `${SITE_URL}/research/` },
			{ name: workName, url: pageUrl }
		])
	);

	const jsonLd = $derived([researchWork, breadcrumb, ...videoObjects, ...eventObjects]);
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
	<header class="mx-auto max-w-[var(--max-w)] py-[clamp(3rem,6vw,6rem)]">
		<a href="/research" class="mb-6 inline-block font-heading text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--color-accent)] no-underline transition-[gap] hover:gap-3">← Research</a>
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
		<!-- Two-column at large breakpoints with publications + metadata in the
		     right rail; below lg, the rail drops under the prose so publications
		     remain visible without forcing readers to scroll past them first. -->
		<div class="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
			<div class="prose">
				{@html data.item.html}
			</div>

			{#if data.item.publications.length > 0 || data.item.meta.materials || data.item.meta.partners || data.item.meta.client || data.item.meta.technologies || data.item.meta.github}
				<aside class="border-t border-[var(--color-border)] pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
					<div class="space-y-10">
						{#if data.item.publications.length > 0}
							<div>
								<SectionLabel tag="h2" class="mb-4">Publications</SectionLabel>
								<!-- 2-col at sm (when the rail is full-width under the
								     prose) collapses to a vertical stack at lg+ once the
								     rail itself is narrow. -->
								<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
									{#each data.item.publications as pub}
										<li>
											<a
												href={pub.url}
												target="_blank"
												rel="noopener"
												class="group block no-underline"
											>
												{#if pub.thumb}
													<ResponsiveImage
														src={pub.thumb}
														srcset={pub.thumbSrcset}
														srcsetWebp={pub.thumbSrcsetWebp}
														sizes="(min-width: 1024px) 280px, (min-width: 640px) 30vw, 100vw"
														alt={pub.title}
														class="mb-3 aspect-[3/4] border border-[var(--color-border)] bg-[var(--color-accent-subtle)]"
														innerClass="transition-transform duration-500 group-hover:scale-[1.02]"
													/>
												{:else}
													<div class="mb-3 flex aspect-[3/4] items-center justify-center border border-[var(--color-border)] bg-[var(--color-accent-subtle)] text-[0.8rem] uppercase tracking-[0.12em] text-[var(--color-ink-secondary)]">
														PDF
													</div>
												{/if}
												<div class="flex items-baseline justify-between gap-3">
													<h3 class="font-heading text-[0.95rem] font-medium leading-snug tracking-tight">{pub.title}</h3>
													{#if pub.year}
														<span class="shrink-0 text-[0.75rem] text-[var(--color-ink-secondary)]">{pub.year}</span>
													{/if}
												</div>
												<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-[var(--color-ink-secondary)]">
													{#if pub.type}
														<span class="font-heading uppercase tracking-[0.1em] text-[var(--color-accent)]">{pub.type}</span>
													{/if}
													{#if pub.author}
														<span>{pub.author}</span>
													{/if}
													{#if pub.language}
														<span>{pub.language}</span>
													{/if}
													<span class="ml-auto text-[var(--color-accent)] transition-transform duration-200 group-hover:translate-x-0.5">Download ↓</span>
												</div>
											</a>
										</li>
									{/each}
								</ul>
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

	<!-- Outcomes — works and consultancies that name this research as their umbrella. -->
	{#if data.relatedWorks.length > 0 || data.relatedConsultancies.length > 0}
		<section class="mx-auto max-w-[var(--max-w)] border-t border-[var(--color-border)] py-12">
			<SectionLabel tag="h2" class="mb-6">Outcomes</SectionLabel>
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each [...data.relatedWorks, ...data.relatedConsultancies] as related (related.slug + (related.meta.client ? '-c' : '-w'))}
					{@const isConsultancy = !!related.meta.client}
					<a
						href={isConsultancy ? `/consultancies/${related.slug}` : `/works/${related.slug}`}
						class="group block no-underline"
					>
						{#if related.images.thumb}
							<ResponsiveImage
								src={related.images.thumb}
								srcset={related.images.thumbSrcset}
								srcsetWebp={related.images.thumbSrcsetWebp}
								sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
								alt={related.meta.title || related.slug}
								class="mb-3 aspect-[4/3] bg-[var(--color-accent-subtle)]"
								innerClass="transition-transform duration-500 group-hover:scale-[1.04]"
							/>
						{/if}
						<div class="flex items-baseline justify-between gap-3">
							<h3 class="font-heading text-[1rem] font-medium leading-snug tracking-tight">{related.meta.title || related.slug}</h3>
							{#if related.meta.date}
								<span class="shrink-0 text-[0.75rem] text-[var(--color-ink-secondary)]">{related.meta.date}</span>
							{/if}
						</div>
						<div class="mt-1 flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.1em] text-[var(--color-accent)]">
							<span>{isConsultancy ? 'Consultancy' : 'Work'}</span>
							{#if related.meta.lead}
								<span class="normal-case tracking-normal text-[0.82rem] text-[var(--color-ink-secondary)]">— {related.meta.lead}</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Back nav -->
	<nav class="mx-auto max-w-[var(--max-w)] border-t border-[var(--color-border)] py-8">
		<CtaLink href="/research">← All Research</CtaLink>
	</nav>
</article>
</div>
