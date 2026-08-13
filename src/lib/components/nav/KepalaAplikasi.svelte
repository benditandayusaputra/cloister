<script lang="ts">
	import CentangTerverifikasi from '$components/dasar/CentangTerverifikasi.svelte';
	import LencanaSync from './LencanaSync.svelte';
	import SaklarMode from './SaklarMode.svelte';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';

	interface Props {
		judul: string;
		kembaliLabel?: string | null;
		mobile?: boolean;
		onkembali?: () => void;
		oncari: () => void;
	}

	let { judul, kembaliLabel = null, mobile = false, onkembali, oncari }: Props = $props();

	const inisial = $derived((sesi.penName ?? sesi.email ?? 'A').charAt(0).toUpperCase());
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
			<a href="/pengaturan" class="tbl-ikon" aria-label={i18n.t.pengaturan.judul} style="text-decoration:none">
				<span
					style="width:26px;height:26px;border-radius:var(--r-control);display:grid;place-items:center;background-image:var(--tex-grain), linear-gradient(var(--paper-manila),var(--paper-manila));background-blend-mode:multiply,normal;font-family:var(--f-hand);font-weight:600;font-size:13px;color:var(--ink);transform:rotate(-3deg)"
					>{inisial}</span
				>
			</a>
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
			<button type="button" class="tbl-papan" aria-label={i18n.t.app.cari} onclick={oncari}>
				<span style="width:15px;height:15px;border:1.75px solid currentColor;border-radius:50%"></span>
				{i18n.t.app.cari}
			</button>
			<SaklarMode />
			<LencanaSync />
			<a
				href="/pengaturan"
				class="tbl-papan"
				style="padding:0 14px 0 6px;color:var(--ink-on-board);text-decoration:none"
			>
				<span
					style="width:30px;height:30px;border-radius:var(--r-control);display:grid;place-items:center;background-image:var(--tex-grain), linear-gradient(var(--paper-manila),var(--paper-manila));background-blend-mode:multiply,normal;font-family:var(--f-hand);font-weight:600;font-size:14px;color:var(--ink);transform:rotate(-3deg)"
					>{inisial}</span
				>
				{sesi.penName ?? 'Aku'}
				{#if sesi.info?.emailVerified}<CentangTerverifikasi ukuran={13} />{/if}
			</a>
		</div>
	</header>
{/if}
