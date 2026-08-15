<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import KepalaAplikasi from '$components/nav/KepalaAplikasi.svelte';
	import KartuHari from '$components/papan/KartuHari.svelte';
	import TiraiCari from '$components/cari/TiraiCari.svelte';
	import PitaOffline from '$components/nav/PitaOffline.svelte';
	import Ikon from '$components/dasar/Ikon.svelte';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { layarKecil } from '$lib/utils/perangkat.ts';
	import { pindah } from '$lib/utils/transisi.ts';
	import type { LocalEntry } from '$lib/db/local/types.ts';

	let mobile = $state(false);
	let cariTerbuka = $state(false);

	onMount(() => {
		mobile = layarKecil();
		addEventListener('resize', () => (mobile = layarKecil()));
	});

	$effect(() => {
		void sync.putaran;
		void entri.muatTersemat();
	});

	function buka(e: LocalEntry) {
		const [y, m, d] = e.entryDate.split('-');
		pindah(() => goto(`/app/${y}/${m}/${d}?e=${e.id}`));
	}

	const kelompok = $derived.by(() => {
		const peta = new Map<string, LocalEntry[]>();
		for (const e of entri.tersemat) {
			const k = e.entryDate.slice(0, 7);
			peta.set(k, [...(peta.get(k) ?? []), e]);
		}
		return [...peta.entries()].sort((a, b) => b[0].localeCompare(a[0]));
	});

	const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
	const labelBulan = (ym: string) => `${NAMA_BULAN[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
</script>

<svelte:head><title>Tersemat · Cloister</title></svelte:head>

<div class="ruangan">
	<div class="shell" style="display:flex;flex-direction:column;gap:var(--s-4)">
		<KepalaAplikasi
			judul="Tersemat"
			kembaliLabel="Rak tahun"
			{mobile}
			onkembali={() => pindah(() => goto('/app'))}
			oncari={() => (cariTerbuka = true)}
		/>
		<PitaOffline />

		<div style="display:flex;align-items:center;gap:var(--s-3);flex-wrap:wrap;padding:0 var(--s-2)">
			<span class="t-data">{entri.tersemat.length} jurnal tersemat</span>
			<span class="t-data" style="margin-left:auto;text-transform:none;letter-spacing:0.02em">
				Lepas sematan dari tombol pin di dalam jurnal
			</span>
		</div>

		<div class="bingkai-kayu">
			<div class="papan-flanel" style="padding:{mobile ? '24px 16px' : '40px 34px'};display:flex;flex-direction:column;gap:var(--s-6)">
				{#if entri.tersemat.length === 0}
					<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:var(--s-8) 0;text-align:center">
						<span style="width:52px;height:52px;display:grid;place-items:center;border-radius:50%;background:rgb(255 255 255 / 0.08);color:var(--ink-on-board)">
							<Ikon nama="pin" ukuran={26} />
						</span>
						<span class="t-judul" style="font-size:var(--text-lg)">Belum ada yang disematkan</span>
						<span style="font-family:var(--f-read);font-size:var(--text-md);color:var(--ink-on-board-dim);max-width:44ch">
							Buka jurnal mana pun, tekan tombol pin, dan jurnal itu akan berkumpul di sini, dari
							bulan dan tahun mana pun.
						</span>
						<a href="/app" class="tbl-papan" style="text-decoration:none">Kembali ke rak tahun</a>
					</div>
				{:else}
					{#each kelompok as [ym, daftar] (ym)}
						<section style="display:flex;flex-direction:column;gap:var(--s-4)">
							<span class="t-data" style="color:var(--ink-on-board)">{labelBulan(ym)}</span>
							<ul style="margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr));gap:30px 22px">
								{#each daftar as e, i (e.id)}
									<KartuHari entri={e} delay={Math.min(i, 10) * 45} penuh onbuka={() => buka(e)} />
								{/each}
							</ul>
						</section>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<TiraiCari terbuka={cariTerbuka} ontutup={() => (cariTerbuka = false)} />
