<script lang="ts">
	/**
	 * Source-code section in the detail-page sidebar. Accepts either:
	 *   - `repo: string`  → renders one link as <user>/<repo>
	 *   - `repos: string[]` → renders an unordered list of <user>/<repo> links
	 * Falls back gracefully if neither is provided (renders nothing).
	 */
	interface Props {
		user: string;
		repo?: string | null;
		repos?: string[] | null;
	}

	let { user, repo = null, repos = null }: Props = $props();
</script>

{#if repos?.length}
	<ul class="space-y-0.5 text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">
		{#each repos as r}
			<li>
				<a
					href={`https://github.com/${user}/${r}`}
					target="_blank"
					rel="noopener"
					class="text-[var(--color-accent)] underline">{user}/{r}</a
				>
			</li>
		{/each}
	</ul>
{:else if repo}
	<p class="text-[0.85rem] leading-relaxed text-[var(--color-ink-secondary)]">
		<a
			href={`https://github.com/${user}/${repo}`}
			target="_blank"
			rel="noopener"
			class="text-[var(--color-accent)] underline">{user}/{repo}</a
		>
	</p>
{/if}
