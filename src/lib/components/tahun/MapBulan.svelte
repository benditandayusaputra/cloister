<script lang="ts">
	import { geometri, PAPERS } from '$lib/utils/kertas.ts';
	import { namaBulan } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { ikonMap } from '$lib/state/ikon-map.svelte.ts';

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
	const ikon = $derived(ikonMap.ikon(bulan));
	let pilihIkon = $state(false);

	const IKON_PILIHAN = [
		'✨','🌱','🌸','🌻','🌧️','☀️','🍂','❄️','🌊','⛰️','🌙','⭐',
		'❤️','📚','✏️','🎓','💼','🎉','🎂','✈️','🏠','☕','🎧','📷'
	];

	function pasangIkon(e: MouseEvent, emoji: string | null) {
		e.stopPropagation();
		ikonMap.set(bulan, emoji);
		pilihIkon = false;
	}

	function bukaPemilih(e: MouseEvent) {
		e.stopPropagation();
		pilihIkon = !pilihIkon;
	}
</script>

<svelte:window
	onclick={pilihIkon ? () => (pilihIkon = false) : undefined}
	onkeydown={pilihIkon ? (e) => e.key === 'Escape' && (pilihIkon = false) : undefined}
/>

<div class="map-bungkus" style="position:relative">
<button
	type="button"
	class="map-bulan"
	style="width:100%;opacity:{jumlah === 0 ? 0.6 : 1};transform:rotate({rot}deg)"
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
		style="position:relative;height:{mobile ? 96 : 118}px;padding:{mobile
			? 11
			: 14}px;box-shadow:var(--sh-contact), {jumlah === 0
			? '2px 3px 8px -2px rgb(0 0 0 / 0.4)'
			: 'var(--sh-pinned)'}"
	>
		{#if ikon}
			<span
				aria-hidden="true"
				style="position:absolute;left:50%;top:52%;translate:-50% -50%;font-size:{mobile
					? '1.9rem'
					: '2.4rem'};opacity:0.9;filter:drop-shadow(1px 2px 2px rgb(0 0 0 / 0.25));pointer-events:none"
				>{ikon}</span
			>
		{/if}
		<span class="map-label" style={mobile ? 'font-size:0.92rem;padding:3px 8px' : ''}>
			{namaBulan(bulan, i18n.locale)}
		</span>
		<span
			class="t-data"
			style="color:{jumlah === 0 ? 'rgb(27 27 23 / 0.35)' : 'var(--ink-soft)'}">{meta}</span
		>
	</div>
</button>

<button
	type="button"
	class="map-ikon-tombol"
	title="Ganti ikon folder"
	aria-label="Ganti ikon folder {namaBulan(bulan, i18n.locale)}"
	aria-expanded={pilihIkon}
	onclick={bukaPemilih}
>
	{ikon ?? '☺'}
</button>

{#if pilihIkon}
	<div
		role="listbox"
		aria-label="Pilih ikon folder"
		class="kertas kertas-angkat muncul"
		style="position:absolute;z-index:35;top:calc(100% - 8px);left:0;right:0;padding:8px;display:grid;grid-template-columns:repeat(6,1fr);gap:2px"
	>
		{#each IKON_PILIHAN as e (e)}
			<button
				type="button"
				role="option"
				aria-selected={ikon === e}
				aria-label="Ikon {e}"
				style="cursor:pointer;min-height:32px;border:none;border-radius:var(--r-control);background:{ikon === e
					? 'rgb(27 27 23 / 0.14)'
					: 'transparent'};font-size:1.05rem;line-height:1"
				onclick={(ev) => pasangIkon(ev, e)}>{e}</button
			>
		{/each}
		<button
			type="button"
			style="cursor:pointer;grid-column:1 / -1;min-height:32px;border:none;border-radius:var(--r-control);background:transparent;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-soft)"
			onclick={(ev) => pasangIkon(ev, null)}>Tanpa ikon</button
		>
	</div>
{/if}
</div>

<style>
	.map-ikon-tombol {
		position: absolute;
		right: 6px;
		bottom: 6px;
		z-index: 6;
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border: 1px solid rgb(27 27 23 / 0.25);
		border-radius: 50%;
		background: rgb(255 255 255 / 0.55);
		font-size: 0.85rem;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		transition: opacity var(--dur-fast) var(--ease-quiet);
	}

	.map-bungkus:hover .map-ikon-tombol,
	.map-ikon-tombol:focus-visible,
	.map-ikon-tombol[aria-expanded='true'] {
		opacity: 1;
	}

	@media (hover: none) {
		.map-ikon-tombol {
			opacity: 0.7;
		}
	}
</style>
