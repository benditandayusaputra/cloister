<script lang="ts">
	import Kertas from '$components/dasar/Kertas.svelte';

	const janji = [
		{
			judul: 'Privat sejak desain',
			isi: 'Privasi datang dari arsitekturnya, bukan dari janji kebijakan. Catatan dikunci di perangkatmu sebelum dikirim, dan rute privat di server hanya mau menerima payload yang sudah terenkripsi.'
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
		{
			nama: 'Crypto Worker',
			isi: 'libsodium WASM di worker terpisah. Kunci utama tidak pernah menyentuh thread utama.'
		},
		{ nama: 'Data terenkripsi', isi: 'ciphertext, nonce, wrapped_dek, dek_nonce, size_bucket.' },
		{ nama: 'Server', isi: 'Menyimpan replika terenkripsi. Tidak punya kunci untuk membukanya.' }
	];

	const kepercayaan = [
		{
			judul: 'Model ancaman',
			isi: 'Ditulis terbuka, lengkap dengan yang tidak kami lindungi.',
			tautan: '/keamanan',
			label: 'Baca model ancaman'
		},
		{
			judul: 'Pemulihan',
			isi: '24 kata BIP-39 yang diturunkan di perangkat. Kami tidak menyimpan salinannya.',
			tautan: '/keamanan',
			label: 'Cara pemulihan bekerja'
		},
		{
			judul: 'Lisensi',
			isi: 'AGPL-3.0-or-later. Seluruh kode bisa diperiksa dan dijalankan sendiri.',
			tautan: 'https://github.com/benditandayusaputra/cloister',
			label: 'Lihat kode sumber'
		},
		{
			judul: 'Pelaporan celah',
			isi: 'SECURITY.md memuat kontak dan kebijakan pengungkapan 90 hari.',
			tautan: 'https://github.com/benditandayusaputra/cloister/blob/main/SECURITY.md',
			label: 'Kebijakan keamanan'
		}
	];
</script>

<svelte:head>
	<title>Tentang · Cloister</title>
	<meta
		name="description"
		content="Apa itu Cloister, dari mana namanya, dan bagaimana arsitekturnya memastikan server tidak bisa membaca catatan privat."
	/>
</svelte:head>

<article style="display:flex;flex-direction:column;gap:var(--s-8);padding-bottom:var(--s-6)">
	<header class="muncul" style="display:flex;flex-direction:column;gap:var(--s-4);max-width:70ch">
		<h1 class="t-judul t-xl">Tentang Cloister</h1>
		<p
			style="margin:0;font-family:var(--f-read);font-size:var(--text-md);line-height:1.72;color:var(--ink-on-board-dim);text-wrap:pretty"
		>
			Cloister adalah jurnal pribadi dengan privasi kriptografis. Catatan privat dienkripsi di
			perangkatmu sebelum sinkronisasi, jadi server menyimpan replika terenkripsi — bukan isi yang
			dapat dibaca. Aplikasi berjalan penuh tanpa jaringan, dan menerbitkan tulisan ke publik selalu
			keputusan sadar, bukan kebocoran.
		</p>
	</header>

	<!-- Cerita nama -->
	<section style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg">Kenapa namanya Cloister</h2>
		<Kertas warna="bone" rot={-0.5} padding="var(--s-6)">
			<p class="t-baca" style="color:var(--ink);max-width:66ch">
				Cloister adalah lorong berdinding di dalam biara — ruang tertutup yang mengelilingi halaman
				dalam. Dari kata inilah muncul <em>cloistered</em>: terkurung, terpisah dari dunia luar.
				Yang membuatnya pas untuk produk ini: selama berabad-abad, cloister adalah tempat naskah
				ditulis dan disalin.
			</p>
			<p class="t-baca" style="color:var(--ink-soft);max-width:66ch;margin-top:var(--s-3)">
				Satu kata yang sekaligus berarti <strong>ruang tertutup</strong> dan
				<strong>tempat menulis</strong>. Apa yang ditulis di dalamnya tidak terlihat dari luar
				dinding.
			</p>
		</Kertas>
	</section>

	<!-- Empat pilar -->
	<section style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg">Empat hal yang kami pegang</h2>
		<div
			style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:var(--s-5)"
		>
			{#each janji as j, i (j.judul)}
				<Kertas
					kelas="angkat muncul"
					gaya="--tunda:{i * 70}ms"
					warna={i % 2 === 0 ? 'bone' : 'buram'}
					rot={i % 2 === 0 ? -0.8 : 0.9}
					padding="var(--s-5)"
				>
					<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-md);margin-bottom:10px">
						{j.judul}
					</h3>
					<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">{j.isi}</p>
				</Kertas>
			{/each}
		</div>
	</section>

	<!-- Alur satu catatan -->
	<section style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg">Jalan yang ditempuh satu catatan</h2>
		<p
			style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:64ch"
		>
			Enkripsi terjadi sebelum apa pun meninggalkan browser. Yang menyeberang ke server sudah berupa
			huruf acak, dan kunci untuk membukanya tidak pernah ikut menyeberang.
		</p>
		<ol
			style="margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:var(--s-4)"
		>
			{#each alur as a, i (a.nama)}
				<li>
					<Kertas
						warna={i === 3 ? 'biru' : 'bone'}
						rot={i % 2 === 0 ? -0.7 : 0.7}
						padding="var(--s-4)"
					>
						<span class="t-data t-data-ink">Langkah {i + 1}</span>
						<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-sm);margin:6px 0 8px">
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
			berdampingan yang memperlihatkan catatan aslimu, payload yang dikirim, dan baris yang
			benar-benar tersimpan di database.
		</p>
	</section>

	<!-- Tabel kejujuran -->
	<section style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg">Yang kami simpan, dan yang tidak pernah kami punya</h2>
		<Kertas warna="manila" padding="var(--s-5)">
			<div
				style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:var(--s-5)"
			>
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
						<li>Isi foto atau file yang kamu lampirkan</li>
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

	<!-- Kepercayaan -->
	<section style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg">Kenapa ini bisa dipercaya</h2>
		<div
			style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:var(--s-4)"
		>
			{#each kepercayaan as k, i (k.judul)}
				<Kertas
					kelas="angkat"
					warna={i % 2 === 0 ? 'buram' : 'bone'}
					rot={i % 2 === 0 ? 0.6 : -0.6}
					padding="var(--s-4)"
				>
					<h3 class="t-judul" style="color:var(--ink);font-size:var(--text-sm);margin-bottom:8px">
						{k.judul}
					</h3>
					<p class="t-baca" style="font-size:0.86rem;color:var(--ink-soft);margin-bottom:10px">
						{k.isi}
					</p>
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
				Penyimpanan terenkripsi melindungi dari paparan di sisi server, tetapi tidak bisa mengubah
				perangkat atau browser yang sudah dikompromikan menjadi lingkungan yang tepercaya. Kami
				tidak mengklaim kebal, dan batas-batasnya ditulis lengkap di
				<a href="/keamanan">halaman keamanan</a>.
			</p>
		</Kertas>
	</section>

	<!-- CTA -->
	<section style="display:flex;gap:var(--s-3);flex-wrap:wrap;align-items:center">
		<a href="/daftar" class="tbl" style="text-decoration:none">Mulai menulis</a>
		<a href="/baca" class="tbl-papan" style="text-decoration:none">Baca catatan publik</a>
	</section>
</article>
