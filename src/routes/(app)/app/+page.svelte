<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import KepalaAplikasi from '$components/nav/KepalaAplikasi.svelte';
	import RakTahun from '$components/tahun/RakTahun.svelte';
	import TiraiCari from '$components/cari/TiraiCari.svelte';
	import TutorialAwal from '$components/dasar/TutorialAwal.svelte';
	import PeringatanPasskey from '$components/dasar/PeringatanPasskey.svelte';
	import PitaOffline from '$components/nav/PitaOffline.svelte';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { layarKecil } from '$lib/utils/perangkat.ts';
	import { pindah } from '$lib/utils/transisi.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';

	let tahun = $state(new Date().getFullYear());
	let mobile = $state(false);
	let cariTerbuka = $state(false);

	onMount(() => {
		mobile = layarKecil();
		addEventListener('resize', () => (mobile = layarKecil()));
	});

	$effect(() => {
		void sync.putaran;
		void entri.muatTahun(tahun);
	});

	async function gantiTahun(t: number) {
		tahun = t;
		await entri.muatTahun(t);
	}

	const total = $derived(entri.jumlahPerBulan.reduce((a, b) => a + b, 0));
</script>

<svelte:head><title>{tahun} · Cloister</title></svelte:head>

<div class="ruangan">
	<div class="shell" style="display:flex;flex-direction:column;gap:var(--s-4)">
		<KepalaAplikasi judul={String(tahun)} {mobile} oncari={() => (cariTerbuka = true)} />
		<PitaOffline />
		<PeringatanPasskey />

		<div style="display:flex;align-items:center;gap:var(--s-3);flex-wrap:wrap;padding:0 var(--s-2)">
			<button type="button" class="tbl-papan" onclick={() => gantiTahun(tahun - 1)}>
				&#8592; {tahun - 1}
			</button>
			<button
				type="button"
				class="tbl-papan"
				disabled={tahun >= new Date().getFullYear()}
				onclick={() => gantiTahun(tahun + 1)}
			>
				{tahun + 1} &#8594;
			</button>
			<span class="t-data" style="margin-left:auto">{total} tulisan di {tahun}</span>
		</div>

		<RakTahun
			{tahun}
			jumlahPerBulan={entri.jumlahPerBulan}
			{mobile}
			onbuka={(bulan) => pindah(() => goto(`/app/${tahun}/${String(bulan).padStart(2, '0')}`))}
		/>

		<div style="display:flex;gap:var(--s-3);justify-content:flex-end;padding:0 var(--s-2);flex-wrap:wrap">
			<a href="/app/linimasa" class="tbl-papan" style="text-decoration:none">Linimasa</a>
			<a href="/app/hari-ini" class="tbl" style="text-decoration:none">{i18n.t.app.tulisHariIni}</a>
		</div>
	</div>
</div>

<TiraiCari terbuka={cariTerbuka} ontutup={() => (cariTerbuka = false)} />
<TutorialAwal />
