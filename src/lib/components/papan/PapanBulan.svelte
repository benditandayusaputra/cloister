<script lang="ts">
	import KartuHari from './KartuHari.svelte';
	import LubangPaku from './LubangPaku.svelte';
	import BenangTag from './BenangTag.svelte';
	import { kisi, tataKartu, tataLubang, benangTag, tinggiPapan } from './tata-letak.ts';
	import { arahDariTombol, kartuBerikutnya, kartuUjung } from './navigasi-papan.ts';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { daysInMonth, pad2, todayIso } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';

	interface Props {
		tahun: number;
		bulan: number;
		entries: LocalEntry[];
		mobile?: boolean;
		onbuka: (id: string) => void;
		ontulis: (iso: string) => void;
	}

	let { tahun, bulan, entries, mobile = false, onbuka, ontulis }: Props = $props();

	let lebarKotak = $state(1040);
	let hover = $state<{ tag: string; id: string } | null>(null);
	let kotak = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!kotak) return;
		const ro = new ResizeObserver(([e]) => {
			if (e) lebarKotak = Math.max(320, e.contentRect.width);
		});
		ro.observe(kotak);
		return () => ro.disconnect();
	});

	const L = $derived(kisi(lebarKotak));
	const terurut = $derived([...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate)));
	const kartu = $derived(tataKartu(terurut, L, tema.reduceMotion));

	const kosong = $derived.by(() => {
		const terisi = new Set(entries.map((e) => e.entryDate));
		const out: string[] = [];
		for (let d = 1; d <= daysInMonth(tahun, bulan); d++) {
			const iso = `${tahun}-${pad2(bulan)}-${pad2(d)}`;
			if (!terisi.has(iso)) out.push(iso);
		}
		return out;
	});

	const lubang = $derived(tataLubang(kosong, L));
	const benang = $derived(hover ? benangTag(kartu, hover.id, hover.tag) : []);
	const tinggi = $derived(tinggiPapan(kartu.length, lubang.length, L));
	const hariIni = todayIso();

	/** Panah berpindah antar kartu, Enter membuka, Home dan End ke ujung. */
	function tombolPapan(e: KeyboardEvent) {
		if (kartu.length === 0) return;
		const aktif = (e.target as HTMLElement)?.closest('[data-tanggal]');
		const idAktif = kartu.find((c) => c.entri.entryDate === aktif?.getAttribute('data-tanggal'))
			?.entri.id;

		let tujuan: string | null = null;
		const arah = arahDariTombol(e.key);
		if (arah && idAktif) tujuan = kartuBerikutnya(kartu, idAktif, arah);
		else if (arah && !idAktif) tujuan = kartuUjung(kartu, 'awal');
		else if (e.key === 'Home') tujuan = kartuUjung(kartu, 'awal');
		else if (e.key === 'End') tujuan = kartuUjung(kartu, 'akhir');
		else return;

		if (!tujuan) return;
		e.preventDefault();
		const kartuTujuan = kartu.find((c) => c.entri.id === tujuan);
		if (!kartuTujuan) return;
		kotak
			?.querySelector<HTMLElement>(`[data-tanggal="${kartuTujuan.entri.entryDate}"]`)
			?.focus();
	}

	function zKartu(id: string, tags: string[]): number {
		if (!hover) return 2;
		return hover.id === id || tags.includes(hover.tag) ? 6 : 2;
	}
	function redupKartu(id: string, tags: string[]): number {
		if (!hover) return 1;
		return hover.id === id || tags.includes(hover.tag) ? 1 : 0.55;
	}
	function liftKartu(id: string, tags: string[]): number {
		return hover && hover.id !== id && tags.includes(hover.tag) ? -5 : 0;
	}
</script>

<div class="bingkai-kayu" style={mobile ? 'padding:9px' : ''}>
	<div class="papan-flanel" style={mobile ? 'padding:20px' : ''}>
		{#if mobile}
			<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:22px">
				{#each terurut as e, i (e.id)}
					<KartuHari
						entri={e}
						delay={i < 12 ? i * 45 : 0}
						sisi={i % 2 === 0 ? 'flex-start' : 'flex-end'}
						washi={e.entryDate === hariIni}
						{onbuka}
					/>
				{/each}
				<li style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center;padding-top:6px">
					<ul style="display:contents;list-style:none">
						{#each kosong as iso (iso)}
							<LubangPaku
								label={i18n.t.app.tulisUntuk(iso)}
								onpilih={() => ontulis(iso)}
							/>
						{/each}
					</ul>
				</li>
			</ul>
		{:else}
			<div
				bind:this={kotak}
				role="grid"
				tabindex="-1"
				aria-label="Papan bulan"
				onkeydown={tombolPapan}
				style="position:relative;width:100%;height:{tinggi}px"
			>
				<BenangTag {benang} lebar={L.W} {tinggi} />

				<ul style="margin:0;padding:0;list-style:none">
					{#each lubang as h (h.iso)}
						<LubangPaku
							label={i18n.t.app.tulisUntuk(h.iso)}
							x={h.x}
							y={h.y}
							onpilih={() => ontulis(h.iso)}
						/>
					{/each}

					{#each kartu as c (c.entri.id)}
						<KartuHari
							entri={c.entri}
							x={c.x}
							y={c.y}
							z={zKartu(c.entri.id, c.entri.tags)}
							lift={liftKartu(c.entri.id, c.entri.tags)}
							redup={redupKartu(c.entri.id, c.entri.tags)}
							delay={c.delay}
							washi={c.entri.entryDate === hariIni}
							tagAktif={hover?.tag ?? null}
							{onbuka}
							ontagmasuk={(tag, id) => (hover = { tag, id })}
							ontagkeluar={() => (hover = null)}
						/>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>

