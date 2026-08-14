<script lang="ts">
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { pinOf } from '$lib/utils/kertas.ts';
	import { namaBulan, pad2, daysInMonth } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		tahun: number;
		entries: LocalEntry[];
		onpilih: (iso: string) => void;
	}

	let { tahun, entries, onpilih }: Props = $props();

	interface Sel {
		iso: string;
		jumlah: number;
		mood: number | null;
	}

	const perBulan = $derived.by(() => {
		const peta = new Map<string, LocalEntry[]>();
		for (const e of entries) {
			const list = peta.get(e.entryDate) ?? [];
			list.push(e);
			peta.set(e.entryDate, list);
		}
		return Array.from({ length: 12 }, (_, m) => {
			const bulan = m + 1;
			const sel: Sel[] = [];
			for (let d = 1; d <= daysInMonth(tahun, bulan); d++) {
				const iso = `${tahun}-${pad2(bulan)}-${pad2(d)}`;
				const rows = peta.get(iso) ?? [];
				const moods = rows.map((r) => r.mood).filter((x): x is number => x !== null);
				sel.push({
					iso,
					jumlah: rows.length,
					mood: moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : null
				});
			}
			return { bulan, sel };
		});
	});
</script>

<div style="display:flex;flex-direction:column;gap:var(--s-4)">
	<div style="display:flex;flex-wrap:wrap;gap:var(--s-5)">
		{#each perBulan as b (b.bulan)}
			<div style="display:flex;flex-direction:column;gap:6px">
				<span class="t-data">{namaBulan(b.bulan, i18n.locale).slice(0, 3)}</span>
				<div style="display:grid;grid-template-columns:repeat(7,10px);gap:3px">
					{#each b.sel as s (s.iso)}
						<button
							type="button"
							title="{s.iso} · {s.jumlah} tulisan"
							aria-label="{s.iso}, {s.jumlah} tulisan"
							style="width:10px;height:10px;border:none;padding:0;cursor:pointer;border-radius:1px;background:{s.jumlah ===
							0
								? 'rgb(255 255 255 / 0.06)'
								: s.mood !== null
									? pinOf(s.mood)
									: 'var(--pin-brass)'};opacity:{s.jumlah === 0 ? 1 : Math.min(1, 0.55 + s.jumlah * 0.25)}"
							onclick={() => onpilih(s.iso)}
						></button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
		<span class="t-data">Warna mengikuti mood rata-rata</span>
		{#each [1, 2, 3, 4, 5] as m (m)}
			<span
				title="mood {m}"
				style="width:10px;height:10px;border-radius:1px;background:{pinOf(m)}"
			></span>
		{/each}
	</div>
</div>
