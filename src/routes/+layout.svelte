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
	const isOgRoute = $derived(page.url.pathname.startsWith('/_og/'));

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
		bureau = mode === 'bureau';
		if (SHOW_TOGGLE) {
			localStorage.setItem('dev-domain-mode', mode);
		}
	}

	// Body class is rendered server-side from PUBLIC_DOMAIN_MODE in app.html
	// so the correct palette applies without a hydration flash. This effect
	// only does work when the dev/staging toggle flips bureau at runtime.
	$effect(() => {
		if (typeof document !== 'undefined') {
			document.body.classList.toggle('bureau', bureau);
		}
	});
</script>

{#if isOgRoute}
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
