<script lang="ts">
	import type { PageData } from './$types';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import ResponsiveImage from '$lib/components/ResponsiveImage.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';
	import { SITE_URL } from '$lib/site';
	import { buildBreadcrumb, buildCreativeWorkItemList } from '$lib/schema-helpers';

	let { data }: { data: PageData } = $props();

	const pageUrl = `${SITE_URL}/research/`;
	const allResearch = $derived(data.grouped.flatMap((g) => g.items));
	const collectionPage = $derived.by(() => ({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		'@id': pageUrl,
		url: pageUrl,
		name: data.section?.meta.title?.replace(/<[^>]+>/g, '') ?? 'Research',
		description: data.section?.meta.lead ?? '',
		mainEntity: buildCreativeWorkItemList(
			allResearch.map((w) => ({ slug: w.slug, name: w.meta.title || w.slug })),
			{ name: 'Research', baseUrl: `${SITE_URL}/research`, descending: true }
		)
	}));
	const breadcrumb = buildBreadcrumb([
		{ name: 'Home', url: `${SITE_URL}/` },
		{ name: 'Research', url: pageUrl }
	]);
</script>

<SEO
	title={data.section?.meta.label ?? 'Research'}
	description={data.section?.meta.lead ?? ''}
/>
<JsonLd data={[collectionPage, breadcrumb]} />

<div class="page-light">
{#if data.section?.meta.title}
	<PageHeader
		tag="section"
		eyebrow={data.section.meta.label ?? null}
		title={data.section.meta.title}
		lead={data.section.meta.lead ?? null}
	/>
{/if}

<section class="px-[var(--gutter)] pb-[clamp(5rem,10vw,10rem)]">
	<div class="mx-auto max-w-[var(--max-w)]">
		{#each data.grouped as group, gi (group.year)}
			{#if gi > 0}
				<hr class="my-8 hidden border-[var(--color-border)] md:block" />
			{/if}
			<div class="animate-fade-up mb-12 md:mb-0">
				<div class="mb-6 flex items-center gap-4 md:hidden">
					<span class="font-heading text-[0.75rem] font-medium tracking-wide text-[var(--color-ink-secondary)]">{group.year || 'Undated'}</span>
					<span class="h-px flex-1 bg-[var(--color-border)]"></span>
				</div>

				<!-- Mobile: card grid -->
				<div class="grid grid-cols-1 gap-6 md:hidden">
					{#each group.items as item (item.slug)}
						<a href="/research/{item.slug}" class="group block no-underline">
							{#if item.images.thumb}
								<ResponsiveImage
									src={item.images.thumb}
									srcset={item.images.thumbSrcset}
									srcsetWebp={item.images.thumbSrcsetWebp}
									sizes="100vw"
									alt={item.meta.title || item.slug}
									class="mb-3 aspect-[4/3] bg-[var(--color-accent-subtle)]"
									innerClass="transition-transform duration-500 group-hover:scale-[1.04]"
								/>
							{/if}
							<h3 class="mb-0.5 font-heading text-[1rem] font-medium tracking-tight">{item.meta.title || item.slug}</h3>
							{#if item.meta.lead}
								<p class="mt-1 text-[0.82rem] leading-relaxed text-[var(--color-ink-secondary)]">{item.meta.lead}</p>
							{/if}
							{#if item.meta.tags}
								<div class="mt-2 flex flex-wrap gap-1.5">
									{#each item.meta.tags as tag}
										<Tag>{tag}</Tag>
									{/each}
								</div>
							{/if}
						</a>
					{/each}
				</div>

				<!-- Desktop: horizontal rows -->
				<div class="hidden md:block">
					{#each group.items as item, ii (item.slug)}
						<a href="/research/{item.slug}" class="group grid grid-cols-[5rem_12rem_1fr] items-start gap-6 no-underline lg:grid-cols-[7rem_16rem_1fr] xl:grid-cols-[9rem_16rem_1fr] {ii > 0 ? 'mt-8' : ''}">
							<div class="pt-0 leading-none">
								{#if ii === 0}
									<span class="font-heading text-[1.1rem] font-medium leading-none tracking-wide text-[var(--color-ink-secondary)]">{group.year || 'Undated'}</span>
								{/if}
							</div>
							{#if item.images.thumb}
								<ResponsiveImage
									src={item.images.thumb}
									srcset={item.images.thumbSrcset}
									srcsetWebp={item.images.thumbSrcsetWebp}
									sizes="16rem"
									alt={item.meta.title || item.slug}
									class="aspect-square bg-[var(--color-accent-subtle)]"
									innerClass="transition-transform duration-500 group-hover:scale-[1.04]"
								/>
							{/if}
							<div>
								<h3 class="mb-0.5 font-heading text-[1rem] font-medium tracking-tight">{item.meta.title || item.slug}</h3>
								{#if item.meta.lead}
									<p class="mt-1 text-[0.82rem] leading-relaxed text-[var(--color-ink-secondary)]">{item.meta.lead}</p>
								{/if}
								{#if item.meta.tags}
									<div class="mt-2 flex flex-wrap gap-1.5">
										{#each item.meta.tags as tag}
											<Tag>{tag}</Tag>
										{/each}
									</div>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
</div>
