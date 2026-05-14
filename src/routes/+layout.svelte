<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { Snippet } from 'svelte';
	import { setContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import { PUBLIC_SHOW_PALETTE_TOGGLE } from '$env/static/public';
	import { PRERENDER_BUREAU } from '$lib/site';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	// Initial value comes from PUBLIC_DOMAIN_MODE at build time so the
	// prerendered HTML, body class, and Header state are all already correct
	// for the build's target identity. The runtime toggle below only matters
	// in dev / staging, where editors flip palettes via localStorage.
	let bureau = $state(PRERENDER_BUREAU);

	// _og/* routes are render targets for the Puppeteer-based OG image
	// generator. They must be served chrome-less (no header, footer, or
	// floating palette toggle) so the screenshot captures only the OG layout.
	// The dev-only _picker tree also opts out of site chrome — it's an
	// editing surface, not a public page.
	const isChromeless = $derived(
		page.url.pathname.startsWith('/_og/') || page.url.pathname.startsWith('/_picker/')
	);

	// Toggle is exposed in dev (always) or in any build whose Dockerfile
	// passed PUBLIC_SHOW_PALETTE_TOGGLE=true (staging). When exposed,
	// localStorage persists the operator's last choice so the staging URL
	// remembers which palette you were testing across reloads.
	const SHOW_TOGGLE = import.meta.env.DEV || PUBLIC_SHOW_PALETTE_TOGGLE === 'true';

	setContext('bureau', () => bureau);

	onMount(() => {
		// In dev / staging, the operator's last localStorage choice wins so
		// they can preview the other palette without rebuilding. Production
		// builds don't expose the toggle, so this branch is skipped and the
		// build-mode default sticks.
		if (SHOW_TOGGLE) {
			const saved = localStorage.getItem('dev-domain-mode');
			if (saved === 'bureau' || saved === 'artist') {
				handleToggleDomain(saved);
			}
		}
	});

	function handleToggleDomain(mode: 'artist' | 'bureau') {
		const isBureau = mode === 'bureau';
		// Apply the body class synchronously *before* flipping state so the
		// re-rendered Hero / VoronoiGlass / Header read the right
		// CSS-variable values via getComputedStyle on mount. A $effect would
		// run after the DOM patch, leaving children with the previous palette
		// cached for one frame. The hero's canvas only resolves --color-accent
		// at mount time, so a stale read paints the wrong accent until the
		// next toggle.
		if (typeof document !== 'undefined') {
			document.body.classList.toggle('bureau', isBureau);
		}
		bureau = isBureau;
		if (SHOW_TOGGLE) {
			localStorage.setItem('dev-domain-mode', mode);
		}
	}
</script>

{#if isChromeless}
	{@render children()}
{:else}
	<div class="min-h-screen flex flex-col">
		<Header {bureau} onToggleDomain={handleToggleDomain} />
		<main class="flex-1 pt-[var(--nav-h)]">
			{@render children()}
		</main>
		<Footer />
	</div>
{/if}
