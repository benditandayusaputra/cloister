<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import Tirai from './Tirai.svelte';

	const KEY = 'cloister:tutorial-v1';

	let terbuka = $state(false);
	let langkah = $state(0);

	$effect(() => {
		if (browser && localStorage.getItem(KEY) !== '1') terbuka = true;
	});

	const LANGKAH = [
		{
			paku: '#4F7F53',
			judul: 'Selamat datang di ruang tulismu',
			isi: 'Catatanmu tersusun sebagai kartu kertas yang ditancap paku di papan flanel — satu papan per bulan, satu map per tahun. Semuanya dienkripsi di perangkat ini sebelum disinkronkan, jadi server tidak pernah bisa membacanya.'
		},
		{
			paku: '#C08A2E',
			judul: 'Menulis itu tanpa upacara',
			isi: 'Tekan "Tulis hari ini", langsung ketik. Tidak ada tombol simpan — semuanya tersimpan otomatis di perangkatmu. Ada bilah alat untuk menebalkan, membuat daftar, dan menyisipkan gambar di posisi mana pun di teks.'
		},
		{
			paku: '#A85B32',
			judul: 'Kuncimu, tanggung jawabmu',
			isi: '24 kata pemulihan yang kamu simpan saat mendaftar adalah satu-satunya jalan kembali kalau sandimu hilang. Kami tidak menyimpan salinannya — itu konsekuensi dari server yang tidak bisa membaca apa pun.'
		},
		{
			paku: '#2B4F8E',
			judul: 'Privat dulu, publik kalau kamu mau',
			isi: 'Semua tulisan lahir privat. Kalau satu catatan layak dibagikan, terbitkan dengan sadar — dan sebelum terbit, Penyaring Identitas memindainya di perangkatmu untuk menandai hal yang bisa mengarah ke orang lain.'
		}
	];

	const akhir = $derived(langkah === LANGKAH.length - 1);
	const aktif = $derived(LANGKAH[langkah] ?? LANGKAH[0]!);

	function selesai() {
		if (browser) localStorage.setItem(KEY, '1');
		terbuka = false;
	}

	function mulaiMenulis() {
		selesai();
		void goto('/app/hari-ini');
	}
</script>

<Tirai {terbuka} label="Panduan awal" ontutup={selesai}>
	<div
		class="kertas kertas-angkat muncul"
		style="position:relative;width:min(480px,calc(100vw - 32px));padding:var(--s-6);display:flex;flex-direction:column;gap:var(--s-4)"
	>
		<span
			aria-hidden="true"
			class="pin-bulat"
			style="position:absolute;left:50%;top:-9px;translate:-50% 0;width:18px;height:18px;background:radial-gradient(circle at 32% 28%, color-mix(in srgb, {aktif.paku} 70%, white), {aktif.paku} 62%, color-mix(in srgb, {aktif.paku} 65%, black))"
		></span>

		<span class="t-data t-data-ink">Panduan · {langkah + 1} dari {LANGKAH.length}</span>

		<h2 class="t-judul" style="color:var(--ink);font-size:var(--text-lg)">{aktif.judul}</h2>

		<p class="t-baca" style="color:var(--ink-soft);min-height:6.5em">{aktif.isi}</p>

		<div style="display:flex;gap:6px" aria-hidden="true">
			{#each LANGKAH as l, i (l.judul)}
				<span
					style="width:{i === langkah ? 22 : 8}px;height:8px;border-radius:4px;background:{i === langkah
						? 'var(--accent)'
						: 'rgb(27 27 23 / 0.18)'};transition:width var(--dur-base) var(--ease-lift)"
				></span>
			{/each}
		</div>

		<div style="display:flex;gap:var(--s-3);flex-wrap:wrap;align-items:center;padding-top:var(--s-2)">
			{#if akhir}
				<button type="button" class="tbl" onclick={mulaiMenulis}>Tulis catatan pertamamu</button>
				<button type="button" class="tbl-garis" onclick={selesai}>Jelajahi dulu</button>
			{:else}
				<button type="button" class="tbl" onclick={() => (langkah += 1)}>Lanjut</button>
				{#if langkah > 0}
					<button type="button" class="tbl-garis" onclick={() => (langkah -= 1)}>Kembali</button>
				{/if}
				<button
					type="button"
					class="tbl-garis"
					style="margin-left:auto"
					onclick={selesai}>Lewati</button
				>
			{/if}
		</div>
	</div>
</Tirai>
