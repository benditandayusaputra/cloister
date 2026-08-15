<script lang="ts">
	import { geometri, PAPERS } from '$lib/utils/kertas.ts';
	import { namaBulan, todayIso } from '$lib/utils/tanggal.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { tema } from '$lib/state/tema.svelte.ts';
	import { ikonMap } from '$lib/state/ikon-map.svelte.ts';
	import { KELOMPOK_EMOJI } from '$lib/data/emoji.ts';
	import Ikon from '$components/dasar/Ikon.svelte';

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
	const bulanIni = $derived.by(() => {
		const [y, m] = todayIso().split('-');
		return Number(y) === tahun && Number(m) === bulan;
	});
	const ikon = $derived(ikonMap.ikon(bulan));
	let pilihIkon = $state(false);


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
	data-kosong={jumlah === 0 ? '1' : '0'}
	data-kini={bulanIni ? '1' : '0'}
	aria-current={bulanIni ? 'date' : undefined}
	style="width:100%;opacity:{jumlah === 0 && !bulanIni ? 0.6 : 1};transform:rotate({rot}deg)"
	onclick={() => onbuka(bulan)}
>
	{#if bulanIni}
		<span class="map-kini" style={mobile ? 'font-size:0.72rem;padding:2px 7px' : ''}>
			<span aria-hidden="true" class="pin-bulat map-kini-pin"></span>
			Bulan ini
		</span>
	{/if}
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
			style="color:{jumlah === 0 ? 'var(--ink-faint)' : 'var(--ink-soft)'}">{meta}</span
		>
	</div>
</button>

<button
	type="button"
	class="map-ikon-tombol"
	title="Ganti ikon folder"
	aria-label="Ganti ikon folder {namaBulan(bulan, i18n.locale)}"
	aria-haspopup="listbox"
	aria-expanded={pilihIkon}
	onclick={bukaPemilih}
>
	<span class="map-ikon-emoji" aria-hidden="true">{ikon ?? '☺'}</span>
	<span class="map-ikon-teks">Ikon</span>
	<Ikon nama="panah-bawah" ukuran={12} />
</button>

{#if pilihIkon}
	<div
		role="dialog"
		tabindex="-1"
		aria-label="Pilih ikon folder {namaBulan(bulan, i18n.locale)}"
		class="kertas kertas-angkat muncul map-pemilih"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				pilihIkon = false;
			}
		}}
	>
		<div class="map-pemilih-kepala">
			<div>
				<span class="t-judul map-pemilih-judul">Ikon folder {namaBulan(bulan, i18n.locale)}</span>
				<span class="map-pemilih-ket">Ikon tampil di tengah folder supaya bulan ini gampang dikenali.</span>
			</div>
			<button
				type="button"
				class="map-pemilih-tutup"
				aria-label="Tutup"
				onclick={(ev) => {
					ev.stopPropagation();
					pilihIkon = false;
				}}><Ikon nama="tutup" ukuran={16} /></button
			>
		</div>
		<div class="map-pemilih-isi" role="listbox" aria-label="Daftar emoji">
			{#each KELOMPOK_EMOJI as k (k.label)}
				<span class="t-data t-data-ink map-pemilih-label">{k.label}</span>
				<div class="map-pemilih-grid">
					{#each k.isi as e (e)}
						<button
							type="button"
							role="option"
							aria-selected={ikon === e}
							aria-label="Ikon {e}"
							class="map-pemilih-emoji"
							class:aktif={ikon === e}
							onclick={(ev) => pasangIkon(ev, e)}>{e}</button
						>
					{/each}
				</div>
			{/each}
		</div>
		<div class="map-pemilih-kaki">
			<button type="button" class="tbl-garis" style="min-height:36px" onclick={(ev) => pasangIkon(ev, null)}>
				Tanpa ikon
			</button>
			<span class="t-data t-data-ink">Tersimpan di perangkat ini</span>
		</div>
	</div>
{/if}
</div>

<style>
	.map-kini {
		position: absolute;
		left: 50%;
		top: 4px;
		z-index: 7;
		transform: translateX(-50%) rotate(-2deg);
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 9px 3px 7px;
		background: #f6f2e6;
		color: var(--ink);
		font-family: var(--f-hand);
		font-weight: 600;
		font-size: 0.86rem;
		line-height: 1.2;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
		white-space: nowrap;
		pointer-events: none;
	}
	.map-kini-pin {
		width: 10px;
		height: 10px;
		background: var(--pin-mood-1);
	}
	.map-ikon-tombol {
		position: absolute;
		right: 8px;
		bottom: 8px;
		z-index: 6;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-height: 28px;
		padding: 0 8px 0 6px;
		border: 1px solid rgb(27 27 23 / 0.28);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.72);
		color: var(--ink-soft);
		font-family: var(--f-display);
		font-size: 0.74rem;
		font-weight: 600;
		line-height: 1;
		cursor: pointer;
		opacity: 0.55;
		transition:
			opacity var(--dur-fast) var(--ease-quiet),
			background var(--dur-fast) var(--ease-quiet);
	}
	.map-ikon-emoji {
		font-size: 0.95rem;
	}
	.map-bungkus:hover .map-ikon-tombol,
	.map-ikon-tombol:focus-visible,
	.map-ikon-tombol[aria-expanded='true'] {
		opacity: 1;
		background: #f6f2e6;
		color: var(--ink);
	}
	@media (hover: none) {
		.map-ikon-tombol {
			opacity: 0.9;
		}
	}
	@media (max-width: 520px) {
		.map-ikon-teks {
			display: none;
		}
	}
	:global(html[data-gaya='liquid-glass']) .map-ikon-tombol {
		background: rgb(0 0 0 / 0.45);
		border-color: rgb(255 255 255 / 0.3);
		color: #f1eee6;
	}
	:global(html[data-gaya='liquid-glass']) .map-bungkus:hover .map-ikon-tombol,
	:global(html[data-gaya='liquid-glass']) .map-ikon-tombol:focus-visible,
	:global(html[data-gaya='liquid-glass']) .map-ikon-tombol[aria-expanded='true'] {
		background: rgb(0 0 0 / 0.65);
		color: #ffffff;
	}
	:global(html[data-gaya='liquid-glass']) .map-kini {
		background: rgb(0 0 0 / 0.55);
		border: 1px solid rgb(255 255 255 / 0.3);
		color: #f1eee6;
	}
	:global(html[data-gaya='line-art']) .map-ikon-tombol {
		background: var(--room-wall);
		border-color: var(--ink-on-board);
		color: var(--ink-on-board);
	}
	:global(html[data-gaya='line-art']) .map-kini {
		background: var(--room-wall);
		border: 1px solid var(--ink-on-board);
		color: var(--ink-on-board);
		box-shadow: none;
	}
	.map-pemilih {
		position: absolute;
		z-index: 35;
		top: calc(100% - 8px);
		left: 0;
		width: max(100%, 300px);
		max-width: min(360px, calc(100vw - 32px));
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
	}
	.map-pemilih-kepala {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}
	.map-pemilih-kepala > div {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
	}
	.map-pemilih-judul {
		color: var(--ink);
		font-size: var(--text-base);
	}
	.map-pemilih-ket {
		font-family: var(--f-read);
		font-size: 0.8rem;
		line-height: 1.4;
		color: var(--ink-soft);
	}
	.map-pemilih-tutup {
		cursor: pointer;
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border: none;
		border-radius: var(--r-control);
		background: transparent;
		color: var(--ink-soft);
	}
	.map-pemilih-tutup:hover {
		background: rgb(27 27 23 / 0.08);
	}
	.map-pemilih-isi {
		max-height: 260px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-right: 2px;
	}
	.map-pemilih-label {
		margin-top: 6px;
	}
	.map-pemilih-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
		gap: 2px;
	}
	.map-pemilih-emoji {
		cursor: pointer;
		min-height: 34px;
		border: none;
		border-radius: var(--r-control);
		background: transparent;
		font-size: 1.15rem;
		line-height: 1;
	}
	.map-pemilih-emoji:hover {
		background: rgb(27 27 23 / 0.1);
	}
	.map-pemilih-emoji.aktif {
		background: rgb(27 27 23 / 0.16);
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.map-pemilih-kaki {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		padding-top: 4px;
		border-top: 1px solid rgb(27 27 23 / 0.12);
	}
</style>
