/**
 * Tindakan penyuntingan yang ditawarkan Penyaring Identitas (PRD 13.4).
 *
 * Aturan yang tidak boleh dilanggar: penyuntingan **hanya** berlaku pada
 * salinan publik. Catatan privat yang asli tidak pernah disentuh. Karena itu
 * seluruh berkas ini bekerja pada string dan mengembalikan string baru; tidak
 * ada satu pun jalur yang menulis balik ke IndexedDB.
 */

import type { JenisTemuan, Keputusan, Temuan, Tindakan } from './tipe.ts';

/** Balok hitam, panjangnya mengikuti jumlah karakter yang disembunyikan. */
export function sensor(teks: string): string {
	const bersih = teks.trim();
	const panjang = Math.min(Math.max(bersih.replace(/\s/g, '').length, 3), 12);
	return '█'.repeat(panjang);
}

/** "Rina Kartika" jadi "R.K." — cukup untuk mengingat siapa, tanpa menyebut. */
export function inisial(teks: string): string {
	const bagian = teks
		.trim()
		.split(/\s+/)
		.filter((b) => /[A-Za-zÀ-ÿ]/.test(b));
	if (bagian.length === 0) return sensor(teks);
	return bagian.map((b) => `${(b[0] ?? '').toUpperCase()}.`).join('');
}

/** Pengganti generik per jenis. Menjaga kalimat tetap terbaca. */
const GENERIK: Record<JenisTemuan, string> = {
	nik: 'nomor identitas',
	npwp: 'nomor pajak',
	'kartu-kredit': 'nomor kartu',
	rekening: 'sebuah nomor rekening',
	telepon: 'nomor teleponnya',
	email: 'alamat surelnya',
	sosmed: 'akun media sosialnya',
	alamat: 'sebuah alamat',
	koordinat: 'sebuah titik lokasi',
	plat: 'plat nomornya',
	'tanggal-lahir': 'tanggal lahirnya',
	orang: 'seorang teman',
	organisasi: 'sebuah organisasi',
	tempat: 'sebuah tempat'
};

export function generik(jenis: JenisTemuan): string {
	return GENERIK[jenis] ?? '[disunting]';
}

export function terapkanSatu(temuan: Temuan, tindakan: Tindakan): string {
	switch (tindakan) {
		case 'sensor':
			return sensor(temuan.teks);
		case 'inisial':
			return inisial(temuan.teks);
		case 'generik':
			return generik(temuan.jenis);
		case 'biarkan':
			return temuan.teks;
	}
}

/**
 * Terapkan seluruh keputusan ke teks polos.
 *
 * Dikerjakan dari belakang ke depan supaya indeks temuan yang belum diproses
 * tidak bergeser saat panjang penggantinya berbeda.
 */
export function terapkan(teks: string, temuan: Temuan[], keputusan: Keputusan[]): string {
	const peta = new Map(keputusan.map((k) => [k.temuanId, k.tindakan]));
	const urut = [...temuan].sort((a, b) => b.mulai - a.mulai);

	let hasil = teks;
	for (const t of urut) {
		const tindakan = peta.get(t.id);
		if (!tindakan || tindakan === 'biarkan') continue;
		hasil = hasil.slice(0, t.mulai) + terapkanSatu(t, tindakan) + hasil.slice(t.selesai);
	}
	return hasil;
}

/**
 * Terapkan keputusan ke markdown mentah.
 *
 * Temuan diindeks terhadap teks polos, sedangkan yang diterbitkan adalah
 * markdown. Alih-alih memetakan indeks antara dua representasi — yang rapuh
 * begitu ada tautan atau penekanan — penggantian dilakukan berbasis potongan
 * teks. Ini sengaja konservatif: kalau potongan tidak ditemukan apa adanya di
 * markdown, ia dilewati dan pengguna tetap melihat teks aslinya di pratinjau,
 * bukan hasil sunting yang salah tempat.
 */
export function terapkanKeMarkdown(
	markdown: string,
	temuan: Temuan[],
	keputusan: Keputusan[]
): string {
	const peta = new Map(keputusan.map((k) => [k.temuanId, k.tindakan]));
	let hasil = markdown;

	// Yang paling panjang dulu, supaya "Jl. Kaliurang No. 14" tidak keburu
	// dipotong oleh penggantian "Kaliurang" yang lebih pendek.
	const urut = [...temuan].sort((a, b) => b.teks.length - a.teks.length);

	for (const t of urut) {
		const tindakan = peta.get(t.id);
		if (!tindakan || tindakan === 'biarkan') continue;
		const asli = t.teks;
		if (!asli || !hasil.includes(asli)) continue;
		hasil = hasil.split(asli).join(terapkanSatu(t, tindakan));
	}
	return hasil;
}
