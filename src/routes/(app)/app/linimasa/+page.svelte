<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import KepalaAplikasi from '$components/nav/KepalaAplikasi.svelte';
	import TiraiCari from '$components/cari/TiraiCari.svelte';
	import PitaOffline from '$components/nav/PitaOffline.svelte';
	import Heatmap from '$components/tahun/Heatmap.svelte';
	import { entriesRepo } from '$lib/db/local/repo.ts';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { geometri, pinOf, moodLabel } from '$lib/utils/kertas.ts';
	import { labelTanggal, parseIso, pad2, todayIso } from '$lib/utils/tanggal.ts';
	import { plainRingkas } from '$lib/utils/teks.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { layarKecil } from '$lib/utils/perangkat.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';

	let semua = $state<LocalEntry[]>([]);
	let tahun = $state(new Date().getFullYear());
	let mobile = $state(false);
	let cariTerbuka = $state(false);

	onMount(() => {
		mobile = layarKecil();
	});

	// Baca ulang setiap putaran sinkronisasi selesai supaya entri dari perangkat lain muncul.
	$effect(() => {
		void sync.putaran;
		void (async () => {
			semua = await entriesRepo.all();
		})();
	});

	const tahunTersedia = $derived([
		...new Set(semua.map((e) => Number(e.entryDate.slice(0, 4))))
	].sort((a, b) => b - a));

	const tahunIni = $derived(semua.filter((e) => e.entryDate.startsWith(String(tahun))));

	const urut = $derived([...tahunIni].sort((a, b) => b.entryDate.localeCompare(a.entryDate)));

	const hariIni = todayIso().slice(5);
	const setahunLalu = $derived(
		semua
			.filter((e) => e.entryDate.slice(5) === hariIni && !e.entryDate.startsWith(String(new Date().getFullYear())))
			.sort((a, b) => b.entryDate.localeCompare(a.entryDate))
	);

	function buka(e: LocalEntry) {
		const { year, month, day } = parseIso(e.entryDate);
		void goto(`/app/${year}/${pad2(month)}/${pad2(day)}?e=${e.id}`);
	}

	function bukaTanggal(iso: string) {
		const { year, month, day } = parseIso(iso);
		void goto(`/app/${year}/${pad2(month)}/${pad2(day)}`);
	}
</script>

<svelte:head><title>Linimasa · Cloister</title></svelte:head>

<div class="ruangan">
	<div class="shell" style="display:flex;flex-direction:column;gap:var(--s-5)">
		<KepalaAplikasi
			judul="Linimasa"
			kembaliLabel={i18n.t.umum.kembali}
			{mobile}
			onkembali={() => goto('/app')}
			oncari={() => (cariTerbuka = true)}
		/>
		<PitaOffline />

		{#if setahunLalu.length > 0}
			<section style="display:flex;flex-direction:column;gap:var(--s-3)">
				<h2 class="t-judul t-lg">Di tanggal ini, tahun lalu</h2>
				<div style="display:flex;gap:var(--s-4);flex-wrap:wrap">
					{#each setahunLalu.slice(0, 3) as e (e.id)}
						{@const g = geometri(e.entryDate + e.id.slice(-4), tema.reduceMotion)}
						<button
							type="button"
							class="kartu-papan"
							style="--kertas:{g.paper};width:240px;transform:rotate({g.rot / 2}deg)"
							onclick={() => buka(e)}
						>
							<span class="t-data t-data-ink">{e.entryDate.slice(0, 4)}</span>
							<span
								style="display:block;font-family:var(--f-read);font-size:0.92rem;line-height:1.5;color:var(--ink-soft);max-height:4.5em;overflow:hidden"
								>{plainRingkas(e.title ? e.title + '. ' + e.body : e.body, 140)}</span
							>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<section style="display:flex;flex-direction:column;gap:var(--s-4)">
			<div style="display:flex;align-items:baseline;gap:var(--s-3);flex-wrap:wrap">
				<h2 class="t-judul t-lg">{tahun}</h2>
				{#each tahunTersedia as t (t)}
					<button
						type="button"
						class="tbl-papan {t === tahun ? 'tbl-papan-aktif' : ''}"
						style="min-height:32px;padding:0 10px"
						onclick={() => (tahun = t)}>{t}</button
					>
				{/each}
				<span class="t-data" style="margin-left:auto">{tahunIni.length} tulisan</span>
			</div>

			<div class="meja-kayu" style="padding:var(--s-6)">
				<Heatmap {tahun} entries={tahunIni} onpilih={bukaTanggal} />
			</div>
		</section>

		<section style="display:flex;flex-direction:column;gap:var(--s-3)">
			<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:var(--s-3)">
				{#each urut as e (e.id)}
					<li>
						<button
							type="button"
							class="kertas"
							style="width:100%;text-align:left;border:none;cursor:pointer;padding:var(--s-4) var(--s-5);display:flex;gap:var(--s-4);align-items:flex-start;flex-wrap:wrap"
							onclick={() => buka(e)}
						>
							<span
								style="width:11px;height:11px;margin-top:6px;border-radius:var(--r-pin);background:{pinOf(
									e.mood
								)};flex:none"
							></span>
							<div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:5px">
								<span class="t-data t-data-ink"
									>{labelTanggal(e.entryDate, i18n.locale)} · {moodLabel(e.mood, i18n.locale)}</span
								>
								{#if e.title}
									<span
										style="font-family:var(--f-display);font-weight:600;font-size:var(--text-base);color:var(--ink)"
										>{e.title}</span
									>
								{/if}
								<span
									style="font-family:var(--f-read);font-size:var(--text-sm);line-height:1.6;color:var(--ink-soft)"
									>{plainRingkas(e.body, 200)}</span
								>
							</div>
							{#if e.tags.length}
								<div style="display:flex;gap:5px;flex-wrap:wrap">
									{#each e.tags.slice(0, 3) as t (t)}
										<span class="tag-cip" style="cursor:default">{t}</span>
									{/each}
								</div>
							{/if}
						</button>
					</li>
				{:else}
					<li><span class="t-data">{i18n.t.umum.tidakAda}</span></li>
				{/each}
			</ol>
		</section>
	</div>
</div>

<TiraiCari terbuka={cariTerbuka} ontutup={() => (cariTerbuka = false)} />
