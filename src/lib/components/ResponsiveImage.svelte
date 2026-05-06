<script lang="ts">
	interface Props {
		/** Low-res fallback URL (shown first, JPEG) */
		src: string;
		/** Responsive JPEG srcset, e.g. "img-480.jpg 480w, img-960.jpg 960w" */
		srcset?: string | null;
		/** Optional WebP srcset for the same sizes — browsers that support WebP
		 *  pick this; the JPEG <img> remains the universal fallback. */
		srcsetWebp?: string | null;
		/** Sizes attribute for srcset resolution selection */
		sizes?: string;
		alt?: string;
		class?: string;
		/** Classes applied to the inner image wrapper (e.g. hover transforms) */
		innerClass?: string;
		loading?: 'lazy' | 'eager';
	}

	let {
		src,
		srcset = null,
		srcsetWebp = null,
		sizes = '100vw',
		alt = '',
		class: className = '',
		innerClass = '',
		loading = 'lazy'
	}: Props = $props();

	let hiLoaded = $state(false);
	let hiSrc = $state('');
	let hiEl: HTMLImageElement | undefined = $state();

	$effect(() => {
		if (!srcset) return;
		hiLoaded = false;
		// Parse the highest resolution URL from the JPEG srcset; if the browser
		// picks WebP via the <source>, this URL is still the canonical fallback
		// the <img> will request when WebP isn't supported.
		const parts = srcset.split(',').map((s) => s.trim());
		const last = parts[parts.length - 1];
		hiSrc = last.split(/\s+/)[0];
	});

	function onHiLoad() {
		hiLoaded = true;
	}
</script>

<div class="responsive-image-clip {className}">
	<div class="responsive-image {innerClass}">
		<img {src} {alt} {loading} class="responsive-image-lo" />
		{#if srcset}
			<picture>
				{#if srcsetWebp}
					<source type="image/webp" srcset={srcsetWebp} {sizes} />
				{/if}
				<img
					bind:this={hiEl}
					src={hiSrc}
					{srcset}
					{sizes}
					{alt}
					{loading}
					class="responsive-image-hi"
					class:loaded={hiLoaded}
					onload={onHiLoad}
				/>
			</picture>
		{/if}
	</div>
</div>

<style>
	.responsive-image-clip {
		overflow: hidden;
	}
	.responsive-image {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.responsive-image-lo {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	picture {
		position: absolute;
		inset: 0;
		display: block;
	}
	.responsive-image-hi {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 0.4s ease;
	}
	.responsive-image-hi.loaded {
		opacity: 1;
	}
</style>
