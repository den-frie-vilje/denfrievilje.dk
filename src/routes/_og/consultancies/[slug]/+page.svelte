<script lang="ts">
	import BureauOG from '$lib/og/BureauOG.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<BureauOG
	title={data.title}
	lead={data.lead ?? undefined}
	heroImage={data.heroImage}
	logo="/images/logos/den frie vilje logo black.svg"
/>
