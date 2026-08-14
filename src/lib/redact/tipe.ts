/**
 * Tipe bersama Penyaring Identitas.
 *
 * Seluruh file di direktori ini berjalan di perangkat pengguna dan tidak
 * boleh melakukan permintaan jaringan apa pun. Aturan itu ditegakkan tes di
 * `tests/unit/redact-offline.test.ts`.
 */

/** Jenis temuan. Urutannya tidak berarti apa-apa; bobot ada di `skor.ts`. */
export type JenisTemuan =
	| 'nik'
	| 'npwp'
	| 'kartu-kredit'
	| 'rekening'
	| 'telepon'
	| 'email'
	| 'sosmed'
	| 'alamat'
	| 'koordinat'
	| 'plat'
	| 'tanggal-lahir'
	| 'orang'
	| 'tempat'
	| 'organisasi';

/** Lapis mana yang menemukan. Ditampilkan apa adanya di antarmuka. */
export type SumberTemuan = 'pola' | 'entitas';

export interface Temuan {
	/** Stabil antar pemindaian untuk teks yang sama, dipakai sebagai key di UI. */
	id: string;
	jenis: JenisTemuan;
	sumber: SumberTemuan;
	/** Potongan teks apa adanya, tanpa normalisasi. */
	teks: string;
	/** Indeks di dalam teks polos, bukan di dalam markdown mentah. */
	mulai: number;
	selesai: number;
	/** 0..1. Dipakai untuk mengurutkan, bukan untuk memblokir. */
	keyakinan: number;
	/** Alasan singkat yang bisa dibaca pengguna. */
	alasan: string;
}

export type Kategori = 'bersih' | 'perlu-dilihat' | 'sebaiknya-disunting';

export interface HasilPindai {
	temuan: Temuan[];
	skor: number;
	kategori: Kategori;
	/** Lapis 2 dilewati kalau pengguna mematikannya atau kalau worker gagal. */
	entitasBerjalan: boolean;
	/** Milidetik, dipakai di panel transparansi. */
	durasiMs: number;
}

/** Tindakan yang bisa dipilih pengguna per temuan. */
export type Tindakan = 'sensor' | 'inisial' | 'generik' | 'biarkan';

export interface Keputusan {
	temuanId: string;
	tindakan: Tindakan;
}
