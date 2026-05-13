<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { applyAction, enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Local state: which selected items to keep, which source items to add,
	// and the operator's order for the keeps. The form action consumes both.
	let keep = $state<string[]>(data.selected.map((s) => s.name));
	let adds = $state<string[]>([]);
	let sourceInput = $state(data.source?.path ?? '');
	let busy = $state(false);

	$effect(() => {
		// Reset local state when the page data changes (after save or source
		// switch). We re-derive from the server's view so a stale UI never
		// silently disagrees with the filesystem.
		keep = data.selected.map((s) => s.name);
		adds = [];
		sourceInput = data.source?.path ?? '';
	});

	function toggleKeep(name: string) {
		const i = keep.indexOf(name);
		if (i === -1) keep = [...keep, name];
		else keep = [...keep.slice(0, i), ...keep.slice(i + 1)];
	}

	function toggleAdd(srcPath: string) {
		const i = adds.indexOf(srcPath);
		if (i === -1) adds = [...adds, srcPath];
		else adds = [...adds.slice(0, i), ...adds.slice(i + 1)];
	}

	function move(name: string, delta: -1 | 1) {
		const i = keep.indexOf(name);
		const j = i + delta;
		if (i === -1 || j < 0 || j >= keep.length) return;
		const next = [...keep];
		[next[i], next[j]] = [next[j], next[i]];
		keep = next;
	}

	function openSource(p: string) {
		goto(`?source=${encodeURIComponent(p)}`, { keepFocus: true, noScroll: false });
	}

	function thumbUrl(filePath: string, size = 320) {
		return `/_picker/raw?path=${encodeURIComponent(filePath)}&size=${size}`;
	}
</script>

<svelte:head>
	<title>Picker — {data.section}/{data.slug}</title>
</svelte:head>

<div class="picker">
	<header class="head">
		<h1>Gallery picker</h1>
		<p class="path">
			<code>src/content/{data.section}/{data.slug}/</code>
			<a href="/{data.section}/{data.slug}" target="_blank">view live →</a>
		</p>
	</header>

	<form class="src" method="get">
		<label for="source">Source folder</label>
		<input
			id="source"
			name="source"
			type="text"
			placeholder="/Volumes/home/Projects/…"
			bind:value={sourceInput}
		/>
		<button type="submit">Browse</button>
		<p class="hint">Allowed prefixes: {data.allowedPrefixes.join(', ')}</p>
	</form>

	<div class="grid">
		<section class="selected">
			<h2>Gallery <span class="count">{keep.length}</span></h2>
			<p class="hint">Click to remove. Use ← → to reorder. Re-numbered on save.</p>
			<ul class="thumbs">
				{#each keep as name, i (name)}
					{@const item = data.selected.find((s) => s.name === name)}
					<li>
						<button class="thumb" type="button" onclick={() => toggleKeep(name)} title="Remove">
							{#if item}<img src={item.url} alt={name} loading="lazy" />{/if}
							<span class="meta">{name}</span>
						</button>
						<div class="reorder">
							<button type="button" onclick={() => move(name, -1)} disabled={i === 0}>←</button>
							<span>{i + 1}</span>
							<button type="button" onclick={() => move(name, 1)} disabled={i === keep.length - 1}>→</button>
						</div>
					</li>
				{/each}
				{#if keep.length === 0}
					<li class="empty">No photos yet — pick from a source folder.</li>
				{/if}
			</ul>
			{#each data.selected as item (item.name + '-removed')}
				{#if !keep.includes(item.name)}
					<button
						class="thumb removed"
						type="button"
						onclick={() => toggleKeep(item.name)}
						title="Restore"
					>
						<img src={item.url} alt={item.name} loading="lazy" />
						<span class="meta">{item.name} (will remove)</span>
					</button>
				{/if}
			{/each}
		</section>

		<section class="available">
			{#if data.source}
				<h2>
					<span title={data.source.path}>{data.source.path.split('/').slice(-2).join('/')}</span>
					<span class="count">{data.source.images.length}</span>
				</h2>
				<nav class="crumbs">
					{#if data.source.parent}
						<a href="?source={encodeURIComponent(data.source.parent)}">↑ ..</a>
					{/if}
					{#each data.source.subdirs as sub (sub)}
						<a href="?source={encodeURIComponent(data.source.path + '/' + sub)}">{sub}/</a>
					{/each}
				</nav>
				<ul class="thumbs">
					{#each data.source.images as img (img.name)}
						{@const abs = data.source.path + '/' + img.name}
						{@const isAdded = adds.includes(abs)}
						<li>
							<button
								class="thumb {isAdded ? 'added' : ''}"
								type="button"
								onclick={() => toggleAdd(abs)}
								title={isAdded ? 'Click to un-stage' : 'Click to add'}
							>
								<img src={thumbUrl(abs, 320)} alt={img.name} loading="lazy" />
								<span class="meta">{img.name}{isAdded ? ' ✓' : ''}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<h2>Source</h2>
				<p class="hint">Paste a folder path above and click Browse to load candidates.</p>
			{/if}
		</section>
	</div>

	<form
		method="POST"
		action="?/save"
		class="save"
		use:enhance={() => {
			busy = true;
			return async ({ result }) => {
				busy = false;
				await applyAction(result);
				await invalidateAll();
			};
		}}
	>
		<input type="hidden" name="keep" value={keep.join('\n')} />
		<input type="hidden" name="add" value={adds.join('\n')} />
		<button type="submit" disabled={busy}>{busy ? 'Saving…' : `Save (${keep.length + adds.length} photos)`}</button>
		{#if form?.success}
			<span class="ok">Saved {form.finalCount} photos.</span>
		{/if}
		{#if page.form?.error}
			<span class="err">{page.form.error}</span>
		{/if}
	</form>
</div>

<style>
	.picker {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		font-family: var(--font-heading, system-ui), sans-serif;
	}
	h1 {
		font-size: 1.4rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin: 0 0 0.25rem;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0 0 0.5rem;
	}
	.count {
		font-size: 0.7rem;
		font-weight: 400;
		color: var(--color-ink-secondary, #888);
	}
	.path {
		margin: 0 0 1.5rem;
		font-size: 0.8rem;
		color: var(--color-ink-secondary, #888);
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	.path code {
		font-family: ui-monospace, monospace;
	}
	.hint {
		font-size: 0.75rem;
		color: var(--color-ink-secondary, #888);
		margin: 0.5rem 0;
	}
	.src {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 2rem;
		padding: 1rem;
		border: 1px solid var(--color-border, #ddd);
		background: var(--color-accent-subtle, #f5f5f5);
	}
	.src .hint {
		grid-column: 1 / -1;
		margin: 0;
	}
	.src label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.src input {
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
		padding: 0.5rem;
		border: 1px solid var(--color-border, #ddd);
		background: white;
	}
	.src button {
		padding: 0.5rem 1rem;
		background: var(--color-ink, #111);
		color: white;
		border: 0;
		cursor: pointer;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
	@media (max-width: 1000px) {
		.grid { grid-template-columns: 1fr; }
	}
	.thumbs {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.5rem;
	}
	.thumbs li {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.empty {
		grid-column: 1 / -1;
		text-align: center;
		font-size: 0.8rem;
		color: var(--color-ink-secondary, #888);
		padding: 2rem;
		border: 1px dashed var(--color-border, #ddd);
	}
	.thumb {
		position: relative;
		display: block;
		padding: 0;
		border: 2px solid transparent;
		background: var(--color-accent-subtle, #f5f5f5);
		cursor: pointer;
		overflow: hidden;
		text-align: left;
	}
	.thumb img {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		transition: transform 0.2s;
	}
	.thumb:hover { border-color: var(--color-accent, #0c0); }
	.thumb:hover img { transform: scale(1.04); }
	.thumb.added { border-color: var(--color-accent, #0c0); }
	.thumb.added::after {
		content: '✓ staged';
		position: absolute;
		top: 4px;
		right: 4px;
		background: var(--color-accent, #0c0);
		color: white;
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: 2px;
	}
	.thumb.removed {
		opacity: 0.4;
		border-color: red;
	}
	.thumb .meta {
		display: block;
		font-family: ui-monospace, monospace;
		font-size: 0.65rem;
		padding: 0.25rem 0.4rem;
		color: var(--color-ink-secondary, #888);
		background: white;
		border-top: 1px solid var(--color-border, #ddd);
		word-break: break-all;
	}
	.reorder {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.7rem;
		color: var(--color-ink-secondary, #888);
	}
	.reorder button {
		border: 0;
		background: transparent;
		cursor: pointer;
		padding: 0 0.25rem;
		font-size: 0.85rem;
	}
	.reorder button:disabled { opacity: 0.2; cursor: default; }
	.crumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.crumbs a {
		padding: 0.2rem 0.5rem;
		border: 1px solid var(--color-border, #ddd);
		color: var(--color-ink, #111);
		text-decoration: none;
	}
	.crumbs a:hover { background: var(--color-accent-subtle, #f5f5f5); }
	.save {
		margin-top: 2rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border, #ddd);
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	.save button {
		padding: 0.75rem 1.5rem;
		background: var(--color-accent, #0c0);
		color: white;
		border: 0;
		cursor: pointer;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.save button:disabled { opacity: 0.4; cursor: default; }
	.ok { color: var(--color-accent, #0c0); font-size: 0.85rem; }
	.err { color: red; font-size: 0.85rem; }
</style>
