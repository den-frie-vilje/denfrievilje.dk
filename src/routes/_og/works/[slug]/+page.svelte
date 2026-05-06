<script lang="ts">
	import ArtistOG from '$lib/og/ArtistOG.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ArtistOG
	title={data.title}
	lead={data.lead ?? undefined}
	heroImage={data.heroImage}
	portrait="/content/about/ole-kristensen.jpg"
/>
