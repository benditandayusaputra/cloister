/**
 * Lapis 1 Penyaring Identitas: pola terstruktur.
 *
 * Prinsip yang dipegang di berkas ini: **presisi lebih penting daripada
 * cakupan**. Penyaring yang meneriaki setiap angka 16 digit akan dimatikan
 * pengguna dalam seminggu, dan penyaring yang dimatikan menyaring nol persen.
 * Karena itu hampir semua pola di sini divalidasi lagi setelah cocok — lewat
 * struktur (NIK), lewat checksum (kartu kredit), atau lewat kata kunci yang
 * wajib berdiri di dekatnya (nomor rekening).
 */

import type { JenisTemuan, Temuan } from './tipe.ts';

interface Kandidat {
	jenis: JenisTemuan;
	teks: string;
	mulai: number;
	selesai: number;
	keyakinan: number;
	alasan: string;
}

/* ------------------------------------------------------------------ *
 * Alat bantu
 * ------------------------------------------------------------------ */

const DIGIT = /[^0-9]/g;

/** Luhn mod-10, dipakai untuk memisahkan nomor kartu dari angka biasa. */
export function luhn(angka: string): boolean {
	const d = angka.replace(DIGIT, '');
	if (d.length < 13 || d.length > 19) return false;
	let jumlah = 0;
	let ganda = false;
	for (let i = d.length - 1; i >= 0; i--) {
		let n = d.charCodeAt(i) - 48;
		if (ganda) {
			n *= 2;
			if (n > 9) n -= 9;
		}
		jumlah += n;
		ganda = !ganda;
	}
	return jumlah % 10 === 0;
}

/**
 * NIK: 16 digit, `PPKKCC DDMMYY NNNN`.
 *
 * Yang divalidasi: kode provinsi 11–94, tanggal 1–31 atau 41–71 (perempuan
 * ditandai dengan tanggal + 40), bulan 1–12, dan empat digit urut bukan nol.
 * Tanpa validasi ini, setiap 16 digit — termasuk nomor kartu dan nomor
 * resi — akan ditandai sebagai NIK.
 */
export function nikValid(angka: string): boolean {
	const d = angka.replace(DIGIT, '');
	if (d.length !== 16) return false;

	const provinsi = Number(d.slice(0, 2));
	if (provinsi < 11 || provinsi > 94) return false;

	const kabupaten = Number(d.slice(2, 4));
	const kecamatan = Number(d.slice(4, 6));
	if (kabupaten < 1 || kecamatan < 1) return false;

	let tanggal = Number(d.slice(6, 8));
	if (tanggal > 40) tanggal -= 40;
	if (tanggal < 1 || tanggal > 31) return false;

	const bulan = Number(d.slice(8, 10));
	if (bulan < 1 || bulan > 12) return false;

	return Number(d.slice(12, 16)) > 0;
}

/** Koordinat yang masuk akal untuk wilayah Indonesia (PRD 13.2). */
export function koordinatIndonesia(lat: number, lon: number): boolean {
	return lat >= -11.2 && lat <= 6.3 && lon >= 94.9 && lon <= 141.1;
}

function ambil(
	teks: string,
	re: RegExp,
	jenis: JenisTemuan,
	keyakinan: number,
	alasan: string,
	saring?: (cocok: RegExpExecArray) => boolean
): Kandidat[] {
	const keluar: Kandidat[] = [];
	const pola = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
	let m: RegExpExecArray | null;
	while ((m = pola.exec(teks)) !== null) {
		if (m[0].length === 0) {
			pola.lastIndex++;
			continue;
		}
		if (saring && !saring(m)) continue;
		keluar.push({
			jenis,
			teks: m[0],
			mulai: m.index,
			selesai: m.index + m[0].length,
			keyakinan,
			alasan
		});
	}
	return keluar;
}

/* ------------------------------------------------------------------ *
 * Pola
 * ------------------------------------------------------------------ */

// Ditulis eksplisit dan tidak digabung supaya tiap baris bisa dibaca,
// diuji, dan dimatikan sendiri-sendiri.

const RE_NIK = /\b\d{16}\b/;
const RE_NPWP = /\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b|\b\d{15,16}\b/;
const RE_KARTU = /\b(?:\d[ -]?){12,18}\d\b/;
const RE_TELEPON = /(?<![\d])(?:\+62|62|0)8[1-9][0-9]{6,10}(?![\d])/;
const RE_TELEPON_SPASI = /(?<![\d])(?:\+62|62|0)8[1-9][0-9]{1,3}(?:[ -][0-9]{2,5}){1,3}(?![\d])/;
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const RE_SOSMED =
	/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|tiktok\.com|facebook\.com|x\.com|twitter\.com|t\.me|wa\.me|linkedin\.com)\/[@A-Za-z0-9._/-]+/i;
const RE_HANDLE = /(?<![A-Za-z0-9._@])@[A-Za-z][A-Za-z0-9._]{2,29}\b/;
const RE_PLAT = /\b[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}\b/;
const RE_KOORDINAT = /(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/;

/** Nomor rekening hanya dihitung kalau ada kata kunci di depannya. */
const RE_REKENING =
	/\b(?:no(?:mor)?\.?\s*)?(?:rek(?:ening)?|a\.?\s?n\.?|va|virtual\s+account)\b[^0-9\n]{0,24}(\d[\d\s-]{8,20}\d)/i;

/** Kata kunci alamat diikuti minimal satu token yang bukan spasi. */
const RE_ALAMAT =
	/\b(?:jl\.?|jalan|gg\.?|gang|perum(?:ahan)?|komp(?:leks)?\.?|blok|kel\.?|kelurahan|kec\.?|kecamatan|desa|dusun|rt\.?\s?\d{1,3}(?:\s?\/?\s?rw\.?\s?\d{1,3})?)\s+[A-Za-z0-9][^\n,.;]{0,60}/i;

const RE_TANGGAL =
	/\b(0?[1-9]|[12]\d|3[01])[\s/-](0?[1-9]|1[0-2]|jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)[\s/-](19[3-9]\d|20[0-2]\d)\b/i;

const PEMICU_LAHIR = /\b(lahir|kelahiran|ultah|ulang\s+tahun|born|dob|tgl\.?\s*lhr)\b/i;

const PEMICU_KARTU = /\b(kartu\s+(kredit|debit|atm)|credit\s+card|nomor\s+kartu|visa|mastercard)/i;
const PEMICU_NIK = /\b(nik|ktp|kependudukan|kartu\s+keluarga|kk)\b/i;

/** Deretan angka yang bentuknya nomor seluler Indonesia, bukan nomor kartu. */
const RE_SELULER_POLOS = /^(?:62|0)8[1-9]\d{6,10}$/;

/** Konteks di sekitar sebuah posisi, dipakai untuk pemicu berbasis kata. */
function sekitar(teks: string, mulai: number, selesai: number, radius = 40): string {
	return teks.slice(Math.max(0, mulai - radius), Math.min(teks.length, selesai + radius));
}

/* ------------------------------------------------------------------ *
 * Pemindai
 * ------------------------------------------------------------------ */

const TAHUN_INI = () => new Date().getFullYear();

export function pindaiPola(teks: string): Temuan[] {
	const kandidat: Kandidat[] = [];

	// --- Angka identitas -------------------------------------------------
	kandidat.push(
		...ambil(teks, RE_NIK, 'nik', 0.95, 'Cocok struktur NIK: kode wilayah, tanggal lahir, nomor urut', (m) => {
			if (!nikValid(m[0])) return false;
			// Sebagian nomor kartu 16 digit kebetulan lolos struktur NIK. Kalau
			// kalimatnya menyebut kartu dan angkanya lolos Luhn, biarkan pola
			// kartu yang mengambilnya.
			const konteks = sekitar(teks, m.index, m.index + m[0].length);
			if (PEMICU_NIK.test(konteks)) return true;
			return !(PEMICU_KARTU.test(konteks) && luhn(m[0]));
		})
	);

	kandidat.push(
		...ambil(teks, RE_NPWP, 'npwp', 0.9, 'Cocok format NPWP', (m) => {
			if (m[0].includes('.')) return true;
			// 15/16 digit polos hanya dihitung NPWP kalau kata kuncinya ada,
			// supaya tidak berebut dengan NIK dan nomor kartu.
			return /\bnpwp\b/i.test(sekitar(teks, m.index, m.index + m[0].length));
		})
	);

	kandidat.push(
		...ambil(teks, RE_KARTU, 'kartu-kredit', 0.92, 'Lolos algoritma Luhn, ciri nomor kartu', (m) => {
			const d = m[0].replace(DIGIT, '');
			if (!luhn(d)) return false;
			// Nomor seluler Indonesia sesekali lolos Luhn secara kebetulan.
			if (RE_SELULER_POLOS.test(d)) return false;
			const konteks = sekitar(teks, m.index, m.index + m[0].length);
			// NIK menang untuk 16 digit, kecuali kalimatnya memang menyebut kartu.
			if (d.length === 16 && nikValid(d) && !PEMICU_KARTU.test(konteks)) return false;
			return true;
		})
	);

	kandidat.push(
		...ambil(teks, RE_REKENING, 'rekening', 0.88, 'Deretan angka tepat setelah kata "rekening" atau "a.n."', () => true)
	);

	// --- Kontak ----------------------------------------------------------
	kandidat.push(...ambil(teks, RE_TELEPON, 'telepon', 0.93, 'Format nomor seluler Indonesia'));
	kandidat.push(
		...ambil(teks, RE_TELEPON_SPASI, 'telepon', 0.85, 'Nomor seluler Indonesia yang ditulis berspasi')
	);
	kandidat.push(...ambil(teks, RE_EMAIL, 'email', 0.96, 'Alamat surel'));
	kandidat.push(...ambil(teks, RE_SOSMED, 'sosmed', 0.94, 'Tautan ke profil media sosial'));
	kandidat.push(
		...ambil(teks, RE_HANDLE, 'sosmed', 0.7, 'Bentuknya nama akun media sosial', (m) => m[0].length >= 4)
	);

	// --- Lokasi ----------------------------------------------------------
	kandidat.push(
		...ambil(teks, RE_ALAMAT, 'alamat', 0.86, 'Kata kunci alamat diikuti nama tempat', (m) => {
			// "jalan memutar supaya bisa lewat taman" bukan alamat. Alamat sungguhan
			// hampir selalu memuat angka, atau nama tempat yang berhuruf besar.
			if (/\d/.test(m[0])) return true;
			const setelah = m[0].replace(
				/^(?:jl\.?|jalan|gg\.?|gang|perum(?:ahan)?|komp(?:leks)?\.?|blok|kel\.?|kelurahan|kec\.?|kecamatan|desa|dusun)\s+/i,
				''
			);
			const huruf0 = setelah[0] ?? '';
			return huruf0 === huruf0.toUpperCase() && /[A-Za-z]/.test(huruf0);
		})
	);
	kandidat.push(
		...ambil(teks, RE_KOORDINAT, 'koordinat', 0.9, 'Pasangan koordinat di dalam rentang Indonesia', (m) =>
			koordinatIndonesia(Number(m[1]), Number(m[2]))
		)
	);

	// --- Kendaraan dan tanggal ------------------------------------------
	kandidat.push(
		...ambil(teks, RE_PLAT, 'plat', 0.62, 'Bentuknya plat nomor kendaraan', (m) => {
			// Plat gampang sekali salah tangkap ("BAB 2 A", "RT 3 RW"). Wajib ada
			// pemicu kata di sekitarnya sebelum dianggap benar-benar plat.
			return /\b(plat|nopol|mobil|motor|kendaraan|parkir|stnk)\b/i.test(
				sekitar(teks, m.index, m.index + m[0].length, 32)
			);
		})
	);

	kandidat.push(
		...ambil(teks, RE_TANGGAL, 'tanggal-lahir', 0.8, 'Tanggal lengkap di dekat kata "lahir"', (m) => {
			const tahun = Number(m[3]);
			if (tahun < 1930 || tahun > TAHUN_INI() - 5) return false;
			return PEMICU_LAHIR.test(sekitar(teks, m.index, m.index + m[0].length, 48));
		})
	);

	return rapikan(kandidat, 'pola');
}

/* ------------------------------------------------------------------ *
 * Penyatuan
 * ------------------------------------------------------------------ */

/** Bobot relatif saat dua temuan menempati potongan teks yang sama. */
const PRIORITAS: Record<JenisTemuan, number> = {
	nik: 100,
	npwp: 95,
	'kartu-kredit': 90,
	rekening: 85,
	telepon: 80,
	email: 78,
	sosmed: 70,
	koordinat: 68,
	alamat: 60,
	'tanggal-lahir': 50,
	plat: 45,
	orang: 30,
	organisasi: 20,
	tempat: 10
};

/**
 * Buang tumpang tindih dan beri id yang stabil.
 *
 * Stabil berarti: teks yang sama dipindai dua kali menghasilkan id yang sama,
 * sehingga keputusan pengguna ("biarkan") tidak hilang saat pemindaian ulang.
 */
export function rapikan(kandidat: Kandidat[], sumber: 'pola' | 'entitas'): Temuan[] {
	const urut = [...kandidat].sort((a, b) => {
		if (a.mulai !== b.mulai) return a.mulai - b.mulai;
		const rentang = b.selesai - b.mulai - (a.selesai - a.mulai);
		if (rentang !== 0) return rentang;
		return PRIORITAS[b.jenis] - PRIORITAS[a.jenis];
	});

	const diterima: Kandidat[] = [];
	for (const k of urut) {
		const bentrok = diterima.findIndex((d) => k.mulai < d.selesai && d.mulai < k.selesai);
		if (bentrok === -1) {
			diterima.push(k);
			continue;
		}
		const lawan = diterima[bentrok];
		if (!lawan) continue;
		// Temuan yang membungkus selalu menang. Tanpa aturan ini, nomor HP di
		// dalam `wa.me/62812...` akan menggantikan tautan media sosialnya hanya
		// karena bobot jenisnya lebih tinggi.
		if (lawan.mulai <= k.mulai && k.selesai <= lawan.selesai) continue;
		if (k.mulai <= lawan.mulai && lawan.selesai <= k.selesai) {
			diterima[bentrok] = k;
			continue;
		}
		if (PRIORITAS[k.jenis] > PRIORITAS[lawan.jenis]) diterima[bentrok] = k;
	}

	return diterima
		.sort((a, b) => a.mulai - b.mulai)
		.map((k) => ({
			id: `${sumber}:${k.jenis}:${k.mulai}:${k.selesai}`,
			jenis: k.jenis,
			sumber,
			teks: k.teks,
			mulai: k.mulai,
			selesai: k.selesai,
			keyakinan: k.keyakinan,
			alasan: k.alasan
		}));
}
