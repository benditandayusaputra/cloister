<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LayarKunci from '$components/dasar/LayarKunci.svelte';
	import NavBawah from '$components/nav/NavBawah.svelte';
	import TombolTulis from '$components/nav/TombolTulis.svelte';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { kunci } from '$lib/state/kunci.svelte.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { namaPerangkat } from '$lib/utils/perangkat.ts';
	import { daftarkanSW, mintaPersistensi } from '$lib/pwa/daftar.ts';

	let { children } = $props();

	onMount(async () => {
		await sesi.bangun();
		await kunci.muat();

		if (sesi.fase === 'tamu') {
			await goto(`/masuk?dari=${encodeURIComponent(page.url.pathname)}`);
			return;
		}
		if (sesi.fase === 'terkunci' && !kunci.aktif) {
			// Server masih menyimpan kunci terbungkus: cukup masukkan sandi lagi.
			// Kalau tidak, satu-satunya jalan adalah transfer perangkat atau 24 kata.
			await goto(sesi.info?.wrappedMk ? '/masuk' : '/sambung');
			return;
		}

		sync.mulai(namaPerangkat());
		kunci.pasangTimer();
		await entri.segarkan();
		void daftarkanSW();
		void mintaPersistensi();
	});
</script>

{#if sesi.fase === 'memuat'}
	<div class="ruangan" style="display:grid;place-items:center;min-height:100vh">
		<span class="t-data">{i18n.t.umum.memuat}…</span>
	</div>
{:else if kunci.terkunci}
	<LayarKunci />
{:else}
	{@render children()}
	<NavBawah />
	<TombolTulis />
{/if}
