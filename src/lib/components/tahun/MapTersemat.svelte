<script lang="ts">
	import Ikon from '$components/dasar/Ikon.svelte';
	import { PAPERS } from '$lib/utils/kertas.ts';

	interface Props {
		jumlah: number;
		mobile?: boolean;
		onbuka: () => void;
	}

	let { jumlah, mobile = false, onbuka }: Props = $props();

	const sudut = $derived(
		Array.from({ length: Math.min(4, jumlah) }, (_, k) => ({
			h: 12 + ((k * 7) % 8),
			warna: PAPERS[(k * 2) % 5] as string,
			rot: ((k * 5) % 7) - 3
		}))
	);
</script>

<div class="rak-semat" class:mobile>
	<button type="button" class="map-bulan map-semat" data-kosong={jumlah === 0 ? '1' : '0'} onclick={onbuka}>
		<span class="pin-bulat semat-pin" aria-hidden="true"></span>
		<div class="sudut" style="right:{mobile ? 10 : 14}px;top:{mobile ? 5 : 6}px">
			{#each sudut as s, i (i)}
				<span
					style="width:{mobile ? 18 : 22}px;height:{s.h}px;background-image:var(--tex-grain), linear-gradient({s.warna},{s.warna});background-blend-mode:multiply,normal;box-shadow:1px 1px 0 rgb(0 0 0 / 0.2);transform:rotate({s.rot}deg)"
				></span>
			{/each}
		</div>
		<div class="map-lidah" style={mobile ? 'width:60px;height:16px;margin-left:10px' : ''}></div>
		<div class="map-badan" style="height:{mobile ? 96 : 118}px;padding:{mobile ? 11 : 14}px">
			<span class="map-label" style={mobile ? 'font-size:0.92rem;padding:3px 8px' : ''}>
				<Ikon nama="pin" ukuran={14} tebal={2.2} /> Tersemat
			</span>
			<span class="t-data" style="color:{jumlah === 0 ? 'var(--ink-faint)' : 'var(--ink-soft)'}">
				{jumlah === 0 ? 'belum ada' : `${jumlah} jurnal`}
			</span>
		</div>
	</button>
	<div class="ket">
		<span class="t-judul judul">Folder khusus jurnal yang kamu sematkan</span>
		<span class="isi">
			Dari bulan dan tahun mana pun, semuanya berkumpul di satu tempat. Sematkan lewat tombol pin di
			jurnal, lepas kapan saja.
		</span>
	</div>
</div>

<style>
	.rak-semat {
		display: grid;
		grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
		gap: var(--s-6);
		align-items: center;
		padding: var(--s-5) var(--s-6);
		border: 1px solid var(--garis-ruang);
		border-radius: var(--r-control);
		background: var(--isi-ruang);
	}
	.rak-semat.mobile {
		grid-template-columns: minmax(0, 1fr);
		gap: var(--s-4);
		padding: var(--s-4);
	}
	.map-semat {
		width: 100%;
		max-width: 240px;
		transform: rotate(-1deg);
	}
	.map-semat[data-kosong='1'] {
		opacity: 0.75;
	}
	.semat-pin {
		position: absolute;
		left: 50%;
		top: 10px;
		z-index: 4;
		width: 17px;
		height: 17px;
		transform: translateX(-50%);
		background: var(--pin-mood-1);
	}
	.sudut {
		position: absolute;
		display: flex;
		gap: 6px;
		z-index: 0;
	}
	.map-badan {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	.map-label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.ket {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.judul {
		font-size: var(--text-md);
	}
	.isi {
		font-family: var(--f-read);
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--ink-on-board-dim);
		max-width: 60ch;
	}
</style>
