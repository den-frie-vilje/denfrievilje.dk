<script lang="ts">
	import SectionLabel from './SectionLabel.svelte';

	/**
	 * Section header used on the homepage above each featured-content block
	 * (Works, Consultancies, Research). Eyebrow + h2 on the left, lead text
	 * right-aligned on the right at md+, stacked at <md, with a bottom
	 * border separating from the row entries below.
	 */
	interface Props {
		eyebrow?: string | null;
		title: string;
		lead?: string | null;
	}

	let { eyebrow = null, title, lead = null }: Props = $props();
</script>

<div
	class="mb-[clamp(2rem,4vw,4rem)] flex flex-col items-start justify-between gap-4 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-end"
>
	<div>
		{#if eyebrow}
			<SectionLabel class="mb-2">{eyebrow}</SectionLabel>
		{/if}
		<h2 class="font-heading text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-none tracking-tight">
			{@html title}
		</h2>
	</div>
	{#if lead}
		<p class="text-[0.9rem] text-[var(--color-ink-secondary)] md:max-w-[35ch] md:text-right">{lead}</p>
	{/if}
</div>
