<script lang="ts">
	import { PUBLIC_SHOW_PALETTE_TOGGLE } from '$env/static/public';

	let { bureau = false, onToggleDomain }: { bureau?: boolean; onToggleDomain?: (mode: 'artist' | 'bureau') => void } = $props();
	let menuOpen = $state(false);
	let navLogoOpacity = $state(1);
	// Show the floating bureau/artist toggle in dev (always) or in any
	// build whose Dockerfile passed PUBLIC_SHOW_PALETTE_TOGGLE=true (staging).
	// Read via $env/static/public — Vite's import.meta.env only exposes the
	// VITE_ prefix by default; SvelteKit's PUBLIC_ scheme lives in $env.
	const SHOW_TOGGLE = import.meta.env.DEV || PUBLIC_SHOW_PALETTE_TOGGLE === 'true';

	$effect(() => {
		if (!bureau) {
			navLogoOpacity = 1;
			return;
		}

		function onScroll() {
			const heroLogo = document.querySelector('.hero-logo-large');
			if (!heroLogo) {
				navLogoOpacity = 1;
				return;
			}
			const rect = heroLogo.getBoundingClientRect();
			const logoMidY = rect.top + rect.height / 2;
			const logoTopY = rect.top;

			if (logoMidY >= 0) {
				navLogoOpacity = 0;
			} else if (logoTopY <= 0) {
				navLogoOpacity = 1;
			} else {
				navLogoOpacity = Math.min(1, -logoMidY / (rect.height / 2));
			}
		}

		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<nav class="fixed top-0 left-0 right-0 z-100 border-b border-[var(--color-border)] bg-[oklch(from_var(--color-surface)_l_c_h_/_0.85)] backdrop-blur-[16px] px-[var(--gutter)] transition-[background,border-color] duration-500">
	<div class="mx-auto flex h-[var(--nav-h)] max-w-[var(--max-w)] items-center justify-between">
		<a href="/" class="font-heading text-[1rem] font-medium tracking-tight text-[var(--color-ink)] no-underline">
			{#if bureau}
				<img src="/images/logos/den%20frie%20vilje%20logo%20knockout.svg" alt="Den Frie Vilje" class="h-7" style="opacity: {navLogoOpacity}" />
			{:else}
				Ole Kristensen
			{/if}
		</a>

		<!-- Desktop nav -->
		<ul class="hidden items-center gap-7 md:flex">
			<li><a href="/works" class="font-heading text-[0.78rem] font-normal tracking-wide text-[var(--color-ink-secondary)] no-underline transition-colors duration-200 hover:text-[var(--color-accent)]">Works</a></li>
			<li><a href="/consultancies" class="font-heading text-[0.78rem] font-normal tracking-wide text-[var(--color-ink-secondary)] no-underline transition-colors duration-200 hover:text-[var(--color-accent)]">Consultancies</a></li>
			<li><a href="/about" class="font-heading text-[0.78rem] font-normal tracking-wide text-[var(--color-ink-secondary)] no-underline transition-colors duration-200 hover:text-[var(--color-accent)]">About</a></li>
			<li><a href="/contact" class="font-heading text-[0.78rem] font-normal tracking-wide text-[var(--color-ink-secondary)] no-underline transition-colors duration-200 hover:text-[var(--color-accent)]">Contact</a></li>
		</ul>

		<!-- Mobile toggle -->
		<button
			class="relative z-50 flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
			aria-label="Toggle menu"
			onclick={() => menuOpen = !menuOpen}
		>
			<span class="block h-[1.5px] w-5 bg-[var(--color-ink)] transition-transform duration-300 {menuOpen ? 'translate-y-[5px] rotate-45' : ''}"></span>
			<span class="block h-[1.5px] w-5 bg-[var(--color-ink)] transition-opacity duration-300 {menuOpen ? 'opacity-0' : ''}"></span>
			<span class="block h-[1.5px] w-5 bg-[var(--color-ink)] transition-transform duration-300 {menuOpen ? '-translate-y-[5px] -rotate-45' : ''}"></span>
		</button>
	</div>
</nav>

<!-- Dev-only domain toggle -->
{#if SHOW_TOGGLE && onToggleDomain}
<div class="fixed bottom-6 right-6 z-[1000] flex overflow-hidden shadow-[0_4px_24px_oklch(0_0_0/0.2)]">
	<button
		class="px-3 py-2 font-heading text-[0.7rem] font-medium uppercase tracking-[0.06em] transition-all duration-300 {bureau ? '' : 'outline outline-2 outline-offset-[-2px] outline-[var(--color-accent)]'}"
		style="background: oklch(0.98 0.003 100); color: oklch(0.12 0.01 260)"
		onclick={() => onToggleDomain('artist')}
	>ole.kristensen.name</button>
	<button
		class="px-3 py-2 font-heading text-[0.7rem] font-medium uppercase tracking-[0.06em] transition-all duration-300 {bureau ? 'outline outline-2 outline-offset-[-2px] outline-[var(--color-accent)]' : ''}"
		style="background: oklch(0.17 0.012 270); color: oklch(0.93 0.005 260)"
		onclick={() => onToggleDomain('bureau')}
	>denfrievilje.dk</button>
</div>
{/if}

<!-- Mobile overlay -->
{#if menuOpen}
<div
	class="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[var(--color-surface)]"
	role="dialog"
	aria-modal="true"
>
	<a href="/works" onclick={() => menuOpen = false} class="font-heading text-2xl font-medium text-[var(--color-ink)] no-underline transition-colors hover:text-[var(--color-accent)]">Works</a>
	<a href="/consultancies" onclick={() => menuOpen = false} class="font-heading text-2xl font-medium text-[var(--color-ink)] no-underline transition-colors hover:text-[var(--color-accent)]">Consultancies</a>
	<a href="/about" onclick={() => menuOpen = false} class="font-heading text-2xl font-medium text-[var(--color-ink)] no-underline transition-colors hover:text-[var(--color-accent)]">About</a>
	<a href="/contact" onclick={() => menuOpen = false} class="font-heading text-2xl font-medium text-[var(--color-ink)] no-underline transition-colors hover:text-[var(--color-accent)]">Contact</a>
</div>
{/if}