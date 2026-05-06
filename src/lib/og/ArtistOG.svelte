<script lang="ts">
	type Props = {
		title: string;
		lead?: string;
		heroImage?: string | null;
		portrait?: string | null;
	};
	let { title, lead, heroImage = null, portrait = null }: Props = $props();
	const usePortrait = $derived(!heroImage && portrait);
	const bgImage = $derived(heroImage ?? (usePortrait ? portrait : null));
</script>

<div
	class="frame"
	class:frame-portrait={usePortrait}
	style:background-image={bgImage ? `url(${bgImage})` : 'none'}
>
	<div class="scrim" class:scrim-portrait={usePortrait}></div>
	<div class="content">
		<div class="brand">Ole Kristensen</div>
		<div>
			<div class="bar"></div>
			<h1 class="title">{title}</h1>
			{#if lead}
				<p class="lead">{lead}</p>
			{/if}
		</div>
		<div class="foot">
			<span class="url">ole.kristensen.name</span>
		</div>
	</div>
</div>

<style>
	.frame {
		position: relative;
		width: 1200px;
		height: 630px;
		background-color: #0a0a0c;
		background-position: center;
		background-size: cover;
		background-repeat: no-repeat;
		font-family: 'DM Sans', sans-serif;
		color: white;
	}
	/* Default-artist style: portrait floats right, zoomed in and pushed past
	   the right edge so the face fills the right third without leaving a
	   centred-photo gap. The scrim covers the seam on the left. */
	.frame-portrait {
		background-position: calc(100% + 140px) center;
		background-size: auto 135%;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			100deg,
			rgba(8, 9, 12, 0.92) 0%,
			rgba(8, 9, 12, 0.55) 55%,
			rgba(8, 9, 12, 0.15) 100%
		);
	}
	.scrim-portrait {
		background: linear-gradient(
			100deg,
			rgba(8, 9, 12, 0.92) 0%,
			rgba(8, 9, 12, 0.55) 55%,
			rgba(8, 9, 12, 0) 60%
		);
	}
	.content {
		position: absolute;
		inset: 0;
		padding: 80px 96px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	.brand {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 22px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: oklch(0.75 0.3 150);
	}
	.bar {
		width: 64px;
		height: 3px;
		background: oklch(0.75 0.3 150);
		margin-bottom: 16px;
	}
	.title {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 72px;
		font-weight: 600;
		line-height: 1.02;
		letter-spacing: -0.02em;
		max-width: 18ch;
		margin: 0;
		white-space: pre-line;
	}
	.lead {
		font-family: 'DM Sans', sans-serif;
		font-size: 26px;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.78);
		max-width: 28ch;
		margin: 24px 0 0;
	}
	.foot {
		display: flex;
		justify-content: flex-end;
		align-items: flex-end;
	}
	.url {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 18px;
		opacity: 0.6;
		letter-spacing: 0.06em;
	}
</style>
