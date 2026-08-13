<script lang="ts">
	import Kertas from '$components/dasar/Kertas.svelte';
	import { PAPERS, PIN_GRADIENT } from '$lib/utils/kertas.ts';

	const contoh = [
		{ hari: 16, mood: 5, teks: 'Hari ini aku tidak menghindar dari satu pun percakapan.', rot: -2.4 },
		{ hari: 19, mood: 4, teks: 'Beli kembang sepatu di depan pasar.', rot: 1.8 },
		{ hari: 22, mood: 3, teks: 'Minggu. Tidur siang dua jam, bangun bingung ini hari apa.', rot: -1.2 }
	];

	const janji = [
		{
			judul: 'Privat sejak desain',
			isi: 'Privasi datang dari arsitekturnya, bukan dari janji kebijakan. Catatan dikunci di perangkatmu sebelum dikirim, dan rute privat di server hanya mau menerima muatan yang sudah terenkripsi.'
		},
		{
			judul: 'Lokal sebagai sumber utama',
			isi: 'Sumber kebenaran ada di perangkatmu, server cuma replika terenkripsi. Menulis, membaca, mengubah, mencari, ganti tema — semuanya tetap jalan tanpa jaringan.'
		},
		{
			judul: 'Tahan ganti perangkat',
			isi: 'Perangkat baru disambungkan lewat QR dan PIN dari perangkat lama, atau lewat 24 kata pemulihan. Kunci utama bisa dirotasi kalau satu perangkat jatuh ke tangan orang lain.'
		},
		{
			judul: 'Kendali di tanganmu',
			isi: 'Pindah dari privat ke publik selalu keputusan sadar. Sebelum terbit, Penyaring Identitas memindai tulisan di perangkat ini dan menandai hal yang bisa mengarah ke orang tertentu.'
		}
	];

	const alur = [
		{ nama: 'Perangkat', isi: 'Kamu mengetik. Teks tetap di RAM tab ini.' },
		{ nama: 'Pekerja Kriptografi', isi: 'libsodium WASM di worker terpisah. Kunci utama tidak pernah menyentuh thread utama.' },
		{ nama: 'Data terenkripsi', isi: 'ciphertext, nonce, wrapped_dek, dek_nonce, size_bucket.' },
		{ nama: 'Peladen', isi: 'Menyimpan replika terenkripsi. Tidak punya kunci untuk membukanya.' }
	];

	const kepercayaan = [
		{ judul: 'Model ancaman', isi: 'Ditulis terbuka, lengkap dengan yang tidak kami lindungi.', tautan: '/keamanan', label: 'Baca model ancaman' },
		{ judul: 'Pemulihan', isi: '24 kata BIP-39 yang diturunkan di perangkat. Kami tidak menyimpan salinannya.', tautan: '/keamanan', label: 'Cara pemulihan bekerja' },
		{ judul: 'Lisensi', isi: 'AGPL-3.0-or-later. Seluruh kode bisa diperiksa dan dijalankan sendiri.', tautan: 'https://github.com/benditandayusaputra/cloister', label: 'Lihat kode sumber' },
		{ judul: 'Pelaporan celah', isi: 'SECURITY.md memuat kontak dan kebijakan pengungkapan 90 hari.', tautan: 'https://github.com/benditandayusaputra/cloister/blob/main/SECURITY.md', label: 'Kebijakan keamanan' }
	];
</script>

<svelte:head>
	<title>Cloister: Jurnal Pribadi dengan Privasi Kriptografis</title>
	<meta
		name="description"
		content="Jurnal pribadi dengan privasi kriptografis. Catatan privat dienkripsi di perangkat sebelum sinkronisasi, jadi peladen menyimpan replika terenkripsi, bukan isi yang dapat dibaca."
	/>
</svelte:head>

<section
	style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:var(--s-8);align-items:center;padding:var(--s-6) 0 var(--s-8)"
>
	<div style="display:flex;flex-direction:column;gap:var(--s-5)">
		<h1 class="t-judul" style="font-size:var(--text-2xl);line-height:1">
			Ditulis di dalam.<br />Tidak terbaca dari luar.
		</h1>
		<p
			style="margin:0;font-family:var(--f-read);font-size:var(--text-md);line-height:1.72;color:var(--ink-on-board-dim);max-width:52ch;text-wrap:pretty"
		>
			Cloister adalah ruang berdinding tempat orang menulis. Apa yang ditulis di dalamnya tidak
			terlihat dari luar dinding. Catatan privat dienkripsi di ponsel atau laptopmu sebelum
			meninggalkan peramban, jadi yang tersimpan di peladen adalah replika terenkripsi, bukan isi
			yang dapat dibaca.
		</p>
		<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
			<a href="/daftar" class="tbl" style="text-decoration:none">Mulai menulis</a>
			<a href="/bukti" class="tbl-papan" style="text-decoration:none">Lihat buktinya</a>
		</div>
		<p
			style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:44ch"
		>
			Dienkripsi sebelum sinkronisasi. Tetap berfungsi tanpa jaringan. Dipulihkan oleh pengguna.
			Peladen tidak dapat membaca isi privat.
		</p>
	</div>

	<div class="bingkai-kayu">
		<div class="papan-flanel" style="padding:34px">
			<ul
				style="margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:20px;justify-content:center"
			>
				{#each contoh as c, i (c.hari)}
					<li style="position:relative;width:150px">
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

<section style="padding-top:var(--s-8);display:flex;flex-direction:column;gap:var(--s-4)">
	<h2 class="t-judul t-lg">Jalan yang ditempuh satu catatan</h2>
	<p
		style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:64ch"
	>
		Enkripsi terjadi sebelum apa pun meninggalkan peramban. Yang menyeberang ke peladen sudah berupa
		huruf acak, dan kunci untuk membukanya tidak pernah ikut menyeberang.
	</p>
	<ol
		style="margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--s-4);counter-reset:alur"
	>
		{#each alur as a, i (a.nama)}
			<li>
				<Kertas warna={i === 3 ? 'biru' : 'bone'} rot={i % 2 === 0 ? -0.7 : 0.7} padding="var(--s-4)">
					<span class="t-data t-data-ink">Langkah {i + 1}</span>
					<h3
						class="t-judul"
						style="color:var(--ink);font-size:var(--text-sm);margin:6px 0 8px"
					>
						{a.nama}
					</h3>
					<p class="t-baca" style="font-size:0.86rem;color:var(--ink-soft)">{a.isi}</p>
				</Kertas>
			</li>
		{/each}
	</ol>
	<p
		style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim)"
	>
		Klaim ini bisa kamu periksa sendiri di <a href="/bukti">halaman Bukti</a>: tiga panel
		berdampingan yang memperlihatkan catatan aslimu, muatan yang dikirim, dan baris yang benar-benar
		tersimpan di basis data.
	</p>
</section>

<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--s-5)">
	{#each janji as j, i (j.judul)}
		<Kertas warna={i % 2 === 0 ? 'bone' : 'buram'} rot={i % 2 === 0 ? -0.8 : 0.9} padding="var(--s-5)">
			<h2 class="t-judul" style="color:var(--ink);font-size:var(--text-md);margin-bottom:10px">
				{j.judul}
			</h2>
			<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">{j.isi}</p>
		</Kertas>
	{/each}
</section>

<section style="padding-top:var(--s-8);display:flex;flex-direction:column;gap:var(--s-4)">
	<h2 class="t-judul t-lg">Yang kami simpan, dan yang tidak pernah kami punya</h2>
	<Kertas warna="manila" padding="var(--s-5)">
		<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--s-5)">
			<div>
				<span class="t-data t-data-ink">Yang kami simpan</span>
				<ul style="margin:8px 0 0;padding-left:1.1em;font-family:var(--f-read);color:var(--ink)">
					<li>Alamat emailmu</li>
					<li>Tanggal tulisan dan kapan terakhir diubah</li>
					<li>Berapa banyak tulisanmu, dan kira-kira sepanjang apa</li>
					<li>Perangkat apa saja yang kamu pakai</li>
				</ul>
			</div>
			<div>
				<span class="t-data t-data-ink">Yang tidak pernah kami punya</span>
				<ul style="margin:8px 0 0;padding-left:1.1em;font-family:var(--f-read);color:var(--ink)">
					<li>Isi tulisan dan judulnya</li>
					<li>Suasana hati dan nama label yang kamu pakai</li>
					<li>Isi foto atau berkas yang kamu lampirkan</li>
					<li>Sandi dan 24 kata cadanganmu</li>
				</ul>
			</div>
		</div>
		<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft);margin-top:var(--s-4)">
			Daftar lengkapnya ada di <a href="/privasi">halaman privasi</a>, ditulis apa adanya tanpa
			dibungkus bahasa hukum.
		</p>
	</Kertas>
</section>

<section style="padding-top:var(--s-8);display:flex;flex-direction:column;gap:var(--s-4)">
	<h2 class="t-judul t-lg">Kenapa ini bisa dipercaya</h2>
	<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--s-4)">
		{#each kepercayaan as k, i (k.judul)}
			<Kertas warna={i % 2 === 0 ? 'buram' : 'bone'} rot={i % 2 === 0 ? 0.6 : -0.6} padding="var(--s-4)">
				<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-sm);margin-bottom:8px">
					{k.judul}
				</h3>
				<p class="t-baca" style="font-size:0.86rem;color:var(--ink-soft);margin-bottom:10px">{k.isi}</p>
				<a
					href={k.tautan}
					class="t-data t-data-ink"
					rel={k.tautan.startsWith('http') ? 'noopener noreferrer external' : undefined}
					>{k.label} &rarr;</a
				>
			</Kertas>
		{/each}
	</div>
	<Kertas warna="mawar" padding="var(--s-5)">
		<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-sm);margin-bottom:8px">
			Yang tetap mungkin terjadi
		</h3>
		<p class="t-baca" style="font-size:0.86rem;color:var(--ink-soft)">
			Penyimpanan terenkripsi melindungi dari paparan di sisi peladen, tetapi tidak bisa mengubah
			perangkat atau peramban yang sudah dikompromikan menjadi lingkungan yang tepercaya. Kami tidak
			mengklaim kebal, dan batas-batasnya ditulis lengkap di
			<a href="/keamanan">halaman keamanan</a>.
		</p>
	</Kertas>
</section>
