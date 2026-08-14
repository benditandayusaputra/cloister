<script lang="ts">
	import { goto } from '$app/navigation';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		ringkas?: boolean;
	}

	let { ringkas = false }: Props = $props();

	let terbuka = $state(false);
	let akar = $state<HTMLDivElement | null>(null);

	const inisial = $derived((sesi.penName ?? sesi.email ?? 'A').charAt(0).toUpperCase());
	const ukuran = $derived(ringkas ? 30 : 32);

	function tutupLuar(e: MouseEvent) {
		if (akar && !akar.contains(e.target as Node)) terbuka = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') terbuka = false;
	}

	async function ke(href: string) {
		terbuka = false;
		await goto(href);
	}
</script>

<svelte:window
	onclick={terbuka ? tutupLuar : undefined}
	onkeydown={terbuka ? onKey : undefined}
/>

<div bind:this={akar} style="position:relative">
	<button
		type="button"
		class="tbl-papan"
		style="padding:0 {ringkas ? '4px' : '14px 0 6px'};min-height:44px;gap:9px"
		aria-haspopup="menu"
		aria-expanded={terbuka}
		aria-label="Menu profil"
		onclick={() => (terbuka = !terbuka)}
	>
		{#if sesi.avatarUrl}
			<img
				src={sesi.avatarUrl}
				alt=""
				style="width:{ukuran}px;height:{ukuran}px;object-fit:cover;border-radius:var(--r-control);transform:rotate(-3deg);box-shadow:var(--sh-contact)"
			/>
		{:else}
			<span
				style="width:{ukuran}px;height:{ukuran}px;border-radius:var(--r-control);display:grid;place-items:center;background-image:var(--tex-grain), linear-gradient(var(--paper-manila),var(--paper-manila));background-blend-mode:multiply,normal;font-family:var(--f-hand);font-weight:600;font-size:14px;color:var(--ink);transform:rotate(-3deg)"
				>{inisial}</span
			>
		{/if}
		{#if !ringkas}
			<span style="max-width:14ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
				>{sesi.penName ?? 'Aku'}</span
			>
			<svg
				viewBox="0 0 24 24"
				width="12"
				height="12"
				fill="none"
				stroke="currentColor"
				stroke-width="2.2"
				style="rotate:{terbuka ? '180deg' : '0deg'};transition:rotate var(--dur-fast) var(--ease-quiet)"
				aria-hidden="true"
			>
				<path d="M6 9.5l6 5 6-5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</button>

	{#if terbuka}
		<div
			role="menu"
			aria-label="Menu profil"
			class="kertas kertas-angkat muncul"
			style="position:absolute;right:0;top:calc(100% + 8px);z-index:60;min-width:220px;padding:var(--s-2);display:flex;flex-direction:column;gap:2px;transform:rotate(-0.4deg)"
		>
			<div
				style="padding:10px 12px;border-bottom:1px solid rgb(27 27 23 / 0.14);display:flex;flex-direction:column;gap:2px"
			>
				<strong
					style="font-family:var(--f-display);font-size:var(--text-sm);color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
					>{sesi.penName ? `@${sesi.penName}` : 'Belum ada nama pena'}</strong
				>
				<span
					style="font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
					>{sesi.email}</span
				>
			</div>

			<button type="button" role="menuitem" class="menu-item" onclick={() => ke(sesi.penName ? `/baca/@${sesi.penName}` : '/pengaturan/akun')}>
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
					<circle cx="12" cy="8.4" r="3.6" />
					<path d="M4.8 19.4c1.5-3.1 4.1-4.7 7.2-4.7s5.7 1.6 7.2 4.7" stroke-linecap="round" />
				</svg>
				Lihat profil
			</button>
			<button type="button" role="menuitem" class="menu-item" onclick={() => ke('/pengaturan')}>
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
					<path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2" stroke-linecap="round" />
					<circle cx="16" cy="7" r="1.9" />
					<circle cx="8" cy="12" r="1.9" />
					<circle cx="16" cy="17" r="1.9" />
				</svg>
				{i18n.t.pengaturan.judul}
			</button>
			<button type="button" role="menuitem" class="menu-item menu-item-bahaya" onclick={() => sesi.keluar()}>
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
					<path d="M14 5h4.4v14H14M10 8.5 6.5 12l3.5 3.5M6.5 12H15" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				{i18n.t.umum.keluar}
			</button>
		</div>
	{/if}
</div>

<style>
	.menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 42px;
		padding: 0 12px;
		border: none;
		border-radius: var(--r-control);
		background: transparent;
		color: var(--ink);
		font-family: var(--f-display);
		font-size: var(--text-sm);
		text-align: left;
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-quiet);
	}

	.menu-item:hover {
		background: rgb(27 27 23 / 0.08);
	}

	.menu-item-bahaya {
		color: var(--danger);
	}

	.menu-item-bahaya:hover {
		background: color-mix(in srgb, var(--danger) 12%, transparent);
	}
</style>
