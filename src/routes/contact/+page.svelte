<script lang="ts">
	import type { PageData } from './$types';
	import { getContext } from 'svelte';
	import SectionLabel from '$lib/components/SectionLabel.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import SEO from '$lib/components/SEO.svelte';

	let { data }: { data: PageData } = $props();
	const getBureau = getContext<() => boolean>('bureau');
	let bureau = $derived(getBureau ? getBureau() : false);
	let mode = $derived(bureau ? 'bureau' : 'artist');

	// Resolve bureau/artist variants — fields may be plain values or { bureau, artist } objects
	let address = $derived(
		data.item.meta.address
			? (Array.isArray(data.item.meta.address) ? data.item.meta.address : data.item.meta.address[mode])
			: null
	);
	let phone = $derived(
		data.item.meta.phone
			? (typeof data.item.meta.phone === 'string' ? data.item.meta.phone : data.item.meta.phone[mode])
			: null
	);
	let email = $derived(
		data.item.meta.email
			? (typeof data.item.meta.email === 'string' ? data.item.meta.email : data.item.meta.email[mode])
			: null
	);
</script>

<SEO
	title="Contact"
	description={data.item.meta.description ??
		'Get in touch — Ole Kristensen / Den Frie Vilje. Copenhagen-based studio for interactive installations, live performances, and design technology.'}
	ogImage={data.item.meta.ogImage}
/>

<article class="px-[var(--gutter)]" class:page-dark={bureau}>
   <header class="mx-auto max-w-[var(--max-w)] py-[clamp(3rem,6vw,6rem)]">
	   <SectionLabel class="mb-4">Contact</SectionLabel>
	   <PageTitle>{data.item.meta.title || 'Contact'}</PageTitle>
   </header>

   <section class="mx-auto max-w-[var(--max-w)] pb-[clamp(5rem,10vw,10rem)]">
	   <dl class="max-w-[50ch] flex flex-col gap-6">
		   {#if address}
			   <div>
				   <SectionLabel tag="dt" class="mb-1">Address</SectionLabel>
				   <dd class="text-[var(--color-ink-secondary)]">
					   {#each address as line, i (i)}
						   {#if i > 0}<br />{/if}{line}
					   {/each}
				   </dd>
			   </div>
		   {/if}

		   {#if email}
			   <div>
				   <SectionLabel tag="dt" class="mb-1">E-mail</SectionLabel>
				   <dd><a href="mailto:{email}" class="text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-accent)]">{email}</a></dd>
			   </div>
		   {/if}

		   {#if phone}
			   <div>
				   <SectionLabel tag="dt" class="mb-1">Phone</SectionLabel>
				   <dd class="text-[var(--color-ink-secondary)]">{phone}</dd>
			   </div>
		   {/if}

		   {#if data.item.meta.profiles?.length}
			   <div>
				   <SectionLabel tag="dt" class="mb-1">Profiles</SectionLabel>
				   <dd class="flex flex-wrap gap-x-4 gap-y-1">
					   {#each data.item.meta.profiles as profile (profile.url)}
						   <a href={profile.url} target="_blank" rel="noopener" class="text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-accent)]">{profile.name}</a>
					   {/each}
				   </dd>
			   </div>
		   {/if}

		   {#if data.item.meta.affiliations?.length}
			   <div>
				   <SectionLabel tag="dt" class="mb-1">Affiliations</SectionLabel>
				   <dd class="flex flex-wrap gap-x-4 gap-y-1">
					   {#each data.item.meta.affiliations as affiliation (affiliation.url)}
						   <a href={affiliation.url} target="_blank" rel="noopener" class="text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-accent)]">{affiliation.name}</a>
					   {/each}
				   </dd>
			   </div>
		   {/if}
	   </dl>

	   {#if data.item.html}
		   <div class="prose mt-12 max-w-[50ch]">
			   {@html data.item.html}
		   </div>
	   {/if}
	</section>
</article>
