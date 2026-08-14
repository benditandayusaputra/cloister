/**
 * Membuat akun contoh berisi tulisan.
 *
 * Entri dienkripsi di perangkat, jadi tidak bisa disemai lewat SQL — skrip ini
 * menjalankan browser sungguhan supaya kriptografinya berjalan seperti biasa.
 *
 *   node scripts/seed-sample.mjs --email kamu@contoh.id [--url http://localhost:4820] [--sandi ...]
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const arg = (nama, bawaan) => {
	const i = process.argv.indexOf(`--${nama}`);
	return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : bawaan;
};

/** Sandi bawaan diacak per jalan: apa pun yang tertulis di sini jadi publik. */
const sandiAcak = () =>
	'Contoh-' + randomBytes(12).toString('base64url').replace(/[-_]/g, 'x') + '-9!';

const URL = arg('url', 'http://localhost:4820');
const EMAIL = arg('email', '');
const SANDI = arg('sandi', sandiAcak());

if (!EMAIL) {
	console.error('Wajib: --email kamu@contoh.id');
	process.exit(1);
}

const pad = (n) => String(n).padStart(2, '0');
const hariLalu = (n) => {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** mundur = berapa hari ke belakang dari hari ini. */
const ENTRI = [
	{
		mundur: 0,
		judul: 'Akhirnya jadi juga',
		mood: 5,
		tags: ['kerja', 'lega'],
		isi: `Selesai juga yang aku tunda tiga minggu. Ternyata bagian paling berat memang bukan mengerjakannya.\n\nAku duduk agak lama setelahnya, tidak melakukan apa-apa. Rasanya seperti ruangan yang tiba-tiba sepi setelah tamu pulang.`
	},
	{
		mundur: 1,
		judul: '',
		mood: 3,
		tags: ['jakarta'],
		isi: `Jalan kaki dari kantor sampai stasiun. Lampu jalannya sudah diganti, warnanya lebih putih dari yang dulu.\n\nTrotoarnya lebar sekarang. Aku sempat berhenti dua kali tanpa alasan.`
	},
	{
		mundur: 2,
		judul: 'Hujan dari sore',
		mood: 3,
		tags: ['hujan', 'rumah'],
		isi: `Hujan dari sore sampai malam. Aku duduk di lantai dekat jendela sampai kopi dingin, tidak menulis apa-apa, cuma dengar.\n\nAda yang lewat bawa kardus di kepala. Aku pikir, semua orang di luar sana sedang menuju sesuatu, dan aku sedang tidak. Malam ini itu terasa boleh saja.`
	},
	{
		mundur: 4,
		judul: 'Ketemu Rani',
		mood: 4,
		tags: ['teman'],
		isi: `Ketemu Rani setelah dua tahun. Dia bilang aku kelihatan lebih tenang. Aku belum tahu itu benar atau cuma karena aku lebih banyak diam sekarang.\n\nKami makan sampai tempatnya mau tutup. Dia cerita soal pindah kerja, aku cerita soal tidak pindah ke mana-mana.`
	},
	{
		mundur: 6,
		judul: '',
		mood: 2,
		tags: ['kerja', 'capek'],
		isi: `Rapat pagi molor tiga jam. Pulang naik ojek, aku marah ke orang yang salah lagi.\n\nAku minta maaf lewat chat, dibalas stiker. Selesai untuk dia, belum untuk aku.`
	},
	{
		mundur: 8,
		judul: 'Nelpon Ibu',
		mood: 5,
		tags: ['keluarga', 'rumah'],
		isi: `Nelpon Ibu empat puluh menit. Dia cerita pohon mangga di belakang akhirnya berbuah, dua puluh tiga biji, dihitung satu-satu.\n\nAku tidak cerita apa-apa tentang diriku dan itu tidak jadi masalah.`
	},
	{
		mundur: 11,
		judul: '',
		mood: 2,
		tags: ['malam', 'cemas'],
		isi: `Tidak bisa tidur sampai jam tiga. Kepala penuh hal yang belum tentu terjadi.\n\nAku hitung napas sampai empat puluh, lalu lupa hitungannya, lalu mulai lagi.`
	},
	{
		mundur: 15,
		judul: 'Beres-beres lemari',
		mood: 4,
		tags: ['rumah'],
		isi: `Beres-beres lemari. Nemu tiket konser 2019 di saku jaket, aku simpan lagi di tempat yang sama.\n\nAda empat kaus yang sudah tidak muat dan aku tetap lipat rapi.`
	},
	{
		mundur: 20,
		judul: 'Delapan menit, bukan seumur hidup',
		mood: 5,
		tags: ['kerja', 'tenang'],
		isi: `Hari ini aku tidak menghindar dari satu pun percakapan. Aku catat supaya besok ingat rasanya.\n\nYang paling aku hindari selama tiga minggu adalah bicara dengan Bu Ratna soal laporan yang telat. Setiap kali dia lewat, aku menunduk ke layar.\n\nTernyata delapan menit. Dia dengar, dia bilang laporannya bisa masuk Jumat, lalu dia tanya kabar ibuku. Selesai.`
	},
	{
		mundur: 26,
		judul: '',
		mood: 4,
		tags: ['rumah', 'tenang'],
		isi: `Beli kembang sepatu di depan pasar. Penjualnya bilang jangan disiram siang-siang.\n\nSekarang taruh di dekat jendela dapur. Aku lihat tiap pagi sebelum berangkat.`
	},
	{
		mundur: 34,
		judul: 'Kartu ATM ketelan',
		mood: 2,
		tags: ['jakarta', 'uang'],
		isi: `Kartu ATM ketelan mesin. Antre satu jam di bank, ternyata mesinnya memang sering begitu.\n\nPetugasnya minta maaf enam kali. Aku yang jadi tidak enak.`
	},
	{
		mundur: 41,
		judul: 'Pak Yanto',
		mood: 4,
		tags: ['kerja', 'teman'],
		isi: `Ngobrol sama Pak Yanto satpam kantor soal anaknya yang mau masuk SMK. Dia hafal semua jurusan dan biayanya.\n\nDia bilang anaknya mau jadi teknisi AC karena kerjanya pasti ada terus. Aku setuju dan tidak sedang basa-basi.`
	},
	{
		mundur: 55,
		judul: '',
		mood: 3,
		tags: ['sendiri', 'tenang'],
		isi: `Minggu. Tidur siang dua jam, bangun bingung ini hari apa.\n\nTidak ada yang mencari. Untuk sekali ini, itu terasa seperti libur, bukan seperti sepi.`
	},
	{
		mundur: 68,
		judul: 'Akhir bulan',
		mood: 5,
		tags: ['tenang', 'kerja'],
		isi: `Akhir bulan. Aku baca ulang tulisan bulan lalu dan tidak lagi merasa semarah itu.\n\nTulisan itu tetap aku simpan. Bukan untuk dibaca orang, untuk dibaca aku yang bulan depan.`
	},
	{
		mundur: 82,
		judul: '',
		mood: 3,
		tags: ['hujan', 'malam'],
		isi: `Hujan lagi. Kali ini aku keluar dan berdiri di teras sampai lengan basah.\n\nTetangga sebelah nyalakan lampu, lihat aku, lalu tidak jadi bertanya.`
	}
];

const MOOD_LABEL = { 1: 'Berat', 2: 'Lelah', 3: 'Biasa', 4: 'Baik', 5: 'Lega' };

async function main() {
	const browser = await chromium.launch();
	const page = await browser.newPage({ locale: 'id-ID', viewport: { width: 1400, height: 950 } });

	console.log(`Mendaftar ${EMAIL} di ${URL} …`);
	await page.goto(`${URL}/daftar`);
	await page.locator('input[type="email"]').fill(EMAIL);
	await page.locator('input[type="password"]').nth(0).fill(SANDI);
	await page.locator('input[type="password"]').nth(1).fill(SANDI);
	await page.getByRole('button', { name: 'Mulai menulis' }).click();

	await page.waitForSelector('[data-testid=gulungan-frasa]', { timeout: 120_000 });
	const frasa = await page.getByTestId('frasa-kata').allTextContents();
	if (frasa.length !== 24) throw new Error(`frasa pemulihan tidak lengkap (${frasa.length})`);

	await page.getByTestId('gulungan-frasa').evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await page.getByRole('button', { name: 'Lanjut' }).click();
	const uji = page.locator('input[type="text"]');
	for (const [i, n] of [4, 11, 19].entries()) await uji.nth(i).fill(frasa[n - 1]);
	await page.getByRole('button', { name: 'Selesai' }).click();
	await page.waitForURL(/\/(verifikasi|app)/, { timeout: 120_000 });
	console.log('Akun dibuat, kunci disiapkan di perangkat.');

	for (const [i, e] of ENTRI.entries()) {
		const iso = hariLalu(e.mundur);
		const [y, m, d] = iso.split('-');
		await page.goto(`${URL}/app/${y}/${m}/${d}?baru=1`);
		await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);

		if (e.judul) await page.getByPlaceholder('Judul (opsional)').fill(e.judul);
		await page.getByLabel('Isi tulisan').fill(e.isi);
		await page.getByRole('button', { name: MOOD_LABEL[e.mood], exact: true }).click();

		const medanTag = page.getByLabel('Tag').last();
		for (const t of e.tags) {
			await medanTag.fill(t);
			await page.keyboard.press('Enter');
		}

		await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
		await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
		console.log(`  ${i + 1}/${ENTRI.length}  ${iso}  ${e.judul || '(tanpa judul)'}`);
	}

	// Beri kesempatan putaran sinkronisasi terakhir menyelesaikan push.
	await page.goto(`${URL}/app`);
	await page.waitForTimeout(6000);

	const catatan = [
		'AKUN CONTOH CLOISTER',
		'='.repeat(50),
		'',
		`Alamat   : ${URL}/masuk`,
		`Email    : ${EMAIL}`,
		`Sandi    : ${SANDI}`,
		'',
		`Catatan  : ${ENTRI.length} catatan tersebar di ~3 bulan terakhir`,
		'',
		'24 KATA PEMULIHAN',
		'-'.repeat(50),
		...frasa.map((w, i) => `${String(i + 1).padStart(2)}. ${w}`),
		'',
		'Ini satu-satunya cara membuka tulisan kalau sandi lupa.',
		'Server tidak menyimpan salinannya. Simpan file ini di tempat aman,',
		'atau hapus setelah kamu catat sendiri.',
		''
	].join('\n');

	writeFileSync('AKUN-CONTOH.txt', catatan);
	await browser.close();

	console.log(`\n${catatan}`);
	console.log('Disimpan ke AKUN-CONTOH.txt (tidak ikut ter-commit).');
}

main().catch((err) => {
	console.error('Gagal:', err.message);
	process.exit(1);
});
