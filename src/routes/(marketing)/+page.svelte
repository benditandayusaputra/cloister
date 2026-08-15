<script lang="ts">
	import Ikon from '$components/dasar/Ikon.svelte';
	import type { NamaIkon } from '$components/dasar/ikon-peta.ts';
	import KartuFeed from '$components/publik/KartuFeed.svelte';
	import DemoPenyaring from '$components/muka/DemoPenyaring.svelte';
	import LayarAplikasi from '$components/muka/LayarAplikasi.svelte';
	import Faq from '$components/muka/Faq.svelte';
	import { PAPERS, PIN_GRADIENT } from '$lib/utils/kertas.ts';
	import { reveal } from '$lib/utils/reveal.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const kartuHero = [
		{ hari: 16, mood: 5, teks: 'Hari ini aku tidak menghindar dari satu pun percakapan.', rot: -2.4, kertas: 0 },
		{ hari: 19, mood: 4, teks: 'Beli kembang sepatu di depan pasar. Penjualnya hafal pesananku.', rot: 1.8, kertas: 1 },
		{ hari: 22, mood: 3, teks: 'Minggu. Tidur siang dua jam, bangun bingung ini hari apa.', rot: -1.2, kertas: 3 },
		{ hari: 27, mood: 4, teks: 'Target bulan depan: satu halaman tiap malam.', rot: 2.2, kertas: 2 }
	];

	const janji: Array<{ ikon: NamaIkon; teks: string }> = [
		{ ikon: 'gembok', teks: 'Dienkripsi di perangkatmu' },
		{ ikon: 'luring', teks: 'Jalan tanpa jaringan' },
		{ ikon: 'ponsel', teks: 'Bisa dipasang di HP' },
		{ ikon: 'dokumen', teks: 'Sumber terbuka' }
	];

	const bukti: Array<{ ikon: NamaIkon; judul: string; isi: string; teknis: string }> = [
		{
			ikon: 'gembok',
			judul: 'Dikunci di perangkatmu',
			isi: 'Catatan dikunci di HP atau laptopmu sebelum dikirim. Kuncinya dibuat dari sandimu dan tidak pernah keluar dari perangkat.',
			teknis: 'XChaCha20-Poly1305 · Argon2id'
		},
		{
			ikon: 'labu',
			judul: 'Diuji lebih dari 500 kali',
			isi: 'Setiap perubahan kode diperiksa ratusan tes otomatis, termasuk tes yang memastikan tidak ada tulisan asli yang bocor ke server.',
			teknis: '520 tes unit · 19 skenario end-to-end'
		},
		{
			ikon: 'mata-tutup',
			judul: 'Server tidak bisa membaca',
			isi: 'Yang tersimpan di server hanya huruf acak. Server tahu ada catatan, tapi tidak tahu isinya, judulnya, atau siapa yang disebut.',
			teknis: '0 teks privat di database'
		}
	];

	const caraKerja = [
		{
			nomor: '01',
			judul: 'Tulis seperti biasa',
			isi: 'Editor dengan autosave, tanpa tombol simpan. Judul, tabel, daftar centang, foto yang bisa digeser dan diubah ukurannya.',
			kertas: 0,
			rot: -1.6,
			mood: 4
		},
		{
			nomor: '02',
			judul: 'Terkunci sebelum berangkat',
			isi: 'Setiap catatan dienkripsi di perangkatmu sebelum sinkron. Yang sampai ke server hanya replika acak yang tidak bisa dibaca siapa pun.',
			kertas: 3,
			rot: 1.4,
			mood: 3
		},
		{
			nomor: '03',
			judul: 'Terbitkan yang kamu pilih',
			isi: 'Sebagian tulisan layak dibaca orang. Penyaring Identitas berjaga di perbatasan supaya tidak ada orang lain yang ikut terpapar.',
			kertas: 1,
			rot: -0.8,
			mood: 5
		}
	];

	const kegunaan: Array<{ ikon: NamaIkon; nama: string; isi: string }> = [
		{
			ikon: 'buku',
			nama: 'Buku harian',
			isi: 'Cepat dibuka dari HP kapan pun, terasa seperti buku catatan pribadi. Yang kamu tulis benar-benar cuma kamu yang bisa baca.'
		},
		{
			ikon: 'otak',
			nama: 'Otak kedua',
			isi: 'Ide, kutipan, hasil bacaan, hal yang mau kamu ingat lima tahun lagi. Cari cepat, kelompokkan dengan tag, semuanya tetap milikmu.'
		},
		{
			ikon: 'kunci',
			nama: 'Brankas catatan penting',
			isi: 'Nomor rekening, akun, PIN, dokumen, tersusun dalam tabel yang rapi. Server tidak bisa membacanya, jadi tidak ada yang bocor walau server dibobol.'
		},
		{
			ikon: 'catatan',
			nama: 'Catatan sehari-hari',
			isi: 'Daftar belanja, resep, rencana perjalanan, daftar centang. Sederhana, jalan tanpa jaringan, tersinkron ke semua perangkatmu.'
		},
		{
			ikon: 'tunas',
			nama: 'Berbagi yang layak dibagi',
			isi: 'Sebagian tulisan pantas dibaca orang. Terbitkan yang kamu pilih ke halaman publik dengan nama pena. Sisanya tetap di balik dinding.'
		},
		{
			ikon: 'target',
			nama: 'Rencana dan target',
			isi: 'Resolusi tahunan, target bulanan, daftar centang kebiasaan. Lihat lagi bulan depan, dan lihat seberapa jauh kamu sudah berjalan.'
		}
	];
</script>

<svelte:head>
	<title>Cloister: Jurnal Pribadi dengan Privasi Kriptografis</title>
	<meta
		name="description"
		content="Cloister adalah aplikasi jurnal dan catatan pribadi yang dienkripsi di perangkatmu sebelum tersimpan. Jalan tanpa jaringan, bisa dipasang di HP, dan hanya kamu yang bisa membaca isinya."
	/>
</svelte:head>

<section class="hero">
	<div class="hero-teks muncul">
		<span class="eyebrow">
			<Ikon nama="pin" ukuran={14} />
			Jurnal &amp; catatan pribadi · terenkripsi di perangkat
		</span>
		<h1 class="t-judul judul-utama">Ditulis di dalam.<br />Tidak terbaca dari luar.</h1>
		<p class="muka-p besar">
			Cloister adalah tempat menulis buku harian, catatan, dan hal-hal penting. Semua yang kamu tulis
			dikunci di HP atau laptopmu <em>sebelum</em> tersimpan, jadi server, dan siapa pun selain kamu,
			hanya melihat huruf acak. Kalau ada yang ingin dibagikan, kamu terbitkan sendiri ke halaman
			publik.
		</p>
		<div class="cta">
			<a href="/daftar" class="tbl tbl-besar">Mulai menulis</a>
			<a href="#cara-kerja" class="tbl-papan tbl-besar">Lihat cara kerjanya</a>
		</div>
		<ul class="janji">
			{#each janji as j (j.teks)}
				<li><Ikon nama={j.ikon} ukuran={16} /> {j.teks}</li>
			{/each}
		</ul>
	</div>

	<div class="bingkai-kayu hero-papan muncul" style="--tunda:120ms">
		<div class="papan-flanel hero-flanel">
			<ul class="hero-kartu">
				{#each kartuHero as c, i (c.hari)}
					<li class="hero-jatuh" style="--tunda:{220 + i * 150}ms">
						<span
							aria-hidden="true"
							class="pin-bulat pin-hero"
							style="background:{PIN_GRADIENT[c.mood]}"
						></span>
						<div class="kartu-papan kartu-hero" style="--kertas:{PAPERS[c.kertas]};transform:rotate({c.rot}deg)">
							<span class="t-hand hari">{c.hari}</span>
							<p>{c.teks}</p>
						</div>
					</li>
				{/each}
				<li class="hero-jatuh foto" style="--tunda:820ms">
					<span aria-hidden="true" class="pin-bulat pin-hero" style="background:{PIN_GRADIENT[3]}"></span>
					<figure class="polaroid">
						<img src="/demo/kopi.webp" alt="Secangkir kopi di pagi hari" width="640" height="427" loading="eager" decoding="async" />
						<figcaption class="t-hand">pagi, sebelum siapa pun bangun</figcaption>
					</figure>
				</li>
			</ul>
		</div>
	</div>
</section>

<section class="bukti kertas" aria-label="Kenapa bisa dipercaya" use:reveal>
	{#each bukti as b, i (b.judul)}
		<div class="bukti-item" use:reveal={{ tunda: i * 90 }}>
			<span class="bukti-ikon"><Ikon nama={b.ikon} ukuran={22} /></span>
			<h3 class="t-judul bukti-judul">{b.judul}</h3>
			<p class="bukti-isi">{b.isi}</p>
			<span class="bukti-teknis">{b.teknis}</span>
		</div>
	{/each}
	<a href="/bukti" class="bukti-item bukti-tautan" use:reveal={{ tunda: 270 }}>
		<span class="bukti-ikon"><Ikon nama="dokumen" ukuran={22} /></span>
		<h3 class="t-judul bukti-judul">Lihat buktinya sendiri <Ikon nama="panah-kanan" ukuran={18} /></h3>
		<p class="bukti-isi">
			Halaman Bukti memperlihatkan langsung baris yang tersimpan di server. Bisa dilihat tanpa akun;
			kalau sudah masuk, kamu bisa mencocokkannya dengan catatanmu sendiri.
		</p>
		<span class="bukti-teknis">Buka halaman Bukti</span>
	</a>
</section>

<section id="layar" class="blok-terang" use:reveal>
	<div class="kepala-blok">
		<span class="eyebrow gelap"><Ikon nama="ponsel" ukuran={14} /> Begini rupanya di dalam</span>
		<h2 class="t-judul judul-blok">Papan, kartu, dan pin. Bukan daftar tak berujung.</h2>
		<p class="isi-blok">
			Setiap bulan adalah satu papan flanel. Setiap hari adalah kartu yang tertancap pin. Kamu bisa
			melihat sebulan sekaligus, membuka satu hari, dan menulis di editor yang mengerti tabel, foto,
			dan daftar centang.
		</p>
	</div>
	<LayarAplikasi />
</section>

<section id="cara-kerja" class="langkah">
	<div class="kepala" use:reveal>
		<span class="eyebrow"><Ikon nama="sinkron" ukuran={14} /> Cara kerjanya</span>
		<h2 class="t-judul judul-bagian">Tiga langkah, satu janji</h2>
		<p class="muka-p">
			Kamu menulis, perangkatmu mengunci, server hanya menyimpan. Yang keluar dari balik dinding cuma
			yang kamu putuskan sendiri.
		</p>
	</div>
	<div class="bingkai-kayu" use:reveal={{ tunda: 80 }}>
		<div class="papan-flanel strip-flanel">
			<ol class="langkah-daftar">
				{#each caraKerja as c, i (c.nomor)}
					<li class="langkah-item" use:reveal={{ tunda: 120 + i * 130 }}>
						<span aria-hidden="true" class="pin-bulat pin-hero" style="background:{PIN_GRADIENT[c.mood]}"></span>
						<div class="kartu-papan kartu-langkah" style="--kertas:{PAPERS[c.kertas]};transform:rotate({c.rot}deg)">
							<span class="t-hand nomor">{c.nomor}</span>
							<h3 class="t-judul">{c.judul}</h3>
							<p>{c.isi}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>

<section id="penyaring" class="penyaring">
	<div class="kepala" use:reveal>
		<span class="eyebrow"><Ikon nama="perisai" ukuran={14} /> Fitur pembeda</span>
		<h2 class="t-judul judul-bagian">Penyaring Identitas: sebelum terbit, ada yang berjaga di perbatasan</h2>
		<p class="muka-p">
			Saat kamu memutuskan menerbitkan sebuah catatan, Cloister memindainya lebih dulu <strong>di
			perangkatmu</strong> dan menandai hal yang bisa mengarah ke orang tertentu: nama, alamat, nomor
			rekening, nomor HP, email. Kamu yang memutuskan mau disensor, dijadikan inisial, atau dibiarkan.
			Tidak ada satu huruf pun yang dikirim ke server untuk diperiksa. Buka tab Network kalau mau
			membuktikannya.
		</p>
	</div>
	<div use:reveal={{ tunda: 100 }}>
		<DemoPenyaring />
	</div>
</section>

{#if data.terbaru.length > 0}
	<section id="terbaru" class="terbaru">
		<div class="kepala baris" use:reveal>
			<div>
				<span class="eyebrow"><Ikon nama="tunas" ukuran={14} /> Ruang publik</span>
				<h2 class="t-judul judul-bagian">Baru terbit dari balik dinding</h2>
				<p class="muka-p">
					Tulisan yang sengaja dikeluarkan dari enkripsi oleh penulisnya. Sisanya, sebagian besar,
					tetap tertutup.
				</p>
			</div>
			<a href="/baca" class="tbl-papan tbl-besar">Lihat semua tulisan publik <Ikon nama="panah-kanan" ukuran={16} /></a>
		</div>
		<div class="bingkai-kayu" use:reveal={{ tunda: 60 }}>
			<div class="papan-flanel papan-terbaru">
				<div class="grid-terbaru">
					{#each data.terbaru as item, i (item.id)}
						<div use:reveal={{ tunda: (i % 3) * 90 }} class="sel-terbaru">
							<KartuFeed {item} seragam />
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>
{/if}

<section id="kegunaan" class="kegunaan">
	<div class="kepala" use:reveal>
		<span class="eyebrow"><Ikon nama="kilau" ukuran={14} /> Untuk apa saja</span>
		<h2 class="t-judul judul-bagian">Satu ruang, banyak kegunaan</h2>
		<p class="muka-p">
			Apa pun yang terlalu pribadi untuk ditaruh di aplikasi catatan biasa, di sini tempatnya.
		</p>
	</div>
	<div class="grid-kegunaan">
		{#each kegunaan as k, i (k.nama)}
			<div use:reveal={{ tunda: (i % 3) * 100 }} class="kartu-kegunaan kertas {i % 3 === 1 ? 'kertas-manila' : i % 3 === 2 ? 'kertas-buram' : ''}" style="--rot:{i % 2 === 0 ? 0.5 : -0.5}deg">
				<span class="ikon-kegunaan"><Ikon nama={k.ikon} ukuran={24} tebal={1.6} /></span>
				<h3 class="t-judul">{k.nama}</h3>
				<p>{k.isi}</p>
			</div>
		{/each}
	</div>
</section>

<section id="faq" class="blok-terang faq-blok" use:reveal>
	<div class="kepala-blok">
		<span class="eyebrow gelap"><Ikon nama="tanya" ukuran={14} /> Yang sering ditanyakan</span>
		<h2 class="t-judul judul-blok">Kalau lupa sandi, hilang semua?</h2>
		<p class="isi-blok">
			Pertanyaan paling penting untuk aplikasi terenkripsi, dan jawabannya ada di urutan pertama.
		</p>
	</div>
	<Faq />
</section>

<section class="penutup" use:reveal>
	<div class="kertas kertas-manila kartu-penutup">
		<span aria-hidden="true" class="pin-bulat pin-hero" style="background:{PIN_GRADIENT[5]}"></span>
		<div>
			<h2 class="t-judul">Mulai menulis</h2>
			<p>
				Gratis, tanpa iklan, kodenya terbuka. Pagi, siang, atau malam, ruangnya selalu siap. Kalau
				sandimu hilang, 24 kata pemulihan adalah jalan kembali, karena kami memang tidak menyimpan
				apa pun yang bisa membuka tulisanmu.
			</p>
		</div>
		<div class="cta">
			<a href="/daftar" class="tbl tbl-besar">Mulai menulis</a>
			<a href="/masuk" class="tbl-garis tbl-besar">Sudah punya akun</a>
		</div>
	</div>
</section>

<style>
	.muka-p {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.72;
		color: var(--muka-teks);
		max-width: 60ch;
		text-wrap: pretty;
	}
	.muka-p.besar {
		font-size: clamp(1.1rem, 1rem + 0.5vw, 1.3rem);
		max-width: 56ch;
	}
	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-family: var(--f-data);
		font-size: var(--text-2xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muka-emas);
	}
	.eyebrow.gelap {
		color: var(--accent);
	}
	.tbl-besar {
		min-height: 50px;
		padding: 0 24px;
		font-size: var(--text-base);
		text-decoration: none;
	}
	.cta {
		display: flex;
		gap: var(--s-3);
		flex-wrap: wrap;
	}
	.kepala {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: var(--s-5);
	}
	.kepala.baris {
		flex-direction: row;
		align-items: flex-end;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--s-4);
	}
	.kepala.baris > div {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.judul-bagian {
		font-size: var(--text-xl);
		max-width: 26ch;
	}
	section {
		padding-bottom: var(--s-9);
	}

	.hero {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr));
		gap: var(--s-8);
		align-items: center;
		padding: var(--s-5) 0 var(--s-8);
	}
	.hero-teks {
		display: flex;
		flex-direction: column;
		gap: var(--s-5);
	}
	.judul-utama {
		font-size: var(--text-2xl);
		line-height: 0.98;
	}
	.janji {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 8px 18px;
	}
	.janji li {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-family: var(--f-display);
		font-size: var(--text-sm);
		color: var(--ink-on-board);
	}
	.janji li :global(svg) {
		color: var(--muka-emas);
	}
	.hero-flanel {
		padding: 30px 26px 34px;
	}
	.hero-kartu {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 22px 16px;
	}
	.hero-kartu li {
		position: relative;
	}
	.hero-kartu li.foto {
		grid-column: 2 / span 2;
		justify-self: end;
	}
	.pin-hero {
		position: absolute;
		left: 50%;
		top: -9px;
		z-index: 4;
		transform: translateX(-50%);
		width: 17px;
		height: 17px;
	}
	.kartu-hero {
		min-height: 138px;
		cursor: default;
	}
	.kartu-hero .hari {
		font-size: 2rem;
		line-height: 0.85;
	}
	.kartu-hero p {
		margin: 0;
		font-family: var(--f-read);
		font-size: 0.86rem;
		line-height: 1.45;
		color: var(--ink-soft);
	}
	.polaroid {
		margin: 0;
		width: 190px;
		padding: 8px 8px 6px;
		background: #f4f1e8;
		box-shadow: var(--sh-pinned);
		transform: rotate(3deg);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.polaroid img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 3 / 2;
		object-fit: cover;
	}
	.polaroid figcaption {
		font-size: 0.95rem;
		text-align: center;
		color: var(--ink-soft);
	}
	@media (max-width: 520px) {
		.hero-kartu {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.hero-kartu li.foto {
			grid-column: 1 / span 2;
			justify-self: center;
		}
	}

	.bukti {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
		gap: 0;
		padding: 0;
		margin-bottom: var(--s-9);
		transform: rotate(-0.25deg);
	}
	.bukti-item {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: var(--s-5) var(--s-5) var(--s-5);
		border-right: 1px solid rgb(27 27 23 / 0.14);
		color: var(--ink);
		text-decoration: none;
	}
	.bukti-item:last-child {
		border-right: none;
	}
	@media (max-width: 900px) {
		.bukti-item {
			border-right: none;
			border-bottom: 1px solid rgb(27 27 23 / 0.14);
		}
		.bukti-item:last-child {
			border-bottom: none;
		}
	}
	.bukti-ikon {
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: rgb(27 27 23 / 0.07);
		color: var(--accent);
	}
	.bukti-judul {
		color: var(--ink);
		font-size: var(--text-md);
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.bukti-isi {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-sm);
		line-height: 1.62;
		color: var(--ink-soft);
		text-wrap: pretty;
	}
	.bukti-teknis {
		margin-top: auto;
		padding-top: 4px;
		font-family: var(--f-data);
		font-size: var(--text-2xs);
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	.bukti-tautan {
		background: rgb(155 59 47 / 0.07);
		transition: background var(--dur-fast);
	}
	.bukti-tautan .bukti-ikon {
		background: var(--accent);
		color: var(--accent-ink);
	}
	.bukti-tautan .bukti-judul,
	.bukti-tautan .bukti-teknis {
		color: var(--accent);
	}
	.bukti-tautan:hover {
		background: rgb(155 59 47 / 0.13);
	}
	.bukti-tautan:hover .bukti-judul {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.blok-terang {
		position: relative;
		margin: 0 calc(-1 * var(--s-5));
		padding: var(--s-8) var(--s-6);
		background-image: var(--paper-fill), linear-gradient(var(--paper-bone), var(--paper-bone));
		background-blend-mode: multiply, normal, normal;
		color: var(--ink);
		box-shadow: var(--sh-contact), var(--sh-lifted);
		border-radius: 2px;
		display: flex;
		flex-direction: column;
		gap: var(--s-6);
	}
	.blok-terang::before {
		content: '';
		position: absolute;
		left: 50%;
		top: -10px;
		width: 120px;
		height: 30px;
		transform: translateX(-50%) rotate(-1.5deg);
		background: rgb(255 240 200 / 0.55);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
	}
	@media (max-width: 480px) {
		.blok-terang {
			margin: 0 calc(-1 * var(--s-4));
			padding: var(--s-6) var(--s-4);
		}
	}
	section.blok-terang {
		margin-bottom: var(--s-9);
		padding-bottom: var(--s-8);
	}
	.kepala-blok {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.judul-blok {
		color: var(--ink);
		font-size: var(--text-xl);
		max-width: 26ch;
	}
	.isi-blok {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.72;
		color: var(--ink-soft);
		max-width: 62ch;
		text-wrap: pretty;
	}

	.strip-flanel {
		padding: 44px 32px 36px;
	}
	.langkah-daftar {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
		gap: 28px 22px;
	}
	.langkah-item {
		position: relative;
	}
	.kartu-langkah {
		min-height: 200px;
		cursor: default;
		gap: 8px;
	}
	.kartu-langkah .nomor {
		font-size: 2rem;
		line-height: 1;
		color: var(--ink-faint);
	}
	.kartu-langkah h3 {
		color: var(--ink);
		font-size: var(--text-md);
	}
	.kartu-langkah p {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--ink-soft);
	}

	.papan-terbaru {
		padding: 40px 30px 34px;
	}
	.grid-terbaru {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
		gap: 30px 24px;
		align-items: stretch;
	}
	.sel-terbaru {
		display: flex;
	}
	.sel-terbaru > :global(*) {
		flex: 1;
	}
	@media (max-width: 520px) {
		.papan-terbaru,
		.strip-flanel,
		.hero-flanel {
			padding: 30px 16px 26px;
		}
	}

	.grid-kegunaan {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
		gap: var(--s-4);
	}
	.kartu-kegunaan {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: var(--s-5);
		transform: rotate(var(--rot));
		transition:
			translate var(--dur-base) var(--ease-lift),
			box-shadow var(--dur-base) var(--ease-lift);
	}
	.kartu-kegunaan:hover {
		translate: 0 -4px;
		box-shadow: var(--sh-hover);
	}
	.ikon-kegunaan {
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: rgb(27 27 23 / 0.07);
		color: var(--accent);
	}
	.kartu-kegunaan h3 {
		color: var(--ink);
		font-size: var(--text-md);
	}
	.kartu-kegunaan p {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-sm);
		line-height: 1.65;
		color: var(--ink-soft);
	}

	.penutup {
		padding-bottom: 0;
	}
	.kartu-penutup {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-5);
		align-items: center;
		justify-content: space-between;
		padding: var(--s-6);
		transform: rotate(-0.4deg);
	}
	.kartu-penutup > div:first-of-type {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 54ch;
	}
	.kartu-penutup h2 {
		color: var(--ink);
		font-size: var(--text-xl);
	}
	.kartu-penutup p {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-base);
		line-height: 1.7;
		color: var(--ink-soft);
	}
</style>
