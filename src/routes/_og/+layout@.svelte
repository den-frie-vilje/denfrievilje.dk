<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="og-root">
	{@render children()}
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		background: transparent;
	}
	.og-root {
		width: 1200px;
		height: 630px;
		overflow: hidden;
	}
</style>
