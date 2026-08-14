<script lang="ts">
	import { page } from '$app/state';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	const sembunyi = $derived(/^\/app\/\d{4}\/\d{2}\/\d{2}/.test(page.url.pathname));
</script>

{#if !sembunyi}
	<a href="/app/hari-ini" class="tombol-tulis" aria-label={i18n.t.app.tulisHariIni}>
		<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
			<path d="M12 5v14M5 12h14" stroke-linecap="round" />
		</svg>
		<span class="tombol-tulis-label">{i18n.t.app.tulisHariIni}</span>
	</a>
{/if}

<style>
	.tombol-tulis {
		position: fixed;
		right: 26px;
		bottom: 26px;
		z-index: 38;
		display: none;
		align-items: center;
		gap: 10px;
		min-height: 52px;
		padding: 0 20px;
		border-radius: 99px;
		background: var(--accent);
		color: var(--accent-ink);
		text-decoration: none;
		font-family: var(--f-display);
		font-weight: 600;
		font-size: var(--text-base);
		box-shadow:
			0 2px 0 rgb(0 0 0 / 0.3),
			0 14px 34px -10px rgb(0 0 0 / 0.55);
		transition:
			translate var(--dur-fast) var(--ease-quiet),
			box-shadow var(--dur-fast) var(--ease-quiet),
			background var(--dur-fast) var(--ease-quiet);
	}

	.tombol-tulis:hover {
		translate: 0 -2px;
		background: var(--accent-hi);
		box-shadow:
			0 3px 0 rgb(0 0 0 / 0.3),
			0 20px 44px -12px rgb(0 0 0 / 0.6);
	}

	@media (min-width: 901px) {
		.tombol-tulis {
			display: inline-flex;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tombol-tulis,
		.tombol-tulis:hover {
			translate: none;
			transition-duration: 1ms;
		}
	}
</style>
