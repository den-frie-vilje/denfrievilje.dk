<script lang="ts">
	/**
	 * Generic iframe embed for an external interactive piece (e.g. the live
	 * longing.gl player). Deliberately a one-to-one mirror of
	 * VimeoPlayer.svelte — same figure/aspect wrapper, same allow list, same
	 * caption treatment — so the two read as one family on a detail page.
	 *
	 * The `url` is used verbatim as the iframe src; any host-side switches
	 * (like longing.gl's `?embed`) belong in the frontmatter URL, not here.
	 */
	interface Props {
		url: string;
		title?: string;
	}

	let { url, title }: Props = $props();
</script>

<figure class="not-prose">
	<div class="relative aspect-video w-full overflow-hidden rounded-sm bg-black">
		<iframe
			src={url}
			title={title || 'Embedded player'}
			allow="autoplay; fullscreen; picture-in-picture"
			allowfullscreen
			loading="lazy"
			class="absolute inset-0 h-full w-full border-0"
		></iframe>
	</div>
	{#if title}
		<figcaption class="mt-3 font-heading text-[0.75rem] text-[var(--color-ink-secondary)]">{title}</figcaption>
	{/if}
</figure>
