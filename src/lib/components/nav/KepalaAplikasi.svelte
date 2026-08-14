<script lang="ts">
	import LencanaSync from './LencanaSync.svelte';
	import MenuProfil from './MenuProfil.svelte';
	import SaklarMode from './SaklarMode.svelte';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		judul: string;
		kembaliLabel?: string | null;
		mobile?: boolean;
		onkembali?: () => void;
		oncari: () => void;
	}

	let { judul, kembaliLabel = null, mobile = false, onkembali, oncari }: Props = $props();

</script>

{#if mobile}
	<header style="display:flex;align-items:center;gap:10px">
		{#if onkembali}
			<button type="button" class="tbl-ikon" aria-label={i18n.t.umum.kembali} onclick={onkembali}>
				&#8592;
			</button>
		{/if}
		<span class="t-judul" style="font-size:1.5rem">{judul}</span>
		<div style="margin-left:auto;display:flex;align-items:center;gap:2px">
			<button type="button" class="tbl-ikon" aria-label={i18n.t.app.cari} onclick={oncari}>
				<span style="width:15px;height:15px;border:1.75px solid currentColor;border-radius:50%"></span>
			</button>
			<SaklarMode ringkas />
			<LencanaSync ringkas />
			<MenuProfil ringkas />
		</div>
	</header>
{:else}
	<header style="display:flex;align-items:center;gap:var(--s-5);flex-wrap:wrap;padding:0 var(--s-2)">
		{#if onkembali && kembaliLabel}
			<button
				type="button"
				onclick={onkembali}
				style="cursor:pointer;display:flex;align-items:center;gap:9px;min-height:44px;padding:0 12px 0 4px;border:none;background:transparent;color:var(--ink-on-board-dim);font-family:var(--f-display);font-size:var(--text-base)"
			>
				<span
					style="width:22px;height:22px;display:grid;place-items:center;border:1.75px solid currentColor;border-radius:var(--r-control);font-size:12px;line-height:1"
					>&#8592;</span
				>{kembaliLabel}
			</button>
		{/if}

		<h1 class="t-judul t-2xl">{judul}</h1>

		<div style="margin-left:auto;display:flex;align-items:center;gap:var(--s-3);flex-wrap:wrap">
			<a href="/baca" class="tbl-papan" style="text-decoration:none">Baca publik</a>
			<button type="button" class="tbl-papan" aria-label={i18n.t.app.cari} onclick={oncari}>
				<span style="width:15px;height:15px;border:1.75px solid currentColor;border-radius:50%"></span>
				{i18n.t.app.cari}
			</button>
			<SaklarMode />
			<LencanaSync />
			<MenuProfil />
		</div>
	</header>
{/if}
