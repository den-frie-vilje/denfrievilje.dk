<script lang="ts">
	/**
	 * One row in the "Appearances" list on a detail page. Responsive:
	 *   <sm: title on its own row, then date right-aligned, then place
	 *        right-aligned below.
	 *   sm+: title left, place + date inline right.
	 * Hover left-padding animation gated behind sm.
	 */
	interface Props {
		href?: string | null;
		occasion: string;
		place?: string | null;
		date?: string | null;
	}

	let { href = null, occasion, place = null, date = null }: Props = $props();
</script>

<a
	href={href || undefined}
	target={href ? '_blank' : undefined}
	rel={href ? 'noopener' : undefined}
	class="group flex flex-col gap-1 border-b border-[var(--color-border)] py-3 no-underline first:border-t sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:transition-[padding-left] sm:duration-300 sm:hover:pl-2"
>
	<span class="font-heading text-[0.9rem] font-medium text-[var(--color-ink)]">{occasion}</span>
	<div
		class="flex shrink-0 flex-col items-end gap-0 text-right text-[0.78rem] text-[var(--color-ink-secondary)] sm:flex-row sm:items-center sm:gap-4 sm:text-left"
	>
		{#if place}<span class="order-2 sm:order-1">{place}</span>{/if}
		{#if date}<span class="order-1 sm:order-2">{date}</span>{/if}
	</div>
</a>
