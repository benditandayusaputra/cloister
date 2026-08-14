<script lang="ts">
	import Kertas from '$components/dasar/Kertas.svelte';
	import KartuFeed from '$components/publik/KartuFeed.svelte';
	import { PAPERS, PIN_GRADIENT } from '$lib/utils/kertas.ts';
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
</script>

<svelte:head>
	<title>Cloister: Jurnal Pribadi dengan Privasi Kriptografis</title>
	<meta
		name="description"
		content="Jurnal pribadi dengan privasi kriptografis. Catatan privat dienkripsi di perangkat sebelum sinkronisasi, jadi server menyimpan replika terenkripsi, bukan isi yang dapat dibaca."
	/>
</svelte:head>

<!-- Hero -->
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

<!-- Catatan publik terbaru -->
{#if data.terbaru.length > 0}
	<section style="display:flex;flex-direction:column;gap:var(--s-4);padding-bottom:var(--s-8)">
		<div style="display:flex;align-items:baseline;gap:var(--s-4);flex-wrap:wrap">
			<h2 class="t-judul t-lg">Baru terbit dari balik dinding</h2>
			<a href="/baca" class="t-data" style="margin-left:auto;color:var(--ink-on-board-dim)"
				>Lihat semua &rarr;</a
			>
		</div>
		<p
			style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:64ch"
		>
			Tulisan yang sengaja dikeluarkan dari enkripsi oleh penulisnya. Sisanya — sebagian besar —
			tetap tertutup di balik dinding.
		</p>
		<div
			style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(270px,100%),1fr));gap:var(--s-5);align-items:start"
		>
			{#each data.terbaru as item, i (item.id)}
				<div class="muncul" style="--tunda:{i * 80}ms">
					<KartuFeed {item} />
				</div>
			{/each}
		</div>
	</section>
{/if}

<!-- Kenapa Cloister, versi ringkas -->
<section style="display:flex;flex-direction:column;gap:var(--s-4)">
	<h2 class="t-judul t-lg">Kenapa Cloister</h2>
	<div
		style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:var(--s-5)"
	>
		{#each kenapa as k, i (k.judul)}
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
		{/each}
	</div>
	<p
		style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim)"
	>
		Arsitektur lengkapnya — hierarki kunci, model ancaman, dan apa yang tetap kami ketahui — ada di
		<a href="/tentang">halaman tentang</a>, dan buktinya bisa diperiksa langsung di
		<a href="/bukti">halaman Bukti</a>.
	</p>
</section>

<!-- CTA penutup -->
<section style="padding-top:var(--s-8)">
	<Kertas warna="manila" rot={-0.4} padding="var(--s-6)">
		<div
			style="display:flex;flex-wrap:wrap;gap:var(--s-5);align-items:center;justify-content:space-between"
		>
			<div style="display:flex;flex-direction:column;gap:8px;max-width:52ch">
				<h2 class="t-judul t-lg" style="color:var(--ink)">Mulai malam ini</h2>
				<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">
					Gratis, tanpa iklan, dan kodenya terbuka untuk diperiksa siapa pun. Kalau sandimu hilang,
					24 kata pemulihan adalah satu-satunya jalan kembali — karena kami memang tidak menyimpan
					apa pun yang bisa membuka tulisanmu.
				</p>
			</div>
			<a href="/daftar" class="tbl" style="text-decoration:none;white-space:nowrap">Buat akun</a>
		</div>
	</Kertas>
</section>
