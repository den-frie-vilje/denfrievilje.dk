<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { Snippet } from 'svelte';
	import { setContext, onMount } from 'svelte';
	import { PUBLIC_SHOW_PALETTE_TOGGLE } from '$env/static/public';
	import '../app.css';

	let { children }: { children: Snippet } = $props();
	let bureau = $state(false);

	// Toggle is exposed in dev (always) or in any build whose Dockerfile
	// passed PUBLIC_SHOW_PALETTE_TOGGLE=true (staging). When exposed,
	// localStorage persists the operator's last choice so the staging URL
	// remembers which palette you were testing across reloads.
	// Read via $env/static/public — Vite's import.meta.env only exposes the
	// VITE_ prefix by default; SvelteKit's PUBLIC_ scheme lives in $env.
	const SHOW_TOGGLE = import.meta.env.DEV || PUBLIC_SHOW_PALETTE_TOGGLE === 'true';

	setContext('bureau', () => bureau);

	onMount(() => {
		// When the toggle is exposed (dev or staging), the operator's last
		// localStorage choice wins — staging hostnames all end in
		// `.stage.denfrievilje.dk` so the bare hostname check would otherwise
		// pin bureau and prevent testing the artist palette.
		if (SHOW_TOGGLE) {
			const saved = localStorage.getItem('dev-domain-mode');
			if (saved === 'bureau' || saved === 'artist') {
				handleToggleDomain(saved);
				return;
			}
		}
		if (window.location.hostname.endsWith('denfrievilje.dk')) {
			handleToggleDomain('bureau');
		}
	});

	function handleToggleDomain(mode: 'artist' | 'bureau') {
		bureau = mode === 'bureau';
		if (typeof document !== 'undefined') {
			document.body.classList.toggle('bureau', bureau);
		}
		if (SHOW_TOGGLE) {
			localStorage.setItem('dev-domain-mode', mode);
		}
	}
</script>

<div class="min-h-screen flex flex-col">
	<Header {bureau} onToggleDomain={handleToggleDomain} />
	<main class="flex-1 pt-[var(--nav-h)]">
		{@render children()}
	</main>
	<Footer />
</div>
