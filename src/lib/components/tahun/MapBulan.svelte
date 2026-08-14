<script lang="ts">
	import { geometri, PAPERS } from '$lib/utils/kertas.ts';
	import { namaBulan } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';

	interface Props {
		tahun: number;
		bulan: number;
		jumlah: number;
		mobile?: boolean;
		onbuka: (bulan: number) => void;
	}

	let { tahun, bulan, jumlah, mobile = false, onbuka }: Props = $props();

	const g = $derived(geometri(`${tahun}-${bulan}`, tema.reduceMotion));
	const rot = $derived(tema.reduceMotion ? 0 : Number((((g.seed % 400) / 100) - 2).toFixed(2)));
	const sudut = $derived.by(() => {
		const n = Math.min(5, jumlah === 0 ? 0 : Math.ceil(jumlah / 4));
		return Array.from({ length: n }, (_, k) => ({
			h: 10 + ((g.seed >>> (k * 3)) % 9),
			warna: PAPERS[(g.seed >>> (k * 5)) % 5] as string,
			rot: ((g.seed >>> (k * 7)) % 9) - 4
		}));
	});
	const meta = $derived(jumlah === 0 ? i18n.t.app.mapKosong : i18n.t.app.mapIsi(jumlah));
</script>

<button
	type="button"
	class="map-bulan"
	style="opacity:{jumlah === 0 ? 0.6 : 1};transform:rotate({rot}deg)"
	onclick={() => onbuka(bulan)}
>
	<div
		style="position:absolute;right:{mobile ? 10 : 14}px;top:{mobile
			? 5
			: 6}px;display:flex;gap:{mobile ? 5 : 6}px;z-index:0"
	>
		{#each sudut as s, i (i)}
			<span
				style="width:{mobile
					? 18
					: 22}px;height:{s.h}px;background-image:var(--tex-grain), linear-gradient({s.warna},{s.warna});background-blend-mode:multiply,normal;box-shadow:1px 1px 0 rgb(0 0 0 / 0.2);transform:rotate({s.rot}deg)"
			></span>
		{/each}
	</div>

	<div class="map-lidah" style={mobile ? 'width:60px;height:16px;margin-left:10px' : ''}></div>

	<div
		class="map-badan"
		style="height:{mobile ? 96 : 118}px;padding:{mobile
			? 11
			: 14}px;box-shadow:var(--sh-contact), {jumlah === 0
			? '2px 3px 8px -2px rgb(0 0 0 / 0.4)'
			: 'var(--sh-pinned)'}"
	>
		<span class="map-label" style={mobile ? 'font-size:0.92rem;padding:3px 8px' : ''}>
			{namaBulan(bulan, i18n.locale)}
		</span>
		<span
			class="t-data"
			style="color:{jumlah === 0 ? 'rgb(27 27 23 / 0.35)' : 'var(--ink-soft)'}">{meta}</span
		>
	</div>
</button>
