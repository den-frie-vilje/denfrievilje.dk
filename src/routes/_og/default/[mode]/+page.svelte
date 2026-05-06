<script lang="ts">
	import ArtistOG from '$lib/og/ArtistOG.svelte';
	import BureauOG from '$lib/og/BureauOG.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

{#if data.mode === 'bureau'}
	<BureauOG title="Design Technology" lead="Design technology · Interactive systems · Cultural & commercial clients" logo="/images/logos/den frie vilje logo black.svg" />
{:else}
	<ArtistOG title={'Software Artist\nDesign Technologist'} lead="Interactive installations · Live performances · Bespoke systems" portrait="/content/about/ole-kristensen.jpg" />
{/if}
