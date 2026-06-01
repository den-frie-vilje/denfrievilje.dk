<script lang="ts">
	import DuotoneImage from './DuotoneImage.svelte';

	/**
	 * Horizontal list-row used on listings (consultancies) and on the homepage
	 * featured snippets (consultancies, research). Stacks vertically at <md:
	 * full-width 3:2 thumbnail above the title/lead, with the meta column
	 * stacked below right-aligned. Reverts to a [5rem 1fr auto] grid row at
	 * md+.
	 *
	 * `metaParts` is an array of optional strings rendered as inline meta on
	 * the right at md+, stacked at <md. Falsy values are filtered.
	 */
	interface Props {
		href: string;
		title: string;
		lead?: string | null;
		thumb?: { src: string; srcset?: string | null; srcsetWebp?: string | null } | null;
		metaParts?: Array<string | number | null | undefined>;
	}

	let { href, title, lead = null, thumb = null, metaParts = [] }: Props = $props();

	const filteredMeta = $derived(metaParts.filter((p) => p !== null && p !== undefined && p !== ''));
</script>

<a
	{href}
	class="group flex flex-col gap-3 border-b border-[var(--color-border)] py-5 no-underline first:border-t md:grid md:grid-cols-[5rem_1fr_auto] md:items-start md:gap-6 md:transition-[padding-left] md:duration-300 md:hover:pl-2"
>
	{#if thumb?.src}
		<DuotoneImage
			src={thumb.src}
			srcset={thumb.srcset}
			srcsetWebp={thumb.srcsetWebp}
			sizes="(max-width: 768px) 100vw, 5rem"
			class="aspect-[3/2] w-full overflow-hidden md:aspect-auto md:h-14 md:w-20 md:shrink-0"
		/>
	{/if}
	<div>
		<h3 class="mb-1 font-heading text-[1.1rem] font-medium leading-none tracking-tight">{title}</h3>
		{#if lead}
			<p class="max-w-[40ch] text-[0.82rem] text-[var(--color-ink-secondary)]">{lead}</p>
		{/if}
	</div>
	<div
		class="flex flex-col items-start gap-1 text-[0.75rem] text-[var(--color-ink-secondary)] md:shrink-0 md:flex-row md:items-center md:gap-6"
	>
		{#each filteredMeta as part}
			<span>{part}</span>
		{/each}
		<span
			class="hidden text-[1.1rem] text-[var(--color-accent)] transition-transform duration-300 group-hover:translate-x-1 md:inline"
			>→</span
		>
	</div>
</a>
