<script lang="ts">
	import { onMount } from 'svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import {
		PILIHAN_JENDELA,
		jendelaSekarang,
		setJendela,
		labelJendela,
		type JendelaBulan
	} from '$lib/sync/jendela.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let terpilih = $state<JendelaBulan>(0);
	let sibuk = $state(false);

	onMount(async () => {
		terpilih = await jendelaSekarang();
	});

	async function pilih(bulan: JendelaBulan) {
		if (bulan === terpilih || sibuk) return;
		sibuk = true;
		try {
			const { tarikUlang } = await setJendela(bulan);
			terpilih = bulan;
			await sync.jalankan();
			await entri.segarkan();
			toast.show(
				tarikUlang
					? 'Jendela diperlebar. Arsip ditarik ulang dari awal.'
					: 'Jendela sinkronisasi diperbarui.'
			);
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}
</script>

<Kertas warna="buram" padding="var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg" style="color:var(--ink)">Jendela sinkronisasi</h2>
		<p class="t-baca" style="max-width:62ch;color:var(--ink-soft)">
			Di perangkat dengan penyimpanan kecil, kamu bisa menarik hanya beberapa bulan terakhir. Tulisan
			lama tetap aman di server dan di perangkat lain, hanya tidak disalin ke sini.
		</p>

		<div style="display:flex;gap:8px;flex-wrap:wrap">
			{#each PILIHAN_JENDELA as bulan (bulan)}
				<button
					type="button"
					class="tag-cip {terpilih === bulan ? 'tag-cip-aktif' : ''}"
					style="min-height:36px;padding:0 14px"
					aria-pressed={terpilih === bulan}
					disabled={sibuk}
					onclick={() => pilih(bulan)}
				>
					{labelJendela(bulan, i18n.locale)}
				</button>
			{/each}
		</div>

		<span class="t-data t-data-ink">
			{terpilih === 0
				? 'Semua tulisan disalin ke perangkat ini.'
				: 'Memperlebar jendela akan menarik ulang arsip dari awal.'}
		</span>
	</div>
</Kertas>
