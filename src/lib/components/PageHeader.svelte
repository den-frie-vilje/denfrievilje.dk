<script lang="ts">
	import SectionLabel from './SectionLabel.svelte';
	import PageTitle from './PageTitle.svelte';
	import type { Snippet } from 'svelte';

	/**
	 * Page header used on both listing pages (eyebrow + title + lead) and
	 * detail pages (back-link + title + lead + optional metadata row).
	 *
	 * The eyebrow / back-link is gated such that:
	 *  - If `backHref` + `backLabel` are set → render the animated back link.
	 *  - Else if `eyebrow` is set → render the SectionLabel.
	 *
	 * `tag` controls the semantic wrapper. Defaults to `header`.
	 *
	 * `wrap` controls whether the component emits its own `px-[var(--gutter)]`
	 * padding. Default `true` for standalone listings. Set `wrap={false}`
	 * when the parent (e.g. an `<article>`) already provides horizontal
	 * gutter padding.
	 *
	 * `leadSize` toggles between the listing's compact lead and the detail
	 * page's larger leading paragraph.
	 *
	 * `children` is rendered after the lead — used by detail pages for the
	 * date + tags row.
	 */
	interface Props {
		title: string;
		lead?: string | null;
		eyebrow?: string | null;
		backHref?: string | null;
		backLabel?: string | null;
		leadSize?: 'sm' | 'lg';
		tag?: 'header' | 'section';
		wrap?: boolean;
		children?: Snippet;
	}

	let {
		title,
		lead = null,
		eyebrow = null,
		backHref = null,
		backLabel = null,
		leadSize = 'sm',
		tag = 'header',
		wrap = true,
		children
	}: Props = $props();
</script>

{#snippet inner()}
	<div class="mx-auto max-w-[var(--max-w)] py-[clamp(3rem,6vw,6rem)]">
		{#if backHref && backLabel}
			<a
				href={backHref}
				class="mb-6 block w-fit font-heading text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--color-accent)] no-underline"
				><span class="back-arrow">←&nbsp;</span>{backLabel}</a
			>
		{:else if eyebrow}
			<SectionLabel class="mb-6 !text-[0.72rem]">{eyebrow}</SectionLabel>
		{/if}
		<PageTitle>{@html title}</PageTitle>
		{#if lead}
			{#if leadSize === 'lg'}
				<p class="mt-4 max-w-[50ch] text-[1.1rem] leading-relaxed text-[var(--color-ink-secondary)]">{lead}</p>
			{:else}
				<p class="mt-4 max-w-[40ch] text-[var(--color-ink-secondary)]">{lead}</p>
			{/if}
		{/if}
		{#if children}{@render children()}{/if}
	</div>
{/snippet}

{#if wrap}
	<svelte:element this={tag} class="px-[var(--gutter)]">
		{@render inner()}
	</svelte:element>
{:else}
	<svelte:element this={tag}>
		{@render inner()}
	</svelte:element>
{/if}
