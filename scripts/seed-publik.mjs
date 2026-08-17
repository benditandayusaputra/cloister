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
 *   Jalankan server dev dengan CAPTCHA_DISABLED=1 supaya kode gambar tidak
 *   menghalangi pendaftaran otomatis, lalu:
 *
 *   node scripts/seed-publik.mjs [--url http://localhost:4820]
 *
 * Seluruh isi sintetis. Tidak ada data orang sungguhan, dan tidak ada PII di
 * catatan publik — produk yang penyaring identitasnya jadi fitur utama tidak
 * pantas punya data demo yang bocor sendiri.
 */
import { chromium } from 'playwright';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { marked } from 'marked';

const arg = (nama, bawaan) => {
	const i = process.argv.indexOf(`--${nama}`);
	return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : bawaan;
};

const URL = arg('url', 'http://localhost:4820');
const DB = process.env.DATABASE_URL ?? 'postgres://localhost:5432/cloister';

const SANDI_DEMO = 'Demo-Cloister-2026!';

/* ------------------------------------------------------------------ *
 * Penulis
 * ------------------------------------------------------------------ */

const PENULIS = [
	{
		email: 'arunika@contoh.id',
		sandi: SANDI_DEMO,
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
		sandi: SANDI_DEMO,
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
	,{
		email: 'saraswati@contoh.id',
		sandi: SANDI_DEMO,
		penName: 'saraswati',
		displayName: 'Saraswati',
		bio: 'Guru SD yang menulis untuk mengingat, bukan untuk dikenang.',
		privat: [
			{ mundur: 1, judul: '', mood: 4, isi: 'Murid-murid hari ini riuh sekali, tapi riuh yang menyenangkan.' },
			{ mundur: 6, judul: 'Rapor', mood: 3, isi: 'Menulis komentar rapor tiga puluh anak. Tanganku pegal, hatiku penuh.' }
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

PUBLIK.push(
	{
		pen: 'saraswati',
		mundur: 0,
		mood: 5,
		tags: ['sekolah', 'anak'],
		judul: 'Tiga puluh nama',
		isi: `Menjelang pembagian rapor, aku menulis komentar untuk tiga puluh anak. Aturan yang kupegang: satu kalimat tentang angka, dua kalimat tentang orangnya.

Karena sepuluh tahun lagi, tidak ada yang ingat nilai matematikanya. Yang mereka ingat: ada yang pernah memperhatikan.

Tanganku pegal. Hatiku penuh. 🌱`,
		dibaca: 221,
		reaksi: 27
	},
	{
		pen: 'kelana',
		mundur: 3,
		mood: 4,
		tags: ['kota', 'kereta'],
		judul: 'Gerbong paling depan',
		isi: `Kereta pagi kosong. Aku duduk di gerbong paling depan dan memandang rel bertemu di satu titik yang tidak pernah benar-benar sampai.

## Yang kuperhatikan pagi ini

- Masinis menyapa petugas peron dengan dua jari
- Ada yang tertidur sebelum kereta berangkat
- Kabut tipis di atas sawah, hilang sebelum stasiun ketiga

Kota ini punya banyak cara memberi tahu bahwa hari baru saja mulai.`,
		dibaca: 143,
		reaksi: 14
	},
	{
		pen: 'arunika',
		mundur: 4,
		mood: 3,
		tags: ['menulis', 'rutinitas'],
		judul: 'Ritual sebelum menulis',
		isi: `Orang sering tanya bagaimana caranya menulis tiap malam. Jawabannya membosankan: ritual.

| Jam | Ritual | Lama |
| --- | --- | --- |
| 21.30 | Matikan notifikasi | 1 menit |
| 21.35 | Seduh teh, bukan kopi | 5 menit |
| 21.45 | Tulis apa saja tanpa hapus | 15 menit |

Tabelnya kaku, prosesnya tidak. Yang penting kursinya diduduki. ✍️`,
		dibaca: 189,
		reaksi: 21
	},
	{
		pen: 'bendi',
		mundur: 5,
		mood: 4,
		tags: ['teknis', 'privasi'],
		judul: 'Daftar periksa sebelum menerbitkan',
		isi: `Kebiasaan kecil sebelum menekan tombol Terbitkan:

- [x] Baca ulang sekali, pelan
- [x] Cek nama orang lain — sudah kuubah jadi inisial?
- [x] Jalankan Penyaring Identitas
- [ ] Ragu? Simpan dulu semalam

Kotak terakhir sengaja tidak pernah kucentang. Keraguan adalah fitur, bukan bug. ✅`,
		dibaca: 167,
		reaksi: 19
	},
	{
		pen: 'saraswati',
		mundur: 9,
		mood: 2,
		tags: ['hujan', 'sekolah'],
		judul: 'Upacara batal',
		isi: `Hujan deras sejak subuh. Upacara batal, anak-anak berlarian dari gerbang ke teras dengan tas di atas kepala.

Aku berdiri di pintu kelas memegang handuk kecil, mengeringkan kepala satu-satu yang lewat. Ada yang bilang terima kasih, ada yang cuma nyengir.

Hari yang basah. Bukan hari yang buruk. 🌧️`,
		dibaca: 154,
		reaksi: 18
	},
	{
		pen: 'kelana',
		mundur: 13,
		mood: 5,
		tags: ['makanan', 'kota'],
		judul: 'Peta soto pribadi',
		isi: `Lima tahun di kota ini, aku akhirnya punya peta soto pribadi:

1. **Soto pak tua dekat stasiun** — kuah paling bening, buka jam lima pagi
2. **Warung ujung gang** — sambalnya juara, pemiliknya hafal nama
3. **Gerobak depan kantor pos** — bukan yang terenak, tapi yang paling setia

Kota jadi rumah bukan karena alamat. Karena peta-peta kecil seperti ini. 🍜`,
		dibaca: 176,
		reaksi: 23
	},
	{
		pen: 'arunika',
		mundur: 16,
		mood: 4,
		tags: ['keluarga'],
		judul: 'Resep tanpa takaran',
		isi: `Minta resep ayam goreng ke Ibu. Jawabannya: "bumbunya secukupnya, gorengnya sampai kuning cantik."

> Secukupnya itu berapa, Bu?
> "Ya sampai baunya benar."

Kutulis di sini supaya tidak hilang: masakan Ibu tidak pernah punya takaran, hanya punya perasaan. Mungkin itu kenapa tidak pernah bisa kutiru persis. 🧡`,
		dibaca: 243,
		reaksi: 31
	},
	{
		pen: 'bendi',
		mundur: 20,
		mood: 3,
		tags: ['malam', 'tenang'],
		judul: 'Jam sebelas malam',
		isi: `Papan flanel ini kubayangkan menyala di ruangan yang lampunya cuma satu, jam sebelas malam.

Bukan kantor kreatif yang terang benderang. Ruang kecil tempat orang jujur pada dirinya sendiri sebelum tidur.

Kalau kamu membaca ini jam sebelas malam: selamat menulis. Dindingnya tebal. 🌙`,
		dibaca: 198,
		reaksi: 26
	}
);

PUBLIK.push(
	{
		pen: 'kelana',
		mundur: 2,
		mood: 5,
		tags: ['kopi', 'pagi'],
		judul: 'Kopi tubruk dan ampas yang mengendap',
		isi: `Pagi ini kopi tubruk lagi. Bukan yang cepat larut — yang harus ditunggu ampasnya turun sebelum boleh diminum.

![Segelas kopi tubruk dengan ampas mengendap di dasar](/demo/kopi.webp)

Menunggu ampas itu tiga menit paling jujur dalam sehari. Tidak ada yang bisa dipercepat, tidak ada yang perlu dilakukan. Cuma duduk, cuma menunggu, cuma pagi.

_Foto: Gunawan Kartapranata, Wikimedia Commons, CC BY-SA 3.0._`,
		dibaca: 212,
		reaksi: 24
	},
	{
		pen: 'arunika',
		mundur: 7,
		mood: 5,
		tags: ['perjalanan', 'bali'],
		judul: 'Terasering di Tegallalang',
		isi: `Setelah tiga bulan menunda, akhirnya berdiri di tepi sawah bertingkat itu. Fotonya sudah sering kulihat; yang tidak pernah kulihat adalah suaranya — air yang turun dari petak ke petak, pelan, tanpa henti.

![Sawah terasering hijau berundak di Tegallalang, Ubud](/demo/sawah.webp)

Petani di bawah tidak menoleh ke turis di atas. Dia punya urusan yang lebih tua dari kami semua.

_Foto: Yurianto76, Wikimedia Commons, CC BY-SA 4.0._`,
		dibaca: 298,
		reaksi: 35
	},
	{
		pen: 'saraswati',
		mundur: 10,
		mood: 4,
		tags: ['batik', 'sekolah'],
		judul: 'Parang klithik di kelas empat',
		isi: `Hari Batik. Aku bawa kain parang klithik warisan nenek ke kelas, dan meminta anak-anak menebak apa yang mereka lihat.

![Kain batik motif parang klithik dengan garis-garis diagonal berulang](/demo/batik.webp)

"Ombak, Bu." "Keris." "Pisang goreng!" Yang terakhir dapat tepuk tangan paling ramai.

Motif ini dulu hanya boleh dipakai keluarga keraton. Sekarang dipandangi tiga puluh anak sambil menebak pisang goreng. Kupikir nenek akan setuju: begitulah cara warisan tetap hidup. 🌸

_Foto: Alteaven, Wikimedia Commons, CC BY-SA 3.0._`,
		dibaca: 187,
		reaksi: 22
	},
	{
		pen: 'kelana',
		mundur: 15,
		mood: 3,
		tags: ['hujan', 'pantai'],
		judul: 'Sebentar lagi hujan',
		isi: `Langit di atas Wediombo menggelap dari arah laut. Semua orang di pantai tahu apa yang akan datang, dan tidak ada yang bergegas.

![Langit mendung gelap menggantung di atas pantai Wediombo, Yogyakarta](/demo/hujan.webp)

Ada jeda sebelum hujan yang tidak bisa dibeli: angin berubah arah, bau garam menguat, dan semua percakapan mengecil. Aku menutup buku dan menunggu bersama yang lain. 🌧️

_Foto: Agung Purnoatmojo, Wikimedia Commons, CC BY-SA 4.0._`,
		dibaca: 164,
		reaksi: 19
	},
	{
		pen: 'bendi',
		mundur: 19,
		mood: 3,
		tags: ['kota', 'kereta', 'kerja'],
		judul: 'Enam gerbong menuju hari yang sama',
		isi: `Commuter line jam tujuh. Enam gerbong, satu arah, ribuan hari yang berbeda dibawa ke tempat yang sama.

![Rangkaian kereta commuter line berhenti di peron stasiun](/demo/kereta.webp)

Aku selalu berdiri dekat pintu supaya bisa lihat peron lewat. Kebiasaan bodoh — tidak ada yang kutunggu di peron mana pun. Tapi rasanya seperti tetap punya pilihan untuk turun.

_Foto: Muhammad Pascal Fajrin, Wikimedia Commons, CC BY-SA 4.0._`,
		dibaca: 141,
		reaksi: 16
	},
	{
		pen: 'saraswati',
		mundur: 23,
		mood: 5,
		tags: ['makanan', 'keluarga'],
		judul: 'Mendoan sore dan kopi tubruk bapak',
		isi: `Pulang kampung sehari. Belum juga duduk, bapak sudah menaruh sepiring mendoan dan kopi tubruk di meja teras. Tidak bertanya mau atau tidak — di rumah ini pertanyaan seperti itu tidak pernah ada.

![Sepiring tempe mendoan hangat bersama segelas kopi tubruk di meja](/demo/mendoan.webp)

Kami tidak banyak bicara. Mendoan habis, kopi tinggal ampas, matahari turun di balik pohon rambutan. Semua kabar yang tidak sempat diucapkan sudah tersampaikan lewat piring yang kosong. ☕

_Foto: Hersy ardianty a, Wikimedia Commons, CC BY-SA 4.0._`,
		dibaca: 233,
		reaksi: 29
	}
);

PUBLIK.push(
	{
		pen: 'kelana',
		mundur: 9,
		mood: 4,
		tags: ['perjalanan', 'kereta', 'panjang'],
		judul: 'Sehari penuh di kereta ke timur',
		isi: `Aku selalu bilang ingin naik kereta ekonomi jarak jauh sekali seumur hidup, bukan pesawat, bukan kereta eksekutif yang jendelanya tidak bisa dibuka. Minggu lalu akhirnya kulakukan: sepuluh jam dari stasiun kota ke ujung timur pulau, satu tas punggung, satu buku yang akhirnya tidak terbaca sama sekali.

![Kereta commuter melaju di jalur rel dengan langit cerah](/demo/kereta.webp)

## Jam lima pagi

Stasiun jam lima pagi punya suaranya sendiri. Bukan sepi, tapi belum ramai: roda koper di lantai, pengumuman yang terdengar seperti diucapkan dari dalam kaleng, penjual kopi sachet yang sudah hafal peron mana yang menunggu paling lama. Aku duduk di kursi nomor 12A, dekat jendela, di sebelah bapak-bapak yang membawa dua kardus rambutan yang katanya untuk cucunya.

Kereta berangkat tepat waktu. Aku sempat kaget, karena entah kenapa aku selalu mengira kereta ekonomi itu identik dengan terlambat. Ternyata yang terlambat itu aku, yang masih membawa gambaran kereta dari dua puluh tahun lalu.

## Yang kupelajari dari sepuluh jam duduk

Beberapa hal yang tidak akan kudapat kalau naik pesawat:

1. Sawah berganti warna setiap satu jam. Hijau muda, hijau tua, kuning, lalu tanah gembur yang baru dibajak. Kalau kamu duduk cukup lama, kamu bisa melihat kalender bertani satu provinsi lewat dari jendela.
2. Orang di kereta ekonomi mengobrol. Bukan basa-basi: bapak sebelahku bercerita tentang cucunya yang baru bisa berdiri, ibu di seberang bercerita tentang toko kelontongnya yang tutup dan buka lagi. Aku tidak bertanya apa-apa; cerita itu datang sendiri, seperti stasiun kecil yang dilewati tanpa berhenti.
3. Ada jam-jam yang benar-benar kosong. Sekitar jam sebelas siang, semua orang tertidur, kereta berjalan pelan, dan aku sadar sudah setahun lebih aku tidak pernah benar-benar tidak melakukan apa-apa selama satu jam penuh.

## Bekal yang berguna dan yang tidak

| Barang | Berguna? | Catatan |
| --- | --- | --- |
| Buku tebal | Tidak | Jendela lebih menarik dari halaman mana pun |
| Botol minum 1 liter | Sangat | Air di kereta ada, tapi antre |
| Jaket tipis | Sangat | AC ekonomi sekarang dingin sekali |
| Powerbank | Lumayan | Colokan ada, tapi direbutkan |
| Kacang rebus dari peron | Sangat | Jadi alasan mengobrol dengan tetangga kursi |

## Sampai di ujung timur

Kereta masuk stasiun terakhir jam empat sore. Kakiku pegal, punggungku pegal, tapi ada perasaan yang tidak pernah kudapat dari bandara: aku benar-benar merasa sudah *menempuh* jarak, bukan sekadar berpindah. Sepuluh jam itu terasa seperti sepuluh jam, dan itu justru hadiahnya.

Malamnya aku menulis catatan ini di kamar penginapan sambil mendengar suara kereta lain lewat, dan aku sudah tahu: tahun depan aku akan naik yang lebih jauh lagi.

_Foto: Muhammad Pascal Fajrin, Wikimedia Commons, CC BY-SA 4.0._`,
		dibaca: 412,
		reaksi: 47
	},
	{
		pen: 'saraswati',
		mundur: 12,
		mood: 4,
		tags: ['sekolah', 'mengajar', 'panjang'],
		judul: 'Setahun mengajar tiga puluh anak: yang tidak diajarkan di kampus',
		isi: `Tahun ajaran baru saja tutup. Rapor sudah dibagikan, bangku sudah ditumpuk di pojok, papan tulis sudah dihapus untuk terakhir kalinya oleh anak yang paling suka menghapus papan tulis. Aku duduk sendirian di kelas yang kosong dan mencoba menulis apa yang sebenarnya kupelajari setahun ini, karena kalau tidak ditulis sekarang, minggu depan semuanya akan terasa biasa saja.

## 1. Anak yang paling ribut biasanya paling takut ketinggalan

Bulan pertama aku menghabiskan tenaga untuk menenangkan satu anak yang tidak bisa diam. Bulan ketiga aku sadar dia ribut persis di saat pelajaran mulai sulit. Ributnya bukan tantangan, tapi cara dia bilang "aku tidak paham" tanpa harus mengucapkannya di depan teman-temannya. Begitu aku duduk di sebelahnya lima menit sebelum pelajaran mulai, ributnya berkurang setengah. Bukan hilang, tapi setengah itu sudah mengubah suasana satu kelas.

## 2. Pujian yang spesifik lebih awet daripada pujian yang besar

"Bagus sekali!" hilang dalam sepuluh detik. "Kamu tadi mengecek ulang jawabanmu sebelum dikumpulkan, itu kebiasaan yang bagus" masih diingat anak itu tiga bulan kemudian, dan dia melakukannya lagi. Aku belajar berhemat dengan kata "hebat" dan boros dengan kalimat yang menyebut persis apa yang dilakukan.

## 3. Orang tua tidak butuh laporan, mereka butuh satu cerita

Setiap pertemuan orang tua aku dulu menyiapkan angka: nilai rata-rata, kehadiran, ranking. Yang mereka tanyakan setelah itu selalu sama: "Anak saya di kelas gimana, Bu?" Sekarang aku menyiapkan satu cerita kecil per anak. Bukan yang dramatis, cukup satu momen yang kulihat sendiri. Pertemuan yang tadinya lima menit dan kaku jadi lima belas menit dan hangat.

## 4. Kelas punya cuaca

Ada hari-hari ketika seluruh kelas berat tanpa alasan yang jelas: hujan sejak subuh, ada anak yang orang tuanya bertengkar, ada ulangan di jam sebelumnya. Aku dulu melawan cuaca itu dengan menaikkan suara. Sekarang aku menurunkan target: hari berat, materinya setengah, sisanya bercerita. Anehnya, materi yang setengah itu justru lebih nempel.

## 5. Yang kuingat dari setahun ini bukan pelajarannya

Yang kuingat adalah:

- Anak yang membawa bekal dua porsi karena tahu temannya sering tidak bawa.
- Hari ketika seluruh kelas diam-diam belajar lagu untuk ulang tahunku, dan menyanyikannya dengan nada yang salah semua.
- Kalimat di rapor yang kutulis ulang tiga kali supaya tidak menyakiti tapi tetap jujur.
- Anak paling pendiam yang di hari terakhir menyodorkan surat, lalu lari sebelum aku sempat membukanya.

## Catatan untuk diriku tahun depan

Kelas baru, tiga puluh nama baru. Aku akan lupa sebagian besar yang kutulis di atas, karena begitulah otak bekerja. Jadi kutulis di sini, kuterbitkan, dan kutandai supaya bisa kubaca lagi bulan Juli tahun depan, sehari sebelum masuk sekolah.

Untuk yang juga mengajar dan membaca ini: tahunmu bagaimana?`,
		dibaca: 389,
		reaksi: 52
	},
	{
		pen: 'arunika',
		mundur: 6,
		mood: 3,
		tags: ['tidur', 'refleksi', 'panjang'],
		judul: 'Surat untuk diriku yang belum bisa tidur',
		isi: `Aku menulis ini jam setengah dua pagi, dan kalau kamu membacanya, kemungkinan besar kamu juga sedang tidak bisa tidur. Jadi ini bukan tulisan tentang tips tidur. Tulisan tentang tips tidur biasanya ditulis orang yang bisa tidur.

## Apa yang sebenarnya terjadi jam segini

Kepala yang tidak mau berhenti bukan kepala yang rusak. Ia sedang melakukan pekerjaannya: menyortir hari yang belum selesai disortir. Masalahnya, siang hari kita tidak memberinya waktu. Rapat, pesan, jalanan, layar. Kepala baru dapat giliran bicara ketika semua yang lain akhirnya diam, dan itu jam segini.

Aku dulu memusuhi jam-jam ini. Sekarang aku mencoba memperlakukannya seperti tamu yang datang terlalu malam: tidak kuusir, tapi juga tidak kubuatkan kopi. Cukup kudengarkan sebentar, kutulis apa yang dia bawa, lalu kubilang, "Sudah kucatat. Besok kita bahas."

## Tiga hal yang selalu kutulis

Setiap kali terbangun seperti ini, aku menulis tiga hal saja. Bukan jurnal panjang, cuma tiga baris:

1. **Apa yang membuatku terjaga.** Kadang jelas (pekerjaan besok), kadang bukan apa-apa yang bisa disebut. Kalau bukan apa-apa, kutulis "bukan apa-apa" dan anehnya itu menenangkan.
2. **Satu hal yang hari ini berjalan cukup baik.** Kecil saja. Bus datang tepat waktu. Nasi tidak gosong. Ada teman yang membalas pesan dengan emoji yang tepat.
3. **Satu hal yang boleh menunggu sampai besok.** Ini yang paling penting. Menuliskannya seperti memberi izin pada kepala untuk berhenti mengingatkan.

Setelah tiga baris itu, aku menutup catatan. Kadang lima belas menit kemudian aku tidur. Kadang tidak, dan aku membaca buku sampai jendela terang. Keduanya tidak apa-apa. Yang berubah bukan durasi tidurnya, tapi rasa bersalah karena tidak tidur, dan ternyata rasa bersalah itulah yang paling melelahkan.

## Kenapa kutulis di sini, bukan di kepala

Karena kepala tidak punya tombol simpan. Ia akan memutar hal yang sama sampai yakin kamu tidak akan lupa, dan satu-satunya cara meyakinkannya adalah menuliskannya di tempat yang benar-benar aman, yang tidak akan dibaca siapa pun, yang tidak perlu dirapikan dulu supaya pantas dibaca. Catatan jam dua pagi memang tidak pernah pantas dibaca. Justru itu gunanya.

## Untuk kamu yang membaca ini jam segini

Tidak ada yang salah denganmu. Malam ini panjang, tapi ia akan selesai seperti semua malam sebelumnya. Kalau mau, tulis tiga barismu sekarang. Lalu matikan layar ini, dan biarkan besok jadi urusan besok.

Selamat malam, atau selamat pagi. Yang mana pun yang datang lebih dulu.`,
		dibaca: 527,
		reaksi: 61
	},
	{
		pen: 'bendi',
		mundur: 5,
		mood: 4,
		tags: ['produktivitas', 'otak-kedua', 'panjang'],
		judul: 'Cara aku memakai catatan ini sebagai otak kedua',
		isi: `Beberapa orang bertanya bagaimana aku memakai Cloister selain untuk buku harian. Jawabannya: sebagian besar catatanku justru bukan buku harian. Ini sistem yang kupakai setahun terakhir, kutulis di sini supaya bisa kubaca ulang setiap kali sistemnya mulai berantakan (dan pasti berantakan lagi).

## Prinsipnya satu: semua masuk dulu, dirapikan belakangan

Otak kedua yang gagal biasanya gagal karena terlalu rapi di awal. Folder, sub-folder, tag yang harus dipilih sebelum boleh menulis. Akhirnya menulis jadi pekerjaan, dan pekerjaan ditunda.

Di sini aku cuma punya satu aturan: kalau ada yang lewat di kepala dan sayang kalau hilang, buka hari ini, tulis, tutup. Tag boleh diisi nanti, atau tidak sama sekali. Pencarian sudah cukup pintar untuk menemukannya lagi.

## Empat jenis catatan yang kupelihara

| Jenis | Contoh | Seberapa sering dibaca ulang |
| --- | --- | --- |
| Harian | Apa yang terjadi, apa yang terasa | Jarang, tapi paling berharga setahun kemudian |
| Kutipan & ide | Kalimat dari buku, ide proyek, pertanyaan | Tiap minggu, saat mencari bahan |
| Referensi | Nomor penting, langkah setup, resep | Saat butuh saja, tapi harus cepat ketemu |
| Ulasan | Ulasan bulanan dan tahunan | Tiap awal bulan |

Yang membuat empat jenis ini bisa hidup di satu tempat: semuanya terenkripsi. Aku tidak perlu berpikir dua kali menaruh nomor rekening di sebelah catatan tentang hari yang buruk. Keduanya sama-sama tidak bisa dibaca siapa pun selain aku.

## Ritual mingguan lima belas menit

Setiap Minggu malam:

- [x] Buka papan bulan ini, lihat warna pin. Kalau merah semua, itu sinyal, bukan kebetulan.
- [x] Cari tag \`ide\` dari minggu ini, pindahkan satu yang paling menarik ke daftar "coba bulan depan".
- [x] Baca satu catatan acak dari setahun lalu. Ini bagian favoritku; hampir selalu ada yang lucu.
- [ ] Bersihkan tag yang cuma dipakai sekali. (Yang ini sering kulewati, dan tidak apa-apa.)

## Yang kuterbitkan dan yang tidak

Dari ratusan catatan, yang kuterbitkan bisa dihitung jari. Sisanya bukan rahasia besar; hanya belum selesai, atau memang cuma untukku. Penyaring Identitas membantu di sini: setiap kali mau menerbitkan, ia mengingatkan nama siapa yang ikut terseret. Kadang aku baru sadar sebuah cerita bukan sepenuhnya milikku untuk dibagikan.

## Kalau mau mencoba

Mulai dari satu jenis saja. Kalau kamu tipe yang suka mengumpulkan kutipan, mulai dari itu. Kalau kamu tipe yang butuh tempat menaruh nomor dan kata sandi, mulai dari tabel referensi. Buku hariannya akan datang sendiri, biasanya di malam yang aneh, ketika kamu sudah terbiasa membuka aplikasi ini untuk hal lain.`,
		dibaca: 301,
		reaksi: 38
	}
);

const KOMENTAR = [
	{
		judul: 'Tiga puluh nama',
		utas: [
			{ pen: 'arunika', isi: 'Dua kalimat tentang orangnya — kuambil prinsip ini untuk tulisanku juga. Terima kasih, Bu Guru. 🙏' },
			{ pen: 'saraswati', balas: 0, isi: 'Silakan! Anak-anak (dan orang dewasa) tumbuh dari yang diperhatikan, bukan dari yang dinilai.' },
			{ pen: 'kelana', isi: 'Guru SD-ku dulu menulis "suka menolong teman" di raporku. Masih kuingat sampai sekarang — kamu benar soal sepuluh tahun itu.' }
		]
	},
	{
		judul: 'Peta soto pribadi',
		utas: [
			{ pen: 'saraswati', isi: 'Nomor dua itu di gang mana?? Demi ilmu pengetahuan. 🍜' },
			{ pen: 'kelana', balas: 0, isi: 'Rahasia dapur kota 😄 Petunjuknya: cari gang yang antre sebelum jam tujuh.' },
			{ pen: 'bendi', isi: 'Peta-peta kecil seperti ini yang bikin kota jadi rumah — setuju sekali.' }
		]
	},
	{
		judul: 'Resep tanpa takaran',
		utas: [
			{ pen: 'bendi', isi: '"Sampai baunya benar" adalah dokumentasi teknis terbaik yang pernah kubaca.' },
			{ pen: 'arunika', balas: 0, isi: 'Dan tidak bisa di-versioning 😄 Terima kasih sudah mampir!' }
		]
	},
	{
		judul: 'Daftar periksa sebelum menerbitkan',
		utas: [
			{ pen: 'arunika', isi: 'Kotak terakhir yang tidak pernah dicentang itu bijak. Kuadopsi mulai malam ini.' },
			{ pen: 'bendi', balas: 0, isi: 'Semoga membantu — keraguan semalam lebih murah daripada penyesalan setahun.' }
		]
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
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^\s*\|?\s*:?-{2,}.*$/gm, '')
		.replace(/^\s*_Foto:.*$/gm, '')
		.replace(/(^|\n)\s*(?:[-*+]\s+\[[ xX]\]|[-*+]|\d+\.)\s+/g, '$1')
		.replace(/\|/g, ' ')
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

	const hasil = await Promise.race([
		page.waitForSelector('[data-testid=gulungan-frasa]', { timeout: 120_000 }).then(() => 'frasa'),
		page
			.locator('.toast')
			.filter({ hasText: /sudah|terdaftar|dipakai/i })
			.first()
			.waitFor({ timeout: 120_000 })
			.then(() => 'ada')
	]);
	if (hasil === 'ada') return null;
	const frasa = await page.getByTestId('frasa-kata').allTextContents();
	if (frasa.length !== 24) throw new Error(`frasa tidak lengkap (${frasa.length})`);

	await page.getByTestId('gulungan-frasa').evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await page.getByRole('button', { name: 'Lanjut' }).click();
	const uji = page.locator('input[type="text"]');
	for (const [i, n] of [4, 11, 19].entries()) await uji.nth(i).fill(frasa[n - 1]);
	await page.getByRole('button', { name: 'Selesai' }).click();
	const akhir = await Promise.race([
		page.waitForURL(/\/(verifikasi|app)/, { timeout: 120_000 }).then(() => 'masuk'),
		page
			.locator('.toast')
			.filter({ hasText: /sudah terdaftar|sudah dipakai/i })
			.first()
			.waitFor({ timeout: 120_000 })
			.then(() => 'ada')
	]);
	if (akhir === 'ada') return null;

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

	await page.goto(`${URL}/app`);
	await page.waitForTimeout(4000);
	return frasa;
}

function simpanKredensial(daftar) {
	const blok = daftar
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
}

function frasaDariFile(email) {
	if (!existsSync('AKUN-CONTOH.txt')) return null;
	const teks = readFileSync('AKUN-CONTOH.txt', 'utf8');
	const blok = teks.split(/\n(?=AKUN PENULIS FEED — @)/).find((b) => b.includes(`Email    : ${email}`));
	const m = blok?.match(/24 kata\s*:\s*([a-z ]+)/);
	if (!m) return null;
	const kata = m[1].trim().split(/\s+/);
	return kata.length === 24 ? kata : null;
}

async function bukaSesiPenulis(page, p) {
	const kata = frasaDariFile(p.email);
	if (!kata) return false;
	console.log(`Membuka sesi ${p.email} lewat 24 kata …`);
	await page.goto(`${URL}/pulih`);
	await page.locator('input[type="email"]').fill(p.email);
	const kotak = page.locator('input[type="text"]');
	for (let i = 0; i < 24; i++) await kotak.nth(i).fill(kata[i]);
	await page.locator('input[type="password"]').fill(p.sandi);
	await page.getByRole('button', { name: /Buka tulisanku/ }).click();
	await page.waitForURL(/\/app/, { timeout: 180_000 });
	await page.waitForTimeout(3000);
	return true;
}

async function tunggu(page) {
	for (let i = 0; i < 60; i++) {
		await page.waitForTimeout(700);
		const t = await page.evaluate(() => document.body.innerText.slice(0, 300));
		if (!/memuat…/i.test(t)) return;
	}
}

async function terbitkanLewatBrowser(page, c, iso) {
	const [y, m, d] = iso.split('-');
	await page.goto(`${URL}/app/${y}/${m}`);
	await tunggu(page);
	await page.getByRole('button', { name: /Lewati/ }).click({ timeout: 2000 }).catch(() => {});
	const kartuDenganJudul = () =>
		page.locator('article.kartu-papan', { hasText: c.judul }).locator('[data-testid="kartu-buka"]').first();
	if ((await kartuDenganJudul().count()) === 0) {
		await page.goto(`${URL}/app/${y}/${m}/${d}?baru=1`);
		await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
		await page.getByRole('button', { name: /Lewati/ }).click({ timeout: 2000 }).catch(() => {});
		const editor = page.getByLabel('Isi tulisan');
		await editor.waitFor({ timeout: 60_000 });
		await page.getByPlaceholder('Judul (opsional)').fill(c.judul);
		await editor.click();
		const html = marked.parse(c.isi, { async: false, gfm: true, breaks: true });
		await page.evaluate((h) => {
			const dt = new DataTransfer();
			dt.setData('text/html', h);
			const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
			document.querySelector('[aria-label="Isi tulisan"]').dispatchEvent(ev);
		}, html);
		await page.waitForTimeout(500);
		await page.getByRole('button', { name: MOOD_LABEL[c.mood], exact: true }).click();
		for (const t of c.tags) {
			const inTag = page.getByPlaceholder(/tag/i).first();
			await inTag.fill(t);
			await page.keyboard.press('Enter');
		}
		await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
		await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
		await page.waitForTimeout(800);
	}
	await kartuDenganJudul().waitFor({ timeout: 30_000 });
	await kartuDenganJudul().dispatchEvent('click');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/, { timeout: 30_000 });
	const tombolTerbit = page.getByRole('button', { name: 'Terbitkan ke halaman publik' });
	const sudahTerbit = page.getByRole('button', { name: 'Perbarui versi publik' });
	await Promise.race([
		tombolTerbit.waitFor({ timeout: 30_000 }),
		sudahTerbit.waitFor({ timeout: 30_000 })
	]);
	if (await sudahTerbit.count()) return;
	await tombolTerbit.click({ timeout: 30_000 });
	await page.getByText('Penyaring Identitas').first().waitFor({ timeout: 30_000 });
	await page.getByText('Saya mengerti tulisan ini keluar dari enkripsi').click({ timeout: 10_000 });
	const paparan = page.getByText('Penyaring menemukan informasi yang bisa mengarah ke orang tertentu');
	if (await paparan.count()) await paparan.click();
	await page.getByRole('button', { name: 'Terbitkan', exact: true }).click();
	await page.locator('.toast').filter({ hasText: /Terbit/ }).first().waitFor({ timeout: 30_000 });
	await page.waitForTimeout(800);
}

/* ------------------------------------------------------------------ *
 * Tahap 2: verifikasi, profil, dan catatan publik lewat SQL
 * ------------------------------------------------------------------ */

async function main() {
	const sql = postgres(DB, { max: 1, prepare: false });
	const browser = await chromium.launch();

	const kredensial = [];
	const halaman = {};

	try {
		for (const p of PENULIS) {
			let [ada] = await sql`SELECT id FROM users WHERE lower(email) = lower(${p.email})`;
			if (!ada) [ada] = await sql`SELECT id FROM users WHERE lower(email) = lower(${p.email})`;
			if (ada || frasaDariFile(p.email)) {
				console.log(`${p.email} sudah ada, lewati pendaftaran.`);
				const page = await browser.newPage({ locale: 'id-ID' });
				if (await bukaSesiPenulis(page, p)) halaman[p.penName] = page;
				else await page.close();
				continue;
			}
			const page = await browser.newPage({ locale: 'id-ID' });
			const frasa = await daftarkan(page, p);
			if (!frasa) {
				console.log(`${p.email} ternyata sudah terdaftar, membuka sesi lewat 24 kata.`);
				if (await bukaSesiPenulis(page, p)) halaman[p.penName] = page;
				else await page.close();
				continue;
			}
			halaman[p.penName] = page;
			kredensial.push({ ...p, frasa });
			simpanKredensial([{ ...p, frasa }]);
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

			const page = halaman[c.pen];
			if (page) {
				let berhasil = false;
				for (let coba = 0; coba < 3 && !berhasil; coba++) {
					try {
						await terbitkanLewatBrowser(page, c, keTanggal(terbit));
						berhasil = true;
					} catch (err) {
						console.warn(`Ulang "${c.judul}" (${coba + 1}): ${String(err.message).slice(0, 90)}`);
						await page.reload().catch(() => {});
						await page.waitForTimeout(4000);
					}
				}
				if (!berhasil) throw new Error(`Gagal menerbitkan "${c.judul}" setelah 3 percobaan`);
				const [baris] = await sql`
					SELECT id FROM public_entries WHERE user_id = ${userId} AND title = ${c.judul}
					ORDER BY published_at DESC LIMIT 1
				`;
				if (!baris) {
					console.warn(`Gagal menemukan hasil terbit "${c.judul}"`);
					continue;
				}
				await sql`
					UPDATE public_entries
					SET entry_date = ${keTanggal(terbit)}, published_at = ${terbit}, updated_at = ${terbit},
					    view_count = ${c.dibaca}, reaction_count = ${c.reaksi}, moderation_state = 'ok'
					WHERE id = ${baris.id}
				`;
				for (let i = 0; i < c.reaksi; i++) {
					await sql`
						INSERT INTO reactions (public_entry_id, actor_hash, kind)
						VALUES (${baris.id}, ${randomBytes(16).toString('hex')}, ${KINDS[i % KINDS.length]})
						ON CONFLICT DO NOTHING
					`;
				}
				dibuat++;
				console.log(`Terbit lewat aplikasi: "@${c.pen}" — ${c.judul}`);
				continue;
			}

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

		let komentarDibuat = 0;
		for (const grup of KOMENTAR) {
			const [entri] = await sql`
				SELECT id, user_id FROM public_entries WHERE title = ${grup.judul} LIMIT 1
			`;
			if (!entri) continue;
			const idUtas = [];
			for (const k of grup.utas) {
				const userId = idPen[k.pen];
				if (!userId) continue;
				const [sudah] = await sql`
					SELECT id FROM comments WHERE public_entry_id = ${entri.id} AND body = ${k.isi} LIMIT 1
				`;
				if (sudah) {
					idUtas.push(sudah.id);
					continue;
				}
				const idKomentar = randomUUID();
				const parentId = typeof k.balas === 'number' ? (idUtas[k.balas] ?? null) : null;
				await sql`
					INSERT INTO comments (id, public_entry_id, user_id, parent_id, body)
					VALUES (${idKomentar}, ${entri.id}, ${userId}, ${parentId}, ${k.isi})
				`;
				idUtas.push(idKomentar);
				komentarDibuat++;
			}
		}
		console.log(`${komentarDibuat} komentar dibuat.`);

		console.log(`\n${dibuat} catatan publik dibuat.`);

		if (kredensial.length) {
			console.log(`Kredensial ${kredensial.length} penulis ada di AKUN-CONTOH.txt.`);
		}
	} finally {
		for (const page of Object.values(halaman)) {
			await page.goto(`${URL}/app`).catch(() => {});
			await page.waitForTimeout(3000);
			await page.close().catch(() => {});
		}
		await browser.close();
		await sql.end({ timeout: 5 });
	}
}

main().catch((err) => {
	console.error('Gagal:', err);
	process.exit(1);
});
