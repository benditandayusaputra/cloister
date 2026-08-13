/**
 * Lapis 2 Penyaring Identitas: pengenal entitas bernama, di perangkat.
 *
 * ## Kenapa bukan model ONNX
 *
 * PRD versi awal membayangkan model NER terkuantisasi lewat Transformers.js.
 * Itu dilepas dengan sadar, dan alasannya ditulis lengkap di
 * `docs/REDACTION.md`. Ringkasnya tiga hal:
 *
 * 1. Anggaran unduhan 80 MB bertabrakan dengan janji "berfungsi penuh tanpa
 *    jaringan". Alur demo lomba mematikan wifi di depan juri; fitur yang butuh
 *    unduhan sekali pun adalah fitur yang bisa gagal di saat paling salah.
 * 2. Bobot model perlu dilayani dari origin sendiri supaya `connect-src 'self'`
 *    tetap utuh. Melonggarkan CSP demi satu fitur adalah pertukaran yang buruk
 *    di aplikasi yang seluruh premisnya adalah ketahanan terhadap XSS.
 * 3. Evaluasi awal NER bahasa Indonesia untuk nama panggilan dan nama tidak
 *    lazim ada di bawah ambang yang kami tetapkan sendiri (presisi 80%).
 *    PRD 34.5 memang mengizinkan berhenti di lapis 1 kalau angkanya tidak
 *    memenuhi syarat.
 *
 * Yang dipakai sebagai gantinya: pengenal berbasis leksikon dan tata aturan
 * konteks yang berjalan sepenuhnya di perangkat, tanpa unduhan, dan tanpa
 * request jaringan. Ia lebih lemah daripada model neural yang baik, dan
 * angkanya diukur apa adanya di `tests/redaction-eval/`. Antarmuka menyebut
 * apa yang benar-benar berjalan, bukan yang enak didengar.
 *
 * Titik sambung untuk model neural tetap dijaga: `pindaiEntitas` menerima teks
 * dan mengembalikan `Temuan[]`, jadi mesin lain bisa menggantikannya tanpa
 * menyentuh pemanggilnya.
 */

import type { JenisTemuan, Temuan } from './tipe.ts';
import { rapikan } from './pola.ts';

/* ------------------------------------------------------------------ *
 * Leksikon
 * ------------------------------------------------------------------ */

/** Sapaan dan gelar yang hampir selalu diikuti nama orang. */
const GELAR = new Set([
	'pak',
	'bapak',
	'bu',
	'ibu',
	'mas',
	'mbak',
	'kak',
	'kakak',
	'dek',
	'adek',
	'adik',
	'bang',
	'abang',
	'om',
	'tante',
	'kang',
	'teh',
	'mang',
	'bung',
	'dok',
	'dokter',
	'prof',
	'ustaz',
	'ustad',
	'ustadz',
	'ustazah',
	'romo',
	'suster',
	'bruder',
	'si',
	'sdr',
	'sdri',
	'tuan',
	'nyonya',
	'nona'
]);

/** Kata kerja dan preposisi yang biasanya mendahului nama orang. */
const PEMICU_ORANG = new Set([
	'ketemu',
	'bertemu',
	'nemuin',
	'sama',
	'bareng',
	'bersama',
	'dari',
	'ke',
	'buat',
	'untuk',
	'telepon',
	'nelpon',
	'chat',
	'wa',
	'kirim',
	'ditemani',
	'diantar',
	'nganter',
	'jemput',
	'dijemput',
	'ngobrol',
	'cerita',
	'curhat',
	'bilang',
	'kata',
	'menurut',
	'nanya',
	'tanya',
	'jawab',
	'balas',
	'ajak',
	'diajak',
	'temenin',
	'nemenin',
	'namanya',
	'panggil',
	'dipanggil',
	'kenal',
	'kenalan',
	'pacar',
	'temen',
	'teman',
	'sahabat',
	'atasan',
	'bos',
	'dosen',
	'wali'
]);

/** Kata yang menandakan token berikutnya kemungkinan besar nama tempat. */
const PEMICU_TEMPAT = new Set([
	'di',
	'ke',
	'dari',
	'menuju',
	'sampai',
	'tinggal',
	'kos',
	'kost',
	'rumah',
	'kampus',
	'kantor',
	'daerah',
	'kawasan',
	'wilayah',
	'kota',
	'kabupaten',
	'provinsi',
	'stasiun',
	'terminal',
	'bandara',
	'pasar',
	'mall',
	'rs',
	'puskesmas',
	'masjid',
	'gereja',
	'sekolah'
]);

/** Akhiran yang menandai organisasi. */
const PENANDA_ORG = new Set([
	'pt',
	'cv',
	'ud',
	'tbk',
	'universitas',
	'institut',
	'politeknik',
	'sekolah',
	'yayasan',
	'koperasi',
	'bank',
	'rs',
	'rsud',
	'rsup',
	'kementerian',
	'dinas',
	'badan',
	'lembaga',
	'himpunan',
	'fakultas',
	'jurusan',
	'komunitas',
	'startup',
	'perusahaan'
]);

/**
 * Kata berhuruf besar yang bukan nama diri.
 *
 * Daftar ini adalah yang paling menentukan presisi. Bahasa Indonesia tulis
 * penuh dengan huruf kapital di awal kalimat, nama hari, nama bulan, dan
 * singkatan; tanpa penyaring ini setiap kalimat akan melahirkan "nama orang".
 */
const BUKAN_NAMA = new Set([
	// awal kalimat dan penghubung
	'aku','saya','kamu','kami','kita','dia','mereka','ini','itu','yang','dan','atau','tapi','tetapi',
	'karena','kalau','jika','saat','ketika','setelah','sebelum','sampai','sambil','supaya','agar',
	'lalu','terus','kemudian','akhirnya','ternyata','padahal','soalnya','pokoknya','jadi','memang',
	'sudah','udah','belum','masih','lagi','pernah','selalu','sering','kadang','jarang','tidak','nggak',
	'ada','tak','bukan','sangat','banget','cukup','agak','paling','lebih','kurang','semua','setiap',
	// waktu
	'senin','selasa','rabu','kamis','jumat','sabtu','minggu','pagi','siang','sore','malam','subuh',
	'hari','kemarin','besok','lusa','tadi','nanti','sekarang','januari','februari','maret','april',
	'mei','juni','juli','agustus','september','oktober','november','desember','tahun','bulan',
	// umum
	'alhamdulillah','insyaallah','masyaallah','astaghfirullah','bismillah','ok','oke','iya','ya',
	'terima','kasih','selamat','maaf','tolong','halo','hai','yuk','ayo','wah','duh','huh','hmm'
]);

/** Nama tempat Indonesia yang paling sering muncul di tulisan harian. */
const TEMPAT = new Set([
	'jakarta','bandung','surabaya','medan','semarang','makassar','palembang','depok','tangerang',
	'bekasi','bogor','yogyakarta','jogja','jogjakarta','solo','surakarta','malang','denpasar','bali',
	'padang','pekanbaru','banjarmasin','pontianak','samarinda','balikpapan','manado','ambon','jayapura',
	'kupang','mataram','serang','cilegon','cirebon','tasikmalaya','garut','sukabumi','purwokerto',
	'magelang','salatiga','kudus','pekalongan','tegal','madiun','kediri','jember','banyuwangi','sidoarjo',
	'gresik','mojokerto','pasuruan','probolinggo','blitar','tulungagung','sleman','bantul','kulonprogo',
	'gunungkidul','klaten','boyolali','sragen','karanganyar','wonogiri','sukoharjo','pangkalpinang',
	'tanjungpandan','belitung','bangka','batam','tanjungpinang','jambi','bengkulu','lampung',
	'bandarlampung','palangkaraya','banda','aceh','ternate','sorong','merauke','timika','palu','kendari',
	'gorontalo','mamuju','singkawang','dumai','binjai','tebingtinggi','sibolga','lubuklinggau',
	'sumatera','kalimantan','sulawesi','papua','jawa','madura','lombok','flores','sumbawa','nusa',
	'tenggara','maluku','riau','banten','indonesia'
]);

/* ------------------------------------------------------------------ *
 * Tokenisasi
 * ------------------------------------------------------------------ */

interface Token {
	teks: string;
	mulai: number;
	selesai: number;
	/** Huruf pertama kapital dan sisanya bukan seluruhnya kapital. */
	kapital: boolean;
	awalKalimat: boolean;
}

const RE_TOKEN = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]*/g;

function tokenisasi(teks: string): Token[] {
	const out: Token[] = [];
	let m: RegExpExecArray | null;
	RE_TOKEN.lastIndex = 0;
	while ((m = RE_TOKEN.exec(teks)) !== null) {
		const sebelum = teks.slice(0, m.index);
		const awalKalimat = /(^|[.!?\n]\s*|^\s*[-*]\s*)$/.test(sebelum.slice(-6));
		const huruf0 = m[0][0] ?? '';
		out.push({
			teks: m[0],
			mulai: m.index,
			selesai: m.index + m[0].length,
			kapital: huruf0 === huruf0.toUpperCase() && m[0] !== m[0].toUpperCase(),
			awalKalimat
		});
	}
	return out;
}

const bawah = (s: string) => s.toLowerCase().replace(/[’']/g, '');

/* ------------------------------------------------------------------ *
 * Pengenal
 * ------------------------------------------------------------------ */

interface Kandidat {
	jenis: JenisTemuan;
	teks: string;
	mulai: number;
	selesai: number;
	keyakinan: number;
	alasan: string;
}

/**
 * Ambil deretan token kapital berurutan mulai dari `i`.
 * "Rina Kartika Sari" jadi satu entitas, bukan tiga.
 */
function rentangKapital(tok: Token[], i: number, maks = 3): { akhir: number; teks: string } | null {
	const t0 = tok[i];
	if (!t0?.kapital) return null;
	let akhir = i;
	while (akhir + 1 < tok.length && akhir - i + 1 < maks) {
		const berikut = tok[akhir + 1];
		if (!berikut?.kapital) break;
		if (BUKAN_NAMA.has(bawah(berikut.teks))) break;
		akhir++;
	}
	const awal = tok[i];
	const habis = tok[akhir];
	if (!awal || !habis) return null;
	return { akhir, teks: '' };
}

export function pindaiEntitas(teks: string): Temuan[] {
	const tok = tokenisasi(teks);
	const kandidat: Kandidat[] = [];

	for (let i = 0; i < tok.length; i++) {
		const t = tok[i];
		if (!t) continue;
		const kata = bawah(t.teks);

		// --- Organisasi: penanda diikuti nama berkapital ------------------
		if (PENANDA_ORG.has(kata)) {
			const r = rentangKapital(tok, i + 1);
			if (r) {
				const awal = tok[i + 1];
				const habis = tok[r.akhir];
				if (awal && habis) {
					kandidat.push({
						jenis: 'organisasi',
						teks: teks.slice(t.mulai, habis.selesai),
						mulai: t.mulai,
						selesai: habis.selesai,
						keyakinan: 0.72,
						alasan: `Penanda organisasi "${t.teks}" diikuti nama`
					});
					i = r.akhir;
					continue;
				}
			}
		}

		if (!t.kapital) continue;
		if (BUKAN_NAMA.has(kata)) continue;

		const r = rentangKapital(tok, i);
		if (!r) continue;
		const habis = tok[r.akhir];
		if (!habis) continue;
		const frasa = teks.slice(t.mulai, habis.selesai);
		const sebelumnya = i > 0 ? bawah(tok[i - 1]?.teks ?? '') : '';

		// --- Tempat yang dikenali leksikon --------------------------------
		if (TEMPAT.has(kata)) {
			kandidat.push({
				jenis: 'tempat',
				teks: frasa,
				mulai: t.mulai,
				selesai: habis.selesai,
				keyakinan: 0.8,
				alasan: 'Nama tempat yang dikenali'
			});
			i = r.akhir;
			continue;
		}

		// --- Orang: gelar atau kata kerja sosial di depannya ---------------
		if (GELAR.has(sebelumnya)) {
			kandidat.push({
				jenis: 'orang',
				teks: frasa,
				mulai: t.mulai,
				selesai: habis.selesai,
				keyakinan: 0.85,
				alasan: `Nama tepat setelah sapaan "${sebelumnya}"`
			});
			i = r.akhir;
			continue;
		}

		if (PEMICU_ORANG.has(sebelumnya)) {
			// "di Bandung" dan "ke Jakarta" sudah tertangkap leksikon tempat di
			// atas; sisanya yang mengikuti kata sosial lebih mungkin orang.
			const jenis: JenisTemuan = PEMICU_TEMPAT.has(sebelumnya) ? 'tempat' : 'orang';
			kandidat.push({
				jenis,
				teks: frasa,
				mulai: t.mulai,
				selesai: habis.selesai,
				keyakinan: jenis === 'orang' ? 0.7 : 0.55,
				alasan: `Nama tepat setelah kata "${sebelumnya}"`
			});
			i = r.akhir;
			continue;
		}

		// --- Dua kata kapital berurutan di tengah kalimat -------------------
		// "kemarin Rina Kartika datang" — pola nama depan + nama belakang.
		if (r.akhir > i && !t.awalKalimat) {
			kandidat.push({
				jenis: 'orang',
				teks: frasa,
				mulai: t.mulai,
				selesai: habis.selesai,
				keyakinan: 0.6,
				alasan: 'Dua kata berhuruf besar berurutan di tengah kalimat'
			});
			i = r.akhir;
			continue;
		}

		// --- Satu kata kapital di tengah kalimat ---------------------------
		// Keyakinan sengaja rendah: ini sumber positif palsu terbesar, jadi ia
		// muncul di daftar tapi tidak pernah cukup untuk mendorong skor ke
		// kategori merah sendirian.
		if (!t.awalKalimat && t.teks.length >= 3) {
			kandidat.push({
				jenis: 'orang',
				teks: frasa,
				mulai: t.mulai,
				selesai: habis.selesai,
				keyakinan: 0.45,
				alasan: 'Kata berhuruf besar di tengah kalimat'
			});
			i = r.akhir;
		}
	}

	return rapikan(kandidat, 'entitas');
}
