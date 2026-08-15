<script lang="ts">
	import { onMount } from 'svelte';
	import KartuPerangkat from '$components/pengaturan/KartuPerangkat.svelte';
	import { deviceApi, type DeviceDto } from '$lib/api/endpoints.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tanya } from '$lib/state/konfirmasi.svelte.ts';

	let daftar = $state<DeviceDto[]>([]);
	let baruSajaDicabut = $state(false);
	let memuat = $state(true);

	async function muat() {
		memuat = true;
		try {
			daftar = (await deviceApi.list()).devices;
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			memuat = false;
		}
	}

	onMount(muat);

	async function cabut(id: string) {
		const p = daftar.find((d) => d.id === id);
		const ok = await tanya({
			judul: `Cabut "${p?.name ?? 'perangkat ini'}"?`,
			pesan: 'Perangkat itu langsung kehilangan akses dan akan diminta masuk ulang lewat perangkat lain atau 24 kata.',
			teksYa: 'Cabut perangkat',
			bahaya: true
		});
		if (!ok) return;
		try {
			await deviceApi.revoke(id);
			baruSajaDicabut = true;
			await muat();
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}
</script>

<svelte:head><title>Perangkat · Cloister</title></svelte:head>

<div style="display:flex;flex-direction:column;gap:var(--s-4)">
	<div style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--s-4);flex-wrap:wrap">
		<h1 class="t-judul t-lg">{i18n.t.pengaturan.perangkat}</h1>
		<a href="/pengaturan/sambungkan" class="tbl" style="text-decoration:none">
			{i18n.t.pengaturan.sambungkanBaru}
		</a>
	</div>

	{#if memuat}
		<span class="t-data">{i18n.t.umum.memuat}…</span>
	{:else}
		<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:var(--s-4)">
			{#each daftar as p (p.id)}
				<KartuPerangkat perangkat={p} oncabut={cabut} />
			{/each}
		</div>
	{/if}

	{#if baruSajaDicabut}
		<div class="kertas kertas-buram kotak-warn" style="padding:var(--s-5)">
			<p class="t-baca" style="max-width:62ch">{i18n.t.pengaturan.cabutPeringatan}</p>
		</div>
	{/if}
</div>
