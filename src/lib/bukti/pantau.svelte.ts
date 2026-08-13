/**
 * Instrumentasi klien untuk halaman Bukti (PRD 14.2).
 *
 * Setiap kali klien memanggil rute privat, muatan yang benar-benar dikirim
 * dicatat di sini — bukan versi yang seharusnya dikirim, melainkan string yang
 * masuk ke `fetch`. Halaman Bukti membacanya apa adanya.
 *
 * Angka "byte plaintext yang pernah dikirim" dihitung dengan cara yang bisa
 * gagal: muatan diurai, lalu setiap nilai string diperiksa apakah ia terlihat
 * seperti base64 ciphertext atau bukan. Kalau suatu hari ada regresi yang
 * membocorkan judul ke rute sync, penghitung ini yang akan naik dari nol, dan
 * itulah gunanya.
 */

import { browser } from '$app/environment';

/** Rute yang memang boleh membawa teks terbaca; tidak ikut dihitung. */
const RUTE_PUBLIK = [
	'/api/publish',
	'/api/baca',
	'/api/profile',
	'/api/admin',
	'/api/auth/verify-email'
];

/** Kunci yang berisi bahan kripto, bukan isi catatan. */
const KUNCI_KRIPTO = new Set([
	'ciphertext',
	'nonce',
	'wrappedDek',
	'dekNonce',
	'wrappedMk',
	'mkNonce',
	'recoveryWrappedMk',
	'recoveryNonce',
	'recoverySalt',
	'saltUser',
	'authKey',
	'recoveryAuthKey',
	'blob',
	'wrappedFileKey',
	'fileKeyNonce',
	'tagTokens',
	'accessToken',
	'refreshToken',
	'publicKey',
	'endpoint',
	'p256dh',
	'auth'
]);

/** Nama bidang yang tidak boleh pernah muncul di rute privat. */
export const KUNCI_TERLARANG = ['title', 'body', 'content', 'mood', 'tags', 'plaintext'];

export interface RekamanKirim {
	waktu: number;
	metode: string;
	path: string;
	/** Muatan apa adanya, sebelum dikirim. */
	muatan: string;
	byte: number;
	/** Byte yang tidak bisa dijelaskan sebagai bahan kripto. */
	bytePlaintext: number;
}

const BATAS_REKAMAN = 60;

class Pantau {
	rekaman = $state<RekamanKirim[]>([]);
	bytePlaintext = $state(0);
	byteTerkirim = $state(0);

	catat(metode: string, path: string, muatan: string) {
		if (!browser) return;
		if (RUTE_PUBLIK.some((r) => path.startsWith(r))) return;

		const byte = new TextEncoder().encode(muatan).length;
		const bytePlaintext = hitungPlaintext(muatan);

		this.byteTerkirim += byte;
		this.bytePlaintext += bytePlaintext;
		this.rekaman = [
			{ waktu: Date.now(), metode, path, muatan, byte, bytePlaintext },
			...this.rekaman
		].slice(0, BATAS_REKAMAN);
	}

	/** Rekaman terakhir yang memuat entryId tertentu. */
	untukEntri(entryId: string): RekamanKirim | null {
		return this.rekaman.find((r) => r.muatan.includes(entryId)) ?? null;
	}

	bersihkan() {
		this.rekaman = [];
		this.bytePlaintext = 0;
		this.byteTerkirim = 0;
	}
}

export const pantau = new Pantau();

/**
 * Hitung byte yang tidak dapat dipertanggungjawabkan sebagai bahan kripto.
 *
 * Sengaja dibuat pesimistis: apa pun yang bukan base64, bukan UUID, bukan
 * tanggal ISO, dan bukan angka dianggap plaintext. Lebih baik penghitung ini
 * naik karena positif palsu dan diselidiki, daripada diam saat ada kebocoran.
 */
export function hitungPlaintext(muatan: string): number {
	let data: unknown;
	try {
		data = JSON.parse(muatan);
	} catch {
		return 0; // bukan JSON: form-data lampiran, isinya sudah ciphertext
	}

	let total = 0;
	const enc = new TextEncoder();

	const telusuri = (nilai: unknown, kunci: string) => {
		if (Array.isArray(nilai)) {
			for (const n of nilai) telusuri(n, kunci);
			return;
		}
		if (nilai && typeof nilai === 'object') {
			for (const [k, v] of Object.entries(nilai)) telusuri(v, k);
			return;
		}
		if (typeof nilai !== 'string') return;
		if (KUNCI_KRIPTO.has(kunci)) return;
		if (miripBahanKripto(nilai)) return;
		total += enc.encode(nilai).length;
	};

	telusuri(data, '');
	return total;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_ISO = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$/;
const RE_B64 = /^[A-Za-z0-9+/_-]{16,}={0,2}$/;
const RE_ANGKA = /^-?\d+(?:\.\d+)?$/;

function miripBahanKripto(s: string): boolean {
	if (s.length === 0) return true;
	return RE_UUID.test(s) || RE_ISO.test(s) || RE_B64.test(s) || RE_ANGKA.test(s);
}
