<script lang="ts">
	import Ikon from '$components/dasar/Ikon.svelte';

	interface Tanya {
		q: string;
		a: string;
	}

	const DAFTAR: Tanya[] = [
		{
			q: 'Kalau saya lupa sandi, hilang semua?',
			a: 'Tidak, selama kamu menyimpan 24 kata pemulihan yang diberikan saat mendaftar. Kata-kata itu bisa membuka kembali seluruh tulisanmu dan membuat sandi baru. Yang tidak bisa dilakukan: server mengirim tautan "reset sandi" seperti aplikasi lain, karena server memang tidak pernah memegang kunci tulisanmu. Itu harga dari privasi yang sungguhan, dan Cloister mengingatkanmu sejak hari pertama.'
		},
		{
			q: 'Apa yang bisa dilihat server?',
			a: 'Alamat email, kapan kamu terakhir sinkron, berapa banyak catatan, dan gumpalan terenkripsi per catatan. Isi tulisan, judul, tag, mood, dan lampiran dienkripsi di perangkatmu dengan XChaCha20-Poly1305 sebelum dikirim. Halaman Bukti menunjukkan persis apa yang tersimpan.'
		},
		{
			q: 'Bisa dipakai tanpa internet?',
			a: 'Bisa. Cloister adalah PWA yang menyimpan semuanya di perangkatmu lebih dulu. Menulis, membaca, mencari, mengganti tema, semuanya jalan tanpa jaringan. Begitu tersambung, catatan yang tertunda dikirim otomatis.'
		},
		{
			q: 'Bagaimana kalau ganti HP atau pakai di laptop juga?',
			a: 'Buka Cloister di perangkat baru lalu sambungkan lewat kode dari perangkat lama, atau pakai 24 kata pemulihan. Setelah itu kedua perangkat sinkron. Setiap perangkat punya kunci sendiri yang bisa kamu cabut kapan pun dari pengaturan.'
		},
		{
			q: 'Apakah tulisan saya bisa dibaca orang lain?',
			a: 'Hanya kalau kamu sendiri yang menerbitkannya. Catatan bersifat privat sejak lahir. Kalau ada yang ingin kamu bagikan, kamu menerbitkannya dengan sadar dan Penyaring Identitas memeriksa dulu apakah ada nama, alamat, atau nomor yang mengarah ke orang tertentu.'
		},
		{
			q: 'Bisa dipasang seperti aplikasi di HP?',
			a: 'Bisa. Buka Cloister di browser HP, pilih "Tambahkan ke layar utama" (Android) atau "Add to Home Screen" (iPhone). Cloister lalu terbuka layar penuh, punya ikon sendiri, dan tetap jalan saat sinyal hilang.'
		},
		{
			q: 'Gratis? Ada iklan?',
			a: 'Gratis dan tanpa iklan. Kodenya terbuka untuk diperiksa siapa pun, dan tulisanmu bisa diekspor kapan saja dalam format yang bisa dibaca aplikasi lain.'
		}
	];
</script>

<div class="faq">
	{#each DAFTAR as t, i (t.q)}
		<details class="butir" open={i === 0}>
			<summary>
				<span class="nomor t-hand">{String(i + 1).padStart(2, '0')}</span>
				<span class="q">{t.q}</span>
				<span class="ikon" aria-hidden="true"><Ikon nama="panah-bawah" ukuran={18} /></span>
			</summary>
			<p class="a">{t.a}</p>
		</details>
	{/each}
</div>

<style>
	.faq {
		display: flex;
		flex-direction: column;
	}
	.butir {
		border-top: 1px solid rgb(27 27 23 / 0.16);
	}
	.butir:last-child {
		border-bottom: 1px solid rgb(27 27 23 / 0.16);
	}
	summary {
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 60px;
		padding: 10px 4px;
		font-family: var(--f-display);
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--ink);
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.nomor {
		font-size: 1.4rem;
		line-height: 1;
		color: var(--ink-faint);
		min-width: 30px;
	}
	.q {
		flex: 1;
	}
	.ikon {
		color: var(--ink-faint);
		transition: rotate var(--dur-base) var(--ease-lift);
	}
	.butir[open] .ikon {
		rotate: 180deg;
	}
	.a {
		margin: 0;
		padding: 0 4px 18px 48px;
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.72;
		color: var(--ink-soft);
		max-width: 68ch;
		text-wrap: pretty;
	}
	@media (max-width: 520px) {
		.a {
			padding-left: 4px;
		}
	}
</style>
