<script lang="ts">
	import { page } from '$app/state';

	interface Tautan {
		href: string;
		label: string;
		utama?: boolean;
	}

	interface Props {
		tautan: Tautan[];
	}

	let { tautan }: Props = $props();

	let terbuka = $state(false);

	$effect(() => {
		void page.url.pathname;
		terbuka = false;
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') terbuka = false;
	}
</script>

<svelte:window onkeydown={terbuka ? onKey : undefined} />

<button
	type="button"
	class="menu-burger"
	aria-expanded={terbuka}
	aria-label={terbuka ? 'Tutup menu' : 'Buka menu'}
	onclick={() => (terbuka = !terbuka)}
>
	<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		{#if terbuka}
			<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
		{:else}
			<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
		{/if}
	</svg>
</button>

{#if terbuka}
	<div
		class="menu-tirai"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) terbuka = false;
		}}
	>
		<nav class="menu-panel kertas kertas-angkat muncul" aria-label="Menu">
			{#each tautan as t, i (t.href)}
				<a
					href={t.href}
					class="menu-tautan {t.utama ? 'menu-tautan-utama' : ''} muncul"
					style="--tunda:{i * 45}ms"
					aria-current={page.url.pathname === t.href ? 'page' : undefined}
				>
					{t.label}
					{#if page.url.pathname === t.href}
						<span class="menu-paku" aria-hidden="true"></span>
					{/if}
				</a>
			{/each}
		</nav>
	</div>
{/if}

<style>
	.menu-burger {
		display: none;
		width: 44px;
		height: 44px;
		place-items: center;
		border: 1.5px solid var(--garis-ruang-kuat);
		border-radius: var(--r-control);
		background: var(--isi-ruang);
		color: var(--ink-on-board);
		cursor: pointer;
	}

	.menu-tirai {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: rgb(0 0 0 / 0.45);
		backdrop-filter: blur(3px);
	}

	.menu-panel {
		position: absolute;
		top: 14px;
		right: 14px;
		left: 14px;
		max-width: 420px;
		margin-left: auto;
		padding: var(--s-3);
		display: flex;
		flex-direction: column;
		gap: 4px;
		transform: rotate(-0.4deg);
	}

	.menu-tautan {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 48px;
		padding: 0 16px;
		border-radius: var(--r-control);
		text-decoration: none;
		font-family: var(--f-display);
		font-variation-settings: 'wdth' 85;
		font-weight: 600;
		font-size: var(--text-md);
		color: var(--ink);
		transition: background var(--dur-fast) var(--ease-quiet);
	}

	.menu-tautan:hover {
		background: rgb(27 27 23 / 0.08);
	}

	.menu-tautan-utama {
		background: var(--accent);
		color: var(--accent-ink);
		margin-top: 6px;
	}

	.menu-tautan-utama:hover {
		background: var(--accent-hi);
	}

	.menu-paku {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: radial-gradient(circle at 32% 28%, #e2b45c, var(--pin-brass) 62%, #7a5518);
		box-shadow: 1px 1px 0 rgb(0 0 0 / 0.3);
	}

	@media (max-width: 700px) {
		.menu-burger {
			display: grid;
		}
	}
</style>
