<script lang="ts">
	import Ikon from '$components/dasar/Ikon.svelte';
	import type { NamaIkon } from '$components/dasar/ikon-peta.ts';

	interface Layar {
		id: string;
		label: string;
		ikon: NamaIkon;
		src: string;
		alt: string;
		judul: string;
		isi: string;
	}

	const LAYAR: Layar[] = [
		{
			id: 'papan',
			label: 'Papan bulan',
			ikon: 'pin',
			src: '/muka/papan.webp',
			alt: 'Papan bulan Cloister: kartu-kartu catatan tertancap pin di papan flanel hijau, satu kartu per hari',
			judul: 'Satu bulan, satu papan',
			isi: 'Setiap hari yang kamu tulis jadi satu kartu yang tertancap di papan. Warna pin mengikuti suasana hatimu, jadi sebulan terbaca sekilas tanpa membuka apa pun.'
		},
		{
			id: 'editor',
			label: 'Editor',
			ikon: 'pensil',
			src: '/muka/editor.webp',
			alt: 'Editor Cloister dengan judul, tabel akun, dan foto yang bisa digeser dan diubah ukurannya',
			judul: 'Editor yang mengerti tabel dan foto',
			isi: 'Judul, daftar centang, tabel yang bisa disunting langsung di tempat, foto yang bisa digeser dan diubah ukurannya. Autosave, tanpa tombol simpan.'
		},
		{
			id: 'tema',
			label: 'Tema',
			ikon: 'palet',
			src: '/muka/tema-senja.webp',
			alt: 'Papan bulan Cloister dengan tema Senja berwarna ungu dan jingga',
			judul: 'Delapan tema, tiga gaya',
			isi: 'Flanel, Batik, Senja, Kamar gelap, Terminal, dan lainnya. Gaya Flat, Liquid Glass, atau Line Art mengubah seluruh aplikasi sampai ke ikon foldernya.'
		},
		{
			id: 'ponsel',
			label: 'Di HP',
			ikon: 'ponsel',
			src: '/muka/ponsel.webp',
			alt: 'Cloister di layar ponsel dengan navigasi bawah',
			judul: 'Dipasang seperti aplikasi',
			isi: 'Cloister adalah PWA: pasang di layar utama HP atau laptop, buka tanpa jaringan, dan tulisanmu menyusul sendiri begitu tersambung.'
		}
	];

	let aktif = $state(LAYAR[0]!);
	const TEMA_KECIL = [
		{ src: '/muka/tema-batik.webp', nama: 'Batik' },
		{ src: '/muka/tema-kamar-gelap.webp', nama: 'Kamar gelap' },
		{ src: '/muka/papan.webp', nama: 'Flanel' }
	];
</script>

<div class="layar">
	<div class="tab" role="tablist" aria-label="Tampilan aplikasi">
		{#each LAYAR as l (l.id)}
			<button
				type="button"
				role="tab"
				aria-selected={aktif.id === l.id}
				class="tombol"
				class:aktif={aktif.id === l.id}
				onclick={() => (aktif = l)}
			>
				<Ikon nama={l.ikon} ukuran={16} />
				{l.label}
			</button>
		{/each}
	</div>

	<div class="panel" role="tabpanel">
		<div class="bingkai" class:ponsel={aktif.id === 'ponsel'}>
			{#key aktif.id}
				<img
					src={aktif.src}
					alt={aktif.alt}
					class="gambar muncul"
					loading={aktif.id === 'papan' ? 'eager' : 'lazy'}
					decoding="async"
					width={aktif.id === 'ponsel' ? 390 : 1600}
					height={aktif.id === 'ponsel' ? 844 : 1025}
				/>
			{/key}
			{#if aktif.id === 'tema'}
				<div class="kecil" aria-label="Tema lain">
					{#each TEMA_KECIL as t, i (t.src)}
						<figure class="polaroid muncul" style="--tunda:{120 + i * 90}ms;--rot:{i === 1 ? 2 : -2.5}deg">
							<img src={t.src} alt="Tema {t.nama}" loading="lazy" decoding="async" width="320" height="205" />
							<figcaption class="t-hand">{t.nama}</figcaption>
						</figure>
					{/each}
				</div>
			{/if}
		</div>
		<div class="keterangan">
			{#key aktif.id}
				<div class="muncul">
					<h3 class="t-judul">{aktif.judul}</h3>
					<p>{aktif.isi}</p>
				</div>
			{/key}
		</div>
	</div>
</div>

<style>
	.layar {
		display: flex;
		flex-direction: column;
		gap: var(--s-4);
	}
	.tab {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.tombol {
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 0 16px;
		border: 1px solid rgb(27 27 23 / 0.22);
		border-radius: 999px;
		background: transparent;
		color: var(--ink-soft);
		font-family: var(--f-display);
		font-weight: 600;
		font-size: var(--text-sm);
		transition:
			background var(--dur-fast),
			color var(--dur-fast),
			border-color var(--dur-fast);
	}
	.tombol:hover {
		border-color: var(--ink);
		color: var(--ink);
	}
	.tombol.aktif {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--paper-bone);
	}
	.panel {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
		gap: var(--s-5);
		align-items: center;
	}
	@media (max-width: 860px) {
		.panel {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.bingkai {
		position: relative;
		border-radius: 8px;
		padding: 8px;
		background: linear-gradient(160deg, #3a3a36, #1c1c19);
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.12) inset,
			14px 26px 52px -16px rgb(0 0 0 / 0.65);
	}
	.bingkai.ponsel {
		width: min(280px, 100%);
		margin: 0 auto;
		border-radius: 28px;
		padding: 10px;
	}
	.gambar {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 4px;
	}
	.bingkai.ponsel .gambar {
		border-radius: 20px;
	}
	.kecil {
		position: absolute;
		right: -6px;
		bottom: -18px;
		display: flex;
		gap: 10px;
	}
	@media (max-width: 600px) {
		.kecil {
			position: static;
			margin-top: 12px;
			justify-content: center;
			flex-wrap: wrap;
		}
	}
	.polaroid {
		margin: 0;
		padding: 6px 6px 4px;
		width: 118px;
		background: var(--paper-bone);
		box-shadow: var(--sh-pinned);
		transform: rotate(var(--rot));
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.polaroid img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 10;
		object-fit: cover;
	}
	.polaroid figcaption {
		font-size: 0.95rem;
		line-height: 1.2;
		text-align: center;
	}
	.keterangan h3 {
		color: var(--ink);
		font-size: var(--text-lg);
		margin-bottom: 10px;
	}
	.keterangan p {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.7;
		color: var(--ink-soft);
		text-wrap: pretty;
	}
</style>
