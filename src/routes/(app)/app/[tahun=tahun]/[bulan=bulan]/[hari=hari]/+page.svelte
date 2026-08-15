<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import KepalaAplikasi from '$components/nav/KepalaAplikasi.svelte';
	import LembarBaca from '$components/entri/LembarBaca.svelte';
	import SisiEntri from '$components/entri/SisiEntri.svelte';
	import Editor from '$components/entri/Editor.svelte';
	import ModalTerbit from '$components/publik/ModalTerbit.svelte';
	import ModalTautanRahasia from '$components/publik/ModalTautanRahasia.svelte';
	import PitaOffline from '$components/nav/PitaOffline.svelte';
	import TiraiCari from '$components/cari/TiraiCari.svelte';
	import { entriesRepo, emptyEntry } from '$lib/db/local/repo.ts';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { entri as toko } from '$lib/state/entri.svelte.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { namaBulan, pad2, jamPendek } from '$lib/utils/tanggal.ts';
	import { layarKecil } from '$lib/utils/perangkat.ts';
	import { pindah } from '$lib/utils/transisi.ts';
	import { mintaPersistensi } from '$lib/pwa/daftar.ts';
	import { tanya } from '$lib/state/konfirmasi.svelte.ts';

	const tahun = $derived(Number(page.params.tahun));
	const bulan = $derived(Number(page.params.bulan));
	const iso = $derived(`${page.params.tahun}-${page.params.bulan}-${page.params.hari}`);

	let daftarHariIni = $state<LocalEntry[]>([]);
	let aktif = $state<LocalEntry | null>(null);
	let menyunting = $state(false);
	let mobile = $state(false);
	let cariTerbuka = $state(false);
	let sheetTerbuka = $state(false);
	let modalTerbit = $state(false);
	let modalBagikan = $state(false);
	let simpanLabel = $state('');
	let debounce: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		mobile = layarKecil();
		addEventListener('resize', () => (mobile = layarKecil()));
	});

	$effect(() => {
		const tanggal = iso;
		const idParam = page.url.searchParams.get('e');
		const baru = page.url.searchParams.get('baru') === '1';
		void (async () => {
			const rows = await entriesRepo.byDate(tanggal);
			daftarHariIni = rows;

			if (idParam) {
				aktif = rows.find((r) => r.id === idParam) ?? rows[0] ?? null;
				menyunting = false;
			} else if (baru || rows.length === 0) {
				aktif = emptyEntry(tanggal);
				menyunting = true;
			} else {
				aktif = rows[0] ?? null;
				menyunting = false;
			}
			simpanLabel = i18n.t.app.tersimpanDi(jamPendek());
		})();
	});

	function ubah(patch: Partial<LocalEntry>) {
		if (!aktif) return;
		aktif = { ...aktif, ...patch };
		jadwalkanSimpan();
	}

	/** Autosave 800 ms setelah ketikan terakhir; tidak ada tombol simpan. */
	function jadwalkanSimpan() {
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => void simpan(), 800);
	}

	async function simpan() {
		if (!aktif) return;
		const kosong = !aktif.title.trim() && !aktif.body.trim() && aktif.attachments.length === 0;
		if (kosong && aktif.rev === 0) return;
		const tersimpan = await entriesRepo.save(aktif);
		aktif = tersimpan;
		simpanLabel = i18n.t.app.tersimpanDi(jamPendek());
		await toko.segarkan();
		void sync.jalankan();
	}

	async function selesai() {
		if (debounce) clearTimeout(debounce);
		await simpan();
		const semua = await entriesRepo.all();
		void mintaPersistensi(semua.length);
		toast.show(
			i18n.locale === 'en'
				? 'Saved on this device. It will be sent when there is a connection.'
				: 'Tersimpan di perangkat ini. Akan dikirim saat ada koneksi.'
		);
		pindah(() => goto(`/app/${tahun}/${pad2(bulan)}`));
	}

	async function hapus() {
		if (!aktif) return;
		if (aktif.rev === 0 && !aktif.title.trim() && !aktif.body.trim()) {
			pindah(() => goto(`/app/${tahun}/${pad2(bulan)}`));
			return;
		}
		const ok = await tanya({
			judul: 'Hapus tulisan ini?',
			pesan: 'Tulisan dihapus dari perangkat ini dan dari semua perangkatmu yang lain saat sinkron berikutnya.',
			teksYa: 'Hapus tulisan',
			bahaya: true
		});
		if (!ok) return;
		await entriesRepo.remove(aktif.id);
		await toko.segarkan();
		void sync.jalankan();
		toast.show('Tulisan dihapus.');
		pindah(() => goto(`/app/${tahun}/${pad2(bulan)}`));
	}

	function tulisLagi() {
		aktif = emptyEntry(iso);
		menyunting = true;
	}

	async function togglePin() {
		if (!aktif) return;
		if (aktif.rev === 0 && !aktif.title.trim() && !aktif.body.trim()) {
			toast.show('Tulis sesuatu dulu, baru bisa disematkan.');
			return;
		}
		if (debounce) clearTimeout(debounce);
		const pinned = !aktif.pinned;
		aktif = await entriesRepo.save({ ...aktif, pinned });
		await toko.segarkan();
		void sync.jalankan();
		toast.show(pinned ? 'Disematkan. Ada di folder Tersemat.' : 'Dilepas dari Tersemat.');
	}

	onDestroy(() => {
		if (debounce) {
			clearTimeout(debounce);
			void simpan();
		}
	});

	const judul = $derived(`${namaBulan(bulan, i18n.locale)}`);
</script>

<svelte:head><title>{iso} · Cloister</title></svelte:head>

<div class="ruangan">
	<div class="shell" style="display:flex;flex-direction:column;gap:var(--s-4)">
		<KepalaAplikasi
			judul={mobile ? judul : `${judul} ${tahun}`}
			kembaliLabel={judul}
			{mobile}
			onkembali={() => pindah(() => goto(`/app/${tahun}/${pad2(bulan)}`))}
			oncari={() => (cariTerbuka = true)}
		/>
		<PitaOffline />

		{#if daftarHariIni.length > 1}
			<div style="display:flex;gap:8px;flex-wrap:wrap;padding:0 var(--s-2)">
				<span class="t-data">{daftarHariIni.length} tulisan di tanggal ini</span>
				{#each daftarHariIni as e, i (e.id)}
					<button
						type="button"
						class="tbl-papan {aktif?.id === e.id ? 'tbl-papan-aktif' : ''}"
						style="min-height:32px;padding:0 12px"
						onclick={() => {
							aktif = e;
							menyunting = false;
						}}
					>
						{e.conflictLabel ? i18n.t.app.konflik : `#${i + 1}`}
					</button>
				{/each}
			</div>
		{/if}

		{#if aktif}
			{#if menyunting}
				<Editor
					entri={aktif}
					saranTag={toko.tagTersedia}
					{simpanLabel}
					{mobile}
					onubah={ubah}
					onselesai={selesai}
					onhapus={hapus}
					onpin={togglePin}
				/>
			{:else if mobile}
				<div style="display:flex;flex-direction:column;gap:var(--s-4)">
					<LembarBaca entri={aktif} mobile />
					<button
						type="button"
						class="tbl-papan"
						style="min-height:48px;justify-content:center"
						onclick={() => (sheetTerbuka = !sheetTerbuka)}>Tag, lampiran, versi</button
					>
					{#if sheetTerbuka}
						<SisiEntri
							entri={aktif}
							sudahTerbit={aktif.publicId !== null}
							onterbit={() => (modalTerbit = true)}
							onbagikan={() => (modalBagikan = true)}
							onpin={togglePin}
						/>
					{/if}
					<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
						<button type="button" class="tbl" onclick={() => (menyunting = true)}>
							{i18n.t.app.sunting}
						</button>
						<button type="button" class="tbl-bahaya" onclick={hapus}>{i18n.t.app.hapus}</button>
					</div>
				</div>
			{:else}
				<div style="display:grid;grid-template-columns:minmax(0,1fr) 288px;gap:var(--s-6);align-items:start">
					<div style="display:flex;flex-direction:column;gap:var(--s-5)">
						<LembarBaca entri={aktif} />
						<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
							<button type="button" class="tbl" onclick={() => (menyunting = true)}>
								{i18n.t.app.sunting}
							</button>
							<button
								type="button"
								class="tbl-papan"
								onclick={() => pindah(() => goto(`/app/${tahun}/${pad2(bulan)}`))}
								>{i18n.t.app.kembaliKePapan}</button
							>
							<button type="button" class="tbl-papan" onclick={tulisLagi}>
								Tulis lagi di tanggal ini
							</button>
							<button type="button" class="tbl-bahaya" style="margin-left:auto" onclick={hapus}>
								{i18n.t.app.hapus}
							</button>
						</div>
					</div>
					<SisiEntri
						entri={aktif}
						sudahTerbit={aktif.publicId !== null}
						onterbit={() => (modalTerbit = true)}
						onbagikan={() => (modalBagikan = true)}
					/>
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if aktif}
	<ModalTautanRahasia
		terbuka={modalBagikan}
		entri={aktif}
		ontutup={() => (modalBagikan = false)}
	/>

	<ModalTerbit
		terbuka={modalTerbit}
		entri={aktif}
		ontutup={() => (modalTerbit = false)}
		onterbit={async (publicId) => {
			if (!aktif) return;
			aktif = await entriesRepo.save({ ...aktif, publicId });
			modalTerbit = false;
		}}
	/>
{/if}

<TiraiCari terbuka={cariTerbuka} ontutup={() => (cariTerbuka = false)} />
