<script lang="ts">
	interface Props {
		src: string;
		srcset?: string | null;
		srcsetWebp?: string | null;
		sizes?: string;
		alt?: string;
		class?: string;
	}

	let {
		src,
		srcset = null,
		srcsetWebp = null,
		sizes = '100vw',
		alt = '',
		class: className = ''
	}: Props = $props();
</script>

<div class="relative {className}">
	<picture>
		{#if srcsetWebp}
			<source type="image/webp" srcset={srcsetWebp} sizes={srcset ? sizes : undefined} />
		{/if}
		<img
			{src}
			srcset={srcset ?? undefined}
			sizes={srcset ? sizes : undefined}
			{alt}
			loading="lazy"
			class="h-full w-full object-cover opacity-50 grayscale contrast-110 brightness-70 transition-[filter,opacity] duration-400 group-hover:opacity-100 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
		/>
	</picture>
	<div class="pointer-events-none absolute inset-0 bg-[var(--color-accent-duotone)] mix-blend-hard-light transition-opacity duration-400 group-hover:opacity-0"></div>
</div>
