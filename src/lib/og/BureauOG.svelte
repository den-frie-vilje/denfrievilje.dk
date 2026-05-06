<script lang="ts">
	type Props = {
		title: string;
		lead?: string;
		heroImage?: string | null;
		logo?: string | null;
	};
	let { title, lead, heroImage = null, logo = null }: Props = $props();
	const hasHero = $derived(Boolean(heroImage));
</script>

<div class="frame" class:frame-light={!hasHero} style:background-image={heroImage ? `url(${heroImage})` : 'none'}>
	{#if hasHero}
		<div class="scrim"></div>
	{/if}
	<div class="content" class:content-dark={hasHero}>
		<div>
			{#if logo}
				<img class="logo" src={logo} alt="Den Frie Vilje" />
			{/if}
		</div>
		<div>
			<div class="bar"></div>
			<h1 class="title">{title}</h1>
			{#if lead}
				<p class="lead">{lead}</p>
			{/if}
		</div>
		<div class="foot">
			<span class="name">Den Frie Vilje</span>
			<span class="url">denfrievilje.dk</span>
		</div>
	</div>
</div>

<style>
	.frame {
		position: relative;
		width: 1200px;
		height: 630px;
		background-color: #11161a;
		background-position: center;
		background-size: cover;
		background-repeat: no-repeat;
		font-family: 'DM Sans', sans-serif;
		color: white;
	}
	.frame-light {
		background-color: #f6f6f3;
		color: #11161a;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			100deg,
			rgba(17, 22, 26, 0.88) 0%,
			rgba(17, 22, 26, 0.55) 55%,
			rgba(17, 22, 26, 0.1) 100%
		);
	}
	.content {
		position: absolute;
		inset: 0;
		padding: 80px 96px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		color: inherit;
	}
	.content-dark { color: white; }
	.logo {
		height: 80px;
		width: auto;
	}
	.bar {
		width: 64px;
		height: 3px;
		background: oklch(0.75 0.3 150);
		margin-bottom: 16px;
	}
	.title {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 68px;
		font-weight: 600;
		line-height: 1.02;
		letter-spacing: -0.02em;
		max-width: 20ch;
		margin: 0;
	}
	.lead {
		font-family: 'DM Sans', sans-serif;
		font-size: 24px;
		line-height: 1.4;
		opacity: 0.78;
		max-width: 30ch;
		margin: 20px 0 0;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}
	.name {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 22px;
		font-weight: 500;
		letter-spacing: 0.04em;
	}
	.url {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 18px;
		opacity: 0.6;
		letter-spacing: 0.06em;
	}
</style>
