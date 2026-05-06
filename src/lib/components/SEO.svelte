<script lang="ts">
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import {
		SITE_URL,
		SITE_TAGLINE,
		SITE_NAME_BUREAU,
		SITE_NAME_ARTIST,
		SITE_DESCRIPTION_BUREAU,
		SITE_DESCRIPTION_ARTIST,
		SITE_OG_ARTIST,
		SITE_OG_BUREAU
	} from '$lib/site';

	type Props = {
		/** Page-specific title fragment — composed as "{title} — {siteName}". */
		title?: string;
		/** Per-page meta description; falls back to identity default. */
		description?: string;
		/** Absolute URL or root-relative path; resolved against SITE_URL. */
		ogImage?: string;
		ogType?: 'website' | 'article' | 'profile';
		noindex?: boolean;
	};
	let { title, description, ogImage, ogType = 'website', noindex = false }: Props = $props();

	const getBureau = getContext<() => boolean>('bureau');
	const bureau = $derived(getBureau ? getBureau() : false);

	const siteName = $derived(bureau ? SITE_NAME_BUREAU : SITE_NAME_ARTIST);
	const defaultDesc = $derived(bureau ? SITE_DESCRIPTION_BUREAU : SITE_DESCRIPTION_ARTIST);

	const resolvedTitle = $derived(
		title ? `${title} — ${siteName}` : `${siteName} — ${SITE_TAGLINE}`
	);
	const resolvedDescription = $derived(description ?? defaultDesc);
	const canonical = $derived(`${SITE_URL}${page.url.pathname}`);
	const defaultOg = $derived(bureau ? SITE_OG_BUREAU : SITE_OG_ARTIST);
	const resolvedOgImage = $derived(
		ogImage
			? ogImage.startsWith('http')
				? ogImage
				: `${SITE_URL}${ogImage}`
			: `${SITE_URL}${defaultOg}`
	);
</script>

<svelte:head>
	<title>{resolvedTitle}</title>
	<meta name="description" content={resolvedDescription} />
	<link rel="canonical" href={canonical} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<meta property="og:type" content={ogType} />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={resolvedTitle} />
	<meta property="og:description" content={resolvedDescription} />
	<meta property="og:image" content={resolvedOgImage} />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="en_US" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={resolvedTitle} />
	<meta name="twitter:description" content={resolvedDescription} />
	<meta name="twitter:image" content={resolvedOgImage} />
</svelte:head>
