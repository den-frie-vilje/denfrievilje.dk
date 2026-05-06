<script lang="ts">
	type Props = { data: Record<string, unknown> | Record<string, unknown>[] };
	let { data }: Props = $props();

	// Escape U+003C so a stray closing-script literal inside string fields
	// cannot break out of the surrounding ld+json block.
	const json = $derived(JSON.stringify(data).replace(/[<]/g, '\\u003c'));
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${json}<\/script>`}
</svelte:head>
