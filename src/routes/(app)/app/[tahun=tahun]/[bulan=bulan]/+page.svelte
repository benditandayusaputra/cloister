<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import KepalaAplikasi from '$components/nav/KepalaAplikasi.svelte';
	import PapanBulan from '$components/papan/PapanBulan.svelte';
	import PitaOffline from '$components/nav/PitaOffline.svelte';
	import TiraiCari from '$components/cari/TiraiCari.svelte';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { namaBulan, daysInMonth, todayIso, pad2 } from '$lib/utils/tanggal.ts';
	import { layarKecil } from '$lib/utils/perangkat.ts';
	import { pindah } from '$lib/utils/transisi.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';

	const tahun = $derived(Number(page.params.tahun));
	const bulan = $derived(Number(page.params.bulan));

	let mobile = $state(false);
	let cariTerbuka = $state(false);

	onMount(() => {
		mobile = layarKecil();
		addEventListener('resize', () => (mobile = layarKecil()));
	});

	$effect(() => {
		void sync.putaran;
		void entri.muatBulan(tahun, bulan);
	});

	const judul = $derived(namaBulan(bulan, i18n.locale));
	const totalHari = $derived(daysInMonth(tahun, bulan));

	function bukaEntri(id: string) {
		const e = entri.bulan.find((x) => x.id === id);
		if (!e) return;
		pindah(() => goto(`/app/${tahun}/${pad2(bulan)}/${e.entryDate.slice(8)}?e=${id}`));
	}

	function tulis(iso: string) {
		pindah(() => goto(`/app/${tahun}/${pad2(bulan)}/${iso.slice(8)}?baru=1`));
	}

	const hariIniDiBulanIni = $derived(
		todayIso().startsWith(`${tahun}-${pad2(bulan)}`) ? todayIso() : `${tahun}-${pad2(bulan)}-01`
	);
</script>

<svelte:head><title>{judul} {tahun} · Cloister</title></svelte:head>

<div class="ruangan">
	<div class="shell" style="display:flex;flex-direction:column;gap:var(--s-4)">
		<KepalaAplikasi
			judul={mobile ? judul : `${judul} ${tahun}`}
			kembaliLabel={String(tahun)}
			{mobile}
			onkembali={() => pindah(() => goto('/app'))}
			oncari={() => (cariTerbuka = true)}
		/>
		<PitaOffline />

		<PapanBulan
			{tahun}
			{bulan}
			entries={entri.bulan}
			{mobile}
			onbuka={bukaEntri}
			ontulis={tulis}
		/>

		<div
			style="display:flex;align-items:center;justify-content:space-between;gap:var(--s-4);flex-wrap:wrap;padding:0 var(--s-2)"
		>
			<span class="t-data">{i18n.t.app.terisi(entri.bulan.length, totalHari)}</span>
			<button type="button" class="tbl" onclick={() => tulis(hariIniDiBulanIni)}>
				{i18n.t.app.tulisHariIni}
			</button>
		</div>
	</div>
</div>

<TiraiCari terbuka={cariTerbuka} ontutup={() => (cariTerbuka = false)} />
