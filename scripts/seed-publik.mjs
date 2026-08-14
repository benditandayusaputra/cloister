/**
 * Mengisi feed publik `/baca` dengan penulis dan catatan contoh.
 *
 * Dua tahap, dan alasannya penting:
 *
 * 1. **Akun dibuat lewat browser sungguhan** (Playwright), karena kunci dan
 *    catatan privat dienkripsi di sisi klien — tidak ada cara jujur menyemai
 *    akun yang benar-benar bisa dipakai selain menjalankan kriptografinya.
 * 2. **Catatan publik disisipkan lewat SQL**, dan itu justru sesuai desain:
 *    tabel `public_entries` memang plaintext karena isinya sudah sengaja
 *    dikeluarkan dari enkripsi oleh penulisnya (PRD 16). Menyemainya lewat SQL
 *    tidak melanggar batas apa pun.
 *
 * Verifikasi email dan nama pena juga diset lewat SQL supaya seeder tidak
 *
 * bergantung pada kotak masuk sungguhan.
 *
 *   node scripts/seed-publik.mjs [--url http://localhost:4820]
 *
 * Seluruh isi sintetis. Tidak ada data orang sungguhan, dan tidak ada PII di
 * catatan publik — produk yang penyaring identitasnya jadi fitur utama tidak
 * pantas punya data demo yang bocor sendiri.
 */
import { chromium } from 'playwright';
import { appendFileSync, existsSync } from 'node:fs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';

const arg = (nama, bawaan) => {
	const i = process.argv.indexOf(`--${nama}`);
	return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : bawaan;
};

const URL = arg('url', 'http://localhost:4820');
const DB = process.env.DATABASE_URL ?? 'postgres://localhost:5432/cloister';

const sandiAcak = () =>
	'Demo-' + randomBytes(9).toString('base64url').replace(/[-_]/g, 'x') + '-7!';

/* ------------------------------------------------------------------ *
 * Penulis
 * ------------------------------------------------------------------ */

const PENULIS = [
	{
		email: 'arunika@contoh.id',
		sandi: sandiAcak(),
		penName: 'arunika',
		displayName: 'Arunika',
		bio: 'Menulis tiap malam, menerbitkan yang sudah dingin. Sebagian besar tetap di balik dinding.',
		privat: [
			{
				mundur: 1,
				judul: 'Draf yang tidak jadi',
				mood: 3,
				isi: 'Menulis dua halaman lalu menghapus semuanya. Kadang menulis memang cuma cara membuang, bukan menyimpan.'
			},
			{
				mundur: 3,
				judul: '',
				mood: 4,
				isi: 'Tenggat lewat, tulisan terkirim, dan langit sore kebetulan bagus. Tiga hal kecil yang cukup.'
			},
			{
				mundur: 7,
				judul: 'Kios majalah',
				mood: 4,
				isi: 'Kios majalah dekat stasiun masih ada. Penjaganya masih hafal aku suka rubrik yang mana.'
			}
		]
	},
	{
		email: 'kelana@contoh.id',
		sandi: sandiAcak(),
		penName: 'kelana',
		displayName: 'Kelana',
		bio: 'Jalan kaki, kereta pagi, dan catatan pendek-pendek tentang kota.',
		privat: [
			{
				mundur: 2,
				judul: '',
				mood: 3,
				isi: 'Kereta pagi kosong sekali. Aku duduk di gerbong paling depan dan lihat rel bertemu di satu titik.'
			},
			{
				mundur: 5,
				judul: 'Warung baru',
				mood: 5,
				isi: 'Warung soto baru di ujung gang. Kuahnya bening, harganya masuk akal, dan pemiliknya hafal nama pelanggan sejak hari kedua.'
			},
			{
				mundur: 9,
				judul: '',
				mood: 2,
				isi: 'Hujan turun tepat saat aku setengah jalan. Berteduh di halte bersama lima orang asing yang semuanya diam.'
			}
		]
	}
];

/* ------------------------------------------------------------------ *
 * Catatan publik
 * ------------------------------------------------------------------ */

// mundur = hari ke belakang untuk published_at dan entry_date.
// Isi sengaja bergaya jurnal sungguhan: pendek, tenang, tanpa PII.
const PUBLIK = [
	{
		pen: 'arunika',
		mundur: 0,
		mood: 4,
		tags: ['menulis', 'malam'],
		judul: 'Menulis untuk diri yang bulan depan',
		isi: `Aku baca ulang tulisanku bulan lalu dan tidak lagi merasa semarah itu. Kalimat-kalimatnya masih sama; akunya yang sudah bergeser.

Mungkin itu gunanya menulis tiap malam. Bukan supaya diingat orang, tapi supaya ada versi diriku yang bisa kutengok lagi — dan kubandingkan, pelan-pelan, tanpa harus malu.

Tulisan yang ini sengaja kuterbitkan. Sisanya biar tetap di balik dinding.`,
		dibaca: 141,
		reaksi: 12
	},
	{
		pen: 'kelana',
		mundur: 1,
		mood: 3,
		tags: ['kota', 'jalan-kaki'],
		judul: 'Trotoar yang sama, jam yang beda',
		isi: `Pulang kerja aku sengaja turun satu halte lebih awal dan jalan kaki. Trotoar yang sama dengan tadi pagi, tapi rasanya seperti kota yang lain.

Pagi, semua orang berjalan ke arah yang sama. Malam, arah pulangnya bercabang-cabang. Aku suka menghitung: dari sepuluh orang, berapa yang menoleh ke etalase yang menyala.

Malam ini: tiga. Termasuk aku.`,
		dibaca: 96,
		reaksi: 7
	},
	{
		pen: 'arunika',
		mundur: 2,
		mood: 5,
		tags: ['keluarga'],
		judul: 'Dua puluh tiga biji',
		isi: `Ibu menelepon empat puluh menit. Pohon mangga di belakang rumah akhirnya berbuah — dua puluh tiga biji, katanya, dihitung satu-satu sambil menunjuk dari jendela dapur.

Aku tidak banyak cerita tentang diriku, dan Ibu tidak bertanya. Kami sama-sama tahu empat puluh menit itu bukan tentang kabar.

Kadang yang paling melegakan dari pulang bukan rumahnya. Suara yang menghitung mangga satu-satu itu.`,
		dibaca: 203,
		reaksi: 19
	},
	{
		pen: 'kelana',
		mundur: 4,
		mood: 4,
		tags: ['kota', 'orang'],
		judul: 'Penjaga kios yang hafal',
		isi: `Kios koran dekat stasiun itu sudah ada sejak aku SMP. Penjaganya kini memakai kacamata, dan korannya tinggal dua judul.

Tadi pagi aku mampir beli air. Dia bilang, "Tumben jam segini." Aku baru sadar: selama bertahun-tahun lewat, aku pikir aku tidak terlihat.

Kota sebesar ini ternyata menyimpan orang-orang yang diam-diam menghafal kita.`,
		dibaca: 168,
		reaksi: 15
	},
	{
		pen: 'arunika',
		mundur: 6,
		mood: 2,
		tags: ['cemas', 'malam'],
		judul: 'Jam tiga',
		isi: `Tidak bisa tidur sampai jam tiga. Kepala penuh hal yang belum tentu terjadi, dan semuanya terasa mendesak justru karena belum terjadi.

Aku bangun, minum air, lalu menulis daftar kecemasan itu satu-satu. Di kertas, jumlahnya cuma lima. Di kepala tadi rasanya lima puluh.

Menuliskannya tidak menyelesaikan apa pun. Tapi lima itu bisa kupandangi, dan yang bisa dipandangi tidak lagi sebesar itu.`,
		dibaca: 254,
		reaksi: 31
	},
	{
		pen: 'bendi',
		mundur: 8,
		mood: 4,
		tags: ['tenang'],
		judul: 'Delapan menit',
		isi: `Yang paling aku hindari selama tiga minggu ternyata selesai dalam delapan menit.

Percakapan yang kubayangkan berkali-kali — lengkap dengan skenario terburuknya — berjalan biasa saja. Dia mendengarkan, mengangguk, lalu bertanya kabar ibuku.

Aku menulis ini supaya aku yang berikutnya, yang sedang menghindari percakapan lain, ingat: delapan menit, bukan seumur hidup.`,
		dibaca: 187,
		reaksi: 22
	},
	{
		pen: 'kelana',
		mundur: 11,
		mood: 3,
		tags: ['hujan'],
		judul: 'Halte',
		isi: `Hujan turun tepat saat aku setengah jalan pulang. Berteduh di halte bersama lima orang asing.

Tidak ada yang bicara. Satu orang menelepon pelan, satu membaca, sisanya menatap hujan dengan pandangan yang sama: bukan kesal, cuma menunggu.

Lima belas menit yang tidak direncanakan siapa pun, dan anehnya tidak ingin cepat-cepat kuselesaikan.`,
		dibaca: 88,
		reaksi: 6
	},
	{
		pen: 'arunika',
		mundur: 14,
		mood: 4,
		tags: ['menulis', 'tenang'],
		judul: 'Kembang sepatu',
		isi: `Beli kembang sepatu di depan pasar. Penjualnya berpesan jangan disiram siang-siang, katanya daunnya gampang kaget.

Sekarang dia di dekat jendela dapur. Tiap pagi sebelum berangkat aku menengok sebentar — belum berbunga, belum layu, sedang berusaha.

Kurasa itu kabar terbaik yang bisa dimiliki makhluk hidup mana pun.`,
		dibaca: 176,
		reaksi: 24
	},
	{
		pen: 'bendi',
		mundur: 17,
		mood: 5,
		tags: ['kerja', 'lega'],
		judul: 'Ruangan yang tiba-tiba sepi',
		isi: `Selesai juga yang aku tunda tiga minggu. Ternyata bagian paling berat memang bukan mengerjakannya — melainkan tiga minggu membawa-bawanya ke mana-mana.

Setelah terkirim, aku duduk agak lama. Tidak melakukan apa-apa. Rasanya seperti ruangan yang tiba-tiba sepi setelah tamu pulang.

Besok pasti ada tumpukan baru. Tapi malam ini ruangannya kosong, dan aku mau duduk dulu di dalamnya.`,
		dibaca: 132,
		reaksi: 11
	}
];

const KINDS = ['heart', 'hug', 'relate'];
const MOOD_LABEL = { 1: 'Berat', 2: 'Lelah', 3: 'Biasa', 4: 'Baik', 5: 'Lega' };

const pad = (n) => String(n).padStart(2, '0');
function hariLalu(n) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d;
}
const keTanggal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function slugify(judul) {
	return (
		judul
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'tulisan'
	);
}
function makeSlug(judul, seed) {
	const short = createHash('sha256').update(seed).digest('base64url').slice(0, 6);
	return `${slugify(judul)}-${short}`;
}
function excerptOf(md, len = 220) {
	const t = md
		.replace(/[#>*_`~]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return t.length <= len ? t : t.slice(0, len).replace(/\s+\S*$/, '') + '…';
}

/* ------------------------------------------------------------------ *
 * Tahap 1: akun sungguhan lewat browser
 * ------------------------------------------------------------------ */

async function daftarkan(page, p) {
	console.log(`Mendaftar ${p.email} …`);
	await page.goto(`${URL}/daftar`);
	await page.locator('input[type="email"]').fill(p.email);
	await page.locator('input[type="password"]').nth(0).fill(p.sandi);
	await page.locator('input[type="password"]').nth(1).fill(p.sandi);
	await page.getByRole('button', { name: 'Mulai menulis' }).click();

	await page.waitForSelector('[data-testid=gulungan-frasa]', { timeout: 120_000 });
	const frasa = await page.getByTestId('frasa-kata').allTextContents();
	if (frasa.length !== 24) throw new Error(`frasa tidak lengkap (${frasa.length})`);

	await page.getByTestId('gulungan-frasa').evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await page.getByRole('button', { name: 'Lanjut' }).click();
	const uji = page.locator('input[type="text"]');
	for (const [i, n] of [4, 11, 19].entries()) await uji.nth(i).fill(frasa[n - 1]);
	await page.getByRole('button', { name: 'Selesai' }).click();
	await page.waitForURL(/\/(verifikasi|app)/, { timeout: 120_000 });

	for (const e of p.privat) {
		const iso = keTanggal(hariLalu(e.mundur));
		const [y, m, d] = iso.split('-');
		await page.goto(`${URL}/app/${y}/${m}/${d}?baru=1`);
		await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
		if (e.judul) await page.getByPlaceholder('Judul (opsional)').fill(e.judul);
		await page.getByLabel('Isi tulisan').fill(e.isi);
		await page.getByRole('button', { name: MOOD_LABEL[e.mood], exact: true }).click();
		await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
		await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
	}

	// Biarkan mesin sinkronisasi mengirim antreannya.
	await page.goto(`${URL}/app`);
	await page.waitForTimeout(4000);
	return frasa;
}

/* ------------------------------------------------------------------ *
 * Tahap 2: verifikasi, profil, dan catatan publik lewat SQL
 * ------------------------------------------------------------------ */

async function main() {
	const sql = postgres(DB, { max: 1 });
	const browser = await chromium.launch();

	const kredensial = [];

	try {
		for (const p of PENULIS) {
			const [ada] = await sql`SELECT id FROM users WHERE email = ${p.email}`;
			if (ada) {
				console.log(`${p.email} sudah ada, lewati pendaftaran.`);
				continue;
			}
			const page = await browser.newPage({ locale: 'id-ID' });
			const frasa = await daftarkan(page, p);
			await page.close();
			kredensial.push({ ...p, frasa });
		}

		// Verifikasi email dan pasang profil untuk semua penulis feed,
		// termasuk akun utama kalau sudah dibuat seed-sample.
		const profil = [
			...PENULIS,
			{
				email: 'benditandayusaputra@gmail.com',
				penName: 'bendi',
				displayName: 'Bendi',
				bio: 'Membangun Cloister, menulis di dalamnya tiap malam.'
			}
		];

		const idPen = {};
		for (const p of profil) {
			const [u] = await sql`
				UPDATE users SET email_verified_at = now()
				WHERE email = ${p.email} RETURNING id
			`;
			if (!u) {
				console.warn(`Akun ${p.email} belum ada — catatan publiknya dilewati.`);
				continue;
			}
			idPen[p.penName] = u.id;
			await sql`
				INSERT INTO profiles (user_id, pen_name, display_name, bio)
				VALUES (${u.id}, ${p.penName}, ${p.displayName}, ${p.bio})
				ON CONFLICT (user_id) DO UPDATE
				SET pen_name = EXCLUDED.pen_name,
				    display_name = EXCLUDED.display_name,
				    bio = EXCLUDED.bio
			`;
			console.log(`Profil @${p.penName} siap.`);
		}

		let dibuat = 0;
		for (const c of PUBLIK) {
			const userId = idPen[c.pen];
			if (!userId) continue;

			const id = randomUUID();
			const slug = makeSlug(c.judul, id);
			const terbit = hariLalu(c.mundur);
			// Jam terbit dibuat malam hari, jam menulisnya orang sungguhan.
			terbit.setHours(20 + (c.mundur % 3), (c.mundur * 17) % 60, 0, 0);

			const [sudah] = await sql`
				SELECT id FROM public_entries WHERE user_id = ${userId} AND title = ${c.judul}
			`;
			if (sudah) continue;

			await sql`
				INSERT INTO public_entries
					(id, user_id, slug, title, body_md, excerpt, entry_date, mood, theme,
					 pen_name, is_anonymous, visibility, view_count, reaction_count,
					 moderation_state, published_at, updated_at)
				VALUES
					(${id}, ${userId}, ${slug}, ${c.judul}, ${c.isi}, ${excerptOf(c.isi)},
					 ${keTanggal(terbit)}, ${c.mood}, 'flanel', ${c.pen}, false, 'public',
					 ${c.dibaca}, ${c.reaksi}, 'ok', ${terbit}, ${terbit})
			`;

			for (const t of c.tags) {
				await sql`
					INSERT INTO public_tags (public_entry_id, tag) VALUES (${id}, ${t})
					ON CONFLICT DO NOTHING
				`;
			}

			// Baris reaksi sungguhan supaya hitungan di kartu dan di halaman
			// detail tidak saling bertentangan.
			for (let i = 0; i < c.reaksi; i++) {
				await sql`
					INSERT INTO reactions (public_entry_id, actor_hash, kind)
					VALUES (${id}, ${randomBytes(16).toString('hex')}, ${KINDS[i % KINDS.length]})
					ON CONFLICT DO NOTHING
				`;
			}

			dibuat++;
			console.log(`Terbit: "@${c.pen}" — ${c.judul}`);
		}

		console.log(`\n${dibuat} catatan publik dibuat.`);

		if (kredensial.length) {
			const blok = kredensial
				.map((k) =>
					[
						'',
						`AKUN PENULIS FEED — @${k.penName}`,
						'-'.repeat(50),
						`Email    : ${k.email}`,
						`Sandi    : ${k.sandi}`,
						'24 kata  : ' + k.frasa.join(' '),
						''
					].join('\n')
				)
				.join('\n');
			appendFileSync('AKUN-CONTOH.txt', blok);
			console.log(
				existsSync('AKUN-CONTOH.txt')
					? 'Kredensial penulis ditambahkan ke AKUN-CONTOH.txt.'
					: 'AKUN-CONTOH.txt dibuat.'
			);
		}
	} finally {
		await browser.close();
		await sql.end({ timeout: 5 });
	}
}

main().catch((err) => {
	console.error('Gagal:', err);
	process.exit(1);
});
