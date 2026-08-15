<script lang="ts">
	import Kertas from '$components/dasar/Kertas.svelte';
	import KartuFeed from '$components/publik/KartuFeed.svelte';
	import { PAPERS, PIN_GRADIENT } from '$lib/utils/kertas.ts';
	import { reveal } from '$lib/utils/reveal.ts';
	import { LABEL_JENIS, LABEL_KATEGORI, PAKU_KATEGORI } from '$lib/redact/skor.ts';
	import type { HasilPindai } from '$lib/redact/tipe.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const contoh = [
		{ hari: 16, mood: 5, teks: 'Hari ini aku tidak menghindar dari satu pun percakapan.', rot: -2.4 },
		{ hari: 19, mood: 4, teks: 'Beli kembang sepatu di depan pasar.', rot: 1.8 },
		{ hari: 22, mood: 3, teks: 'Minggu. Tidur siang dua jam, bangun bingung ini hari apa.', rot: -1.2 }
	];

	const kenapa = [
		{
			judul: 'Dienkripsi di perangkatmu',
			isi: 'Catatan dikunci di ponsel atau laptopmu sebelum dikirim. Server hanya menyimpan huruf acak, dan kuncinya tidak pernah ikut menyeberang.'
		},
		{
			judul: 'Jalan penuh tanpa jaringan',
			isi: 'Tulis, baca, sunting, cari, ganti tema — semuanya tetap bisa saat tidak ada internet. Begitu tersambung, tulisanmu menyusul sendiri.'
		},
		{
			judul: 'Penyaring Identitas',
			isi: 'Sebelum sebuah catatan terbit, Cloister memindainya di perangkatmu dan menandai hal yang bisa mengarah ke orang tertentu. Tanpa mengirim teks ke mana pun.'
		}
	];

	const caraKerja = [
		{
			nomor: '01',
			judul: 'Tulis seperti biasa',
			isi: 'Editor markdown dengan autosave — tanpa tombol simpan. Sisipkan gambar, tabel, daftar centang, di posisi mana pun.'
		},
		{
			nomor: '02',
			judul: 'Terkunci sebelum berangkat',
			isi: 'Setiap catatan dienkripsi XChaCha20-Poly1305 di perangkatmu. Yang tersimpan di server hanya replika acak.'
		},
		{
			nomor: '03',
			judul: 'Terbitkan yang kamu pilih',
			isi: 'Sebagian tulisan layak dibagikan. Penyaring Identitas berjaga di perbatasan supaya tidak ada orang lain yang ikut terpapar.'
		}
	];

	const persona = [
		{
			ikon: '📓',
			nama: 'Diary harian',
			isi: 'Tempat yang cepat dibuka dari HP kapan pun, terasa seperti buku catatan pribadi — dan yang kamu tulis benar-benar cuma kamu yang bisa baca.'
		},
		{
			ikon: '🧠',
			nama: 'Second brain',
			isi: 'Ide, kutipan, hasil bacaan, hal yang mau kamu ingat lima tahun lagi. Cari cepat, kelompokkan dengan tag, semuanya tetap milikmu.'
		},
		{
			ikon: '🔑',
			nama: 'Brankas catatan penting',
			isi: 'Nomor rekening, akun, PIN, dokumen — dalam tabel yang rapi. Server tidak bisa membacanya, jadi tidak ada yang bocor walau server dibobol.'
		},
		{
			ikon: '📝',
			nama: 'Catatan sehari-hari',
			isi: 'Daftar belanja, resep, rencana perjalanan, daftar centang. Sederhana, offline, tersinkron ke semua perangkatmu.'
		},
		{
			ikon: '🌱',
			nama: 'Berbagi yang layak dibagi',
			isi: 'Sebagian tulisan pantas dibaca orang. Terbitkan yang kamu pilih ke halaman publik dengan nama pena — sisanya tetap di balik dinding.'
		},
		{
			ikon: '🧑‍💻',
			nama: 'Untuk yang mau memeriksa',
			isi: 'Kode terbuka, bisa dijalankan sendiri, dan klaim enkripsinya bisa kamu uji langsung di halaman Bukti. Bukan sekadar janji.'
		}
	];

	const CONTOH_SARING =
		'Kemarin ketemu Rina di kosnya di Jl. Kaliurang No. 14, Sleman. Dia cerita soal utangnya, nomor rekeningnya 1234567897 kalau mau transfer. WA dia 081234567890.';

	let teksSaring = $state('');
	let hasilSaring = $state<HasilPindai | null>(null);
	let memindai = $state(false);

	async function pindaiDemo() {
		if (!teksSaring.trim() || memindai) return;
		memindai = true;
		try {
			const { saring } = await import('$lib/redact/klien.ts');
			hasilSaring = await saring(teksSaring);
		} finally {
			memindai = false;
		}
	}

	const statistik = $derived([
		{ nilai: data.statistik.catatan, label: 'catatan terbit' },
		{ nilai: data.statistik.penulis, label: 'penulis' },
		{ nilai: data.statistik.reaksi, label: 'reaksi' },
		{ nilai: data.statistik.komentar, label: 'komentar' }
	]);
</script>

<svelte:head>
	<title>Cloister: Jurnal Pribadi dengan Privasi Kriptografis</title>
	<meta
		name="description"
		content="Jurnal pribadi dengan privasi kriptografis. Catatan privat dienkripsi di perangkat sebelum sinkronisasi, jadi server menyimpan replika terenkripsi, bukan isi yang dapat dibaca."
	/>
</svelte:head>

<section
	style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:var(--s-8);align-items:center;padding:var(--s-6) 0 var(--s-8)"
>
	<div class="muncul" style="display:flex;flex-direction:column;gap:var(--s-5)">
		<h1 class="t-judul" style="font-size:var(--text-2xl);line-height:1">
			Ditulis di dalam.<br />Tidak terbaca dari luar.
		</h1>
		<p
			style="margin:0;font-family:var(--f-read);font-size:var(--text-md);line-height:1.72;color:var(--ink-on-board-dim);max-width:52ch;text-wrap:pretty"
		>
			Cloister adalah ruang berdinding tempat orang menulis. Catatan privat dienkripsi di ponsel
			atau laptopmu sebelum meninggalkan browser — dan yang layak dibagikan, kamu terbitkan dengan
			sadar ke halaman publik.
		</p>
		<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
			<a href="/daftar" class="tbl" style="text-decoration:none">Mulai menulis</a>
			<a href="/tentang" class="tbl-papan" style="text-decoration:none">Tentang aplikasi</a>
		</div>
		<p
			style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:44ch"
		>
			Dienkripsi sebelum sinkronisasi. Tetap berfungsi tanpa jaringan. Dipulihkan oleh pengguna.
			Server tidak dapat membaca isi privat.
		</p>
	</div>

	<div class="bingkai-kayu muncul" style="--tunda:120ms">
		<div class="papan-flanel" style="padding:34px">
			<ul
				style="margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:20px;justify-content:center"
			>
				{#each contoh as c, i (c.hari)}
					<li class="hero-jatuh" style="position:relative;width:150px;--tunda:{200 + i * 160}ms">
						<span
							aria-hidden="true"
							class="pin-bulat"
							style="position:absolute;left:50%;top:-9px;z-index:4;transform:translateX(-50%);width:17px;height:17px;background:{PIN_GRADIENT[
								c.mood
							]}"
						></span>
						<div
							class="kartu-papan"
							style="--kertas:{PAPERS[i % 5]};transform:rotate({c.rot}deg);height:150px;cursor:default"
						>
							<span class="t-hand" style="font-size:2.2rem;line-height:0.82">{c.hari}</span>
							<p
								style="margin:0;font-family:var(--f-read);font-size:0.9rem;line-height:1.5;color:var(--ink-soft)"
							>
								{c.teks}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

{#if data.statistik.catatan > 0}
	<section
		aria-label="Statistik ruang publik"
		style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:var(--s-4);padding-bottom:var(--s-8)"
	>
		{#each statistik as st, i (st.label)}
			<div
				use:reveal={{ tunda: i * 90 }}
				style="display:flex;flex-direction:column;gap:2px;padding:var(--s-4);border:1px solid var(--garis-ruang);border-radius:var(--r-control)"
			>
				<span class="t-hand" style="font-size:2.2rem;line-height:1;color:var(--ink-on-board)"
					>{st.nilai}</span
				>
				<span class="t-data" style="color:var(--ink-on-board-dim)">{st.label}</span>
			</div>
		{/each}
	</section>
{/if}

{#if data.terbaru.length > 0}
	<section style="display:flex;flex-direction:column;gap:var(--s-4);padding-bottom:var(--s-8)">
		<div use:reveal style="display:flex;align-items:baseline;gap:var(--s-4);flex-wrap:wrap">
			<h2 class="t-judul t-lg">Baru terbit dari balik dinding</h2>
			<a href="/baca" class="t-data" style="margin-left:auto;color:var(--ink-on-board-dim)"
				>Lihat semua &rarr;</a
			>
		</div>
		<p
			use:reveal
			style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:64ch"
		>
			Tulisan yang sengaja dikeluarkan dari enkripsi oleh penulisnya. Sisanya — sebagian besar —
			tetap tertutup di balik dinding.
		</p>
		<div
			style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(270px,100%),1fr));gap:var(--s-5);align-items:start"
		>
			{#each data.terbaru as item, i (item.id)}
				<div use:reveal={{ tunda: (i % 3) * 90 }}>
					<KartuFeed {item} />
				</div>
			{/each}
		</div>
	</section>
{/if}

<section style="display:flex;flex-direction:column;gap:var(--s-4);padding-bottom:var(--s-8)">
	<h2 class="t-judul t-lg" use:reveal>Coba penyaringnya. Di sini. Tanpa akun.</h2>
	<p
		use:reveal
		style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:66ch"
	>
		Ini fitur yang berjaga sebelum catatan diterbitkan: menandai hal yang bisa mengarah ke orang
		tertentu. Semuanya berjalan di perangkatmu — buka tab Network kalau mau membuktikan tidak ada
		satu pun teks yang dikirim.
	</p>
	<div use:reveal={{ tunda: 100 }}>
		<Kertas warna="bone" rot={-0.3} padding="var(--s-5)">
			<div style="display:flex;flex-direction:column;gap:var(--s-3)">
				<textarea
					bind:value={teksSaring}
					rows="4"
					maxlength="2000"
					placeholder="Tempel tulisan apa pun di sini — atau pakai contoh."
					aria-label="Teks untuk dipindai"
					style="width:100%;resize:vertical;border:1px solid rgb(27 27 23 / 0.22);border-radius:var(--r-control);padding:12px 14px;background:transparent;font-family:var(--f-read);font-size:var(--text-sm);line-height:1.6;color:var(--ink)"
				></textarea>
				<div style="display:flex;gap:var(--s-3);flex-wrap:wrap;align-items:center">
					<button
						type="button"
						class="tbl"
						disabled={memindai || !teksSaring.trim()}
						onclick={pindaiDemo}
					>
						{memindai ? 'Memindai…' : 'Pindai di perangkat ini'}
					</button>
					<button
						type="button"
						class="tbl-garis"
						onclick={() => {
							teksSaring = CONTOH_SARING;
							void pindaiDemo();
						}}>Pakai contoh</button
					>
					{#if hasilSaring}
						<span
							style="display:inline-flex;align-items:center;gap:8px;margin-left:auto;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-soft)"
						>
							<span
								style="width:12px;height:12px;border-radius:50%;background:{PAKU_KATEGORI[
									hasilSaring.kategori
								]}"
							></span>
							{LABEL_KATEGORI[hasilSaring.kategori]} · skor {hasilSaring.skor}
						</span>
					{/if}
				</div>
				{#if hasilSaring}
					{#if hasilSaring.temuan.length > 0}
						<div style="display:flex;flex-wrap:wrap;gap:8px">
							{#each hasilSaring.temuan as t (t.id)}
								<span
									class="tag-cip"
									style="cursor:default;display:inline-flex;gap:6px;align-items:baseline"
								>
									<strong
										style="font-family:var(--f-data);font-size:0.66rem;letter-spacing:0.06em;text-transform:uppercase"
										>{LABEL_JENIS[t.jenis]}</strong
									>
									<span
										style="max-width:22ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
										>{t.teks}</span
									>
								</span>
							{/each}
						</div>
					{:else}
						<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">
							Bersih — tidak ditemukan hal yang mengarah ke orang tertentu.
						</p>
					{/if}
					<p
						style="margin:0;font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-faint)"
					>
						Pemindaian berjalan {hasilSaring.durasiMs} ms di perangkat ini. Tidak ada teks yang
						meninggalkan halaman.
					</p>
				{/if}
			</div>
		</Kertas>
	</div>
</section>

<section style="display:flex;flex-direction:column;gap:var(--s-4);padding-bottom:var(--s-8)">
	<h2 class="t-judul t-lg" use:reveal>Tiga langkah, satu janji</h2>
	<div
		style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:var(--s-4)"
	>
		{#each caraKerja as c, i (c.nomor)}
			<div use:reveal={{ tunda: i * 110 }}>
				<Kertas warna={i === 1 ? 'biru' : 'bone'} rot={i % 2 === 0 ? -0.6 : 0.6} padding="var(--s-5)">
					<span class="t-hand" style="font-size:2rem;line-height:1;color:var(--ink-faint)"
						>{c.nomor}</span
					>
					<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-md);margin:8px 0 8px">
						{c.judul}
					</h3>
					<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">{c.isi}</p>
				</Kertas>
			</div>
		{/each}
	</div>
</section>

<section style="display:flex;flex-direction:column;gap:var(--s-4);padding-bottom:var(--s-8)">
	<h2 class="t-judul t-lg" use:reveal>Kenapa Cloister</h2>
	<div
		style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:var(--s-5)"
	>
		{#each kenapa as k, i (k.judul)}
			<div use:reveal={{ tunda: i * 110 }}>
				<Kertas
					kelas="angkat"
					warna={i % 2 === 0 ? 'bone' : 'buram'}
					rot={i % 2 === 0 ? -0.8 : 0.9}
					padding="var(--s-5)"
				>
					<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-md);margin-bottom:10px">
						{k.judul}
					</h3>
					<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">{k.isi}</p>
				</Kertas>
			</div>
		{/each}
	</div>
	<p
		use:reveal
		style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim)"
	>
		Arsitektur lengkapnya — hierarki kunci, model ancaman, dan apa yang tetap kami ketahui — ada di
		<a href="/tentang">halaman tentang</a>, dan buktinya bisa diperiksa langsung di
		<a href="/bukti">halaman Bukti</a>.
	</p>
</section>

<section style="display:flex;flex-direction:column;gap:var(--s-4);padding-bottom:var(--s-8)">
	<h2 class="t-judul t-lg" use:reveal>Satu ruang, banyak kegunaan</h2>
	<p
		use:reveal
		style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:64ch"
	>
		Cloister bukan cuma buat curhat malam hari. Apa pun yang terlalu pribadi untuk ditaruh di
		aplikasi catatan biasa, di sini tempatnya.
	</p>
	<div
		style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:var(--s-4)"
	>
		{#each persona as p, i (p.nama)}
			<div use:reveal={{ tunda: (i % 3) * 110 }}>
				<Kertas
					kelas="angkat"
					warna={i % 3 === 1 ? 'manila' : i % 3 === 2 ? 'bone' : 'buram'}
					rot={i % 2 === 0 ? 0.5 : -0.5}
					padding="var(--s-5)"
				>
					<span aria-hidden="true" style="font-size:1.6rem;line-height:1">{p.ikon}</span>
					<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-base);margin:10px 0 8px">
						{p.nama}
					</h3>
					<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">{p.isi}</p>
				</Kertas>
			</div>
		{/each}
	</div>
</section>

<section use:reveal>
	<Kertas warna="manila" rot={-0.4} padding="var(--s-6)">
		<div
			style="display:flex;flex-wrap:wrap;gap:var(--s-5);align-items:center;justify-content:space-between"
		>
			<div style="display:flex;flex-direction:column;gap:8px;max-width:52ch">
				<h2 class="t-judul t-lg" style="color:var(--ink)">Mulai menulis kapan saja</h2>
				<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">
					Gratis, tanpa iklan, dan kodenya terbuka untuk diperiksa siapa pun. Pagi, siang, atau
					malam — ruangnya selalu siap. Kalau sandimu hilang, 24 kata pemulihan adalah satu-satunya
					jalan kembali, karena kami memang tidak menyimpan apa pun yang bisa membuka tulisanmu.
				</p>
			</div>
			<a href="/daftar" class="tbl" style="text-decoration:none;white-space:nowrap">Buat akun</a>
		</div>
	</Kertas>
</section>
