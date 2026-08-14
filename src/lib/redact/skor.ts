/**
 * Skor Paparan.
 *
 * Skor tidak pernah memblokir penerbitan. Ia hanya mengubah warna paku dan
 * menambah satu centang. Cloister memberi informasi; keputusannya tetap milik
 * pengguna, dan itu prinsip yang sama dengan seluruh produk.
 */

import type { HasilPindai, JenisTemuan, Kategori, Temuan } from './tipe.ts';

export const BOBOT: Record<JenisTemuan, number> = {
	nik: 30,
	npwp: 30,
	'kartu-kredit': 30,
	rekening: 30,
	telepon: 20,
	email: 20,
	sosmed: 20,
	alamat: 20,
	koordinat: 20,
	plat: 15,
	'tanggal-lahir': 15,
	orang: 10,
	organisasi: 8,
	tempat: 5
};

/**
 * Temuan lapis 2 dikalikan keyakinannya sebelum dijumlahkan.
 *
 * Alasannya: lapis 1 memakai validator keras (Luhn, struktur NIK, kata kunci
 * wajib), jadi bobot penuhnya dapat dipertanggungjawabkan. Lapis 2 menebak,
 * dan tebakan yang lemah tidak boleh mendorong catatan yang sebenarnya bersih
 * ke kategori merah.
 */
export function hitungSkor(temuan: Temuan[]): number {
	let total = 0;
	for (const t of temuan) {
		const bobot = BOBOT[t.jenis] ?? 0;
		total += t.sumber === 'pola' ? bobot : bobot * t.keyakinan;
	}
	return Math.round(total);
}

export function kategoriDari(skor: number): Kategori {
	if (skor <= 0) return 'bersih';
	if (skor < 30) return 'perlu-dilihat';
	return 'sebaiknya-disunting';
}

export const LABEL_KATEGORI: Record<Kategori, string> = {
	bersih: 'Bersih',
	'perlu-dilihat': 'Perlu dilihat',
	'sebaiknya-disunting': 'Sebaiknya disunting'
};

export const PESAN_KATEGORI: Record<Kategori, string> = {
	bersih: 'Tidak ditemukan hal yang mengarah ke orang tertentu.',
	'perlu-dilihat': 'Ada beberapa hal yang sebaiknya kamu lihat sekali lagi sebelum terbit.',
	'sebaiknya-disunting':
		'Ada informasi yang bisa dipakai mengidentifikasi orang. Sunting dulu, atau centang bahwa kamu sudah sadar.'
};

/** Warna paku per kategori (hijau, kuning, merah). */
export const PAKU_KATEGORI: Record<Kategori, string> = {
	bersih: '#4E7A52',
	'perlu-dilihat': '#B4862C',
	'sebaiknya-disunting': '#9B3B2F'
};

export const LABEL_JENIS: Record<JenisTemuan, string> = {
	nik: 'NIK',
	npwp: 'NPWP',
	'kartu-kredit': 'Nomor kartu',
	rekening: 'Nomor rekening',
	telepon: 'Nomor HP',
	email: 'Alamat email',
	sosmed: 'Akun media sosial',
	alamat: 'Alamat',
	koordinat: 'Koordinat',
	plat: 'Plat nomor',
	'tanggal-lahir': 'Tanggal lahir',
	orang: 'Nama orang',
	organisasi: 'Nama organisasi',
	tempat: 'Nama tempat'
};

export function rakitHasil(
	temuan: Temuan[],
	entitasBerjalan: boolean,
	durasiMs: number
): HasilPindai {
	const skor = hitungSkor(temuan);
	return { temuan, skor, kategori: kategoriDari(skor), entitasBerjalan, durasiMs };
}
