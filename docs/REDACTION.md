# Penyaring Identitas

Fitur yang menjawab subtema **AI untuk Keamanan Informasi** tanpa merusak tesis privasi produk:
model berjalan di perangkat, tidak ada teks yang dikirim ke layanan mana pun, dan tidak ada satu
pun request jaringan selama pemindaian.

Kode: [`src/lib/redact/`](../src/lib/redact/). Evaluasi: [`tests/redaction-eval/`](../tests/redaction-eval/).

---

## 1. Masalah yang diselesaikan

Risiko terbesar dari fitur penerbitan bukan pada server, melainkan pada penggunanya sendiri. Orang
menulis

> Kemarin ketemu Rina di kosnya di Jl. Kaliurang No. 14, Sleman. Dia cerita soal utangnya ke bank,
> nomor rekeningnya 1234567897 kalau mau transfer. WA dia 081234567890.

lalu menekan Terbitkan tanpa sadar bahwa kalimat itu memaparkan orang ketiga yang tidak pernah
memberi persetujuan. Enkripsi tidak menolong di sini: penerbitan memang keluar dari enkripsi atas
permintaan pengguna sendiri.

## 2. Kapan berjalan

Otomatis saat modal Terbitkan dibuka, **sebelum** apa pun dikirim ke server. Yang dipindai adalah
teks polos hasil `plainTeks(markdown)`, bukan markdown mentah, supaya sintaks tautan dan penekanan
tidak melahirkan positif palsu.

## 3. Lapis 1 — pola terstruktur

Presisi tinggi, nol ketergantungan model. Prinsipnya: **presisi lebih penting daripada cakupan.**
Penyaring yang meneriaki setiap angka 16 digit akan dimatikan pengguna dalam seminggu, dan penyaring
yang dimatikan menyaring nol persen. Karena itu hampir semua pola divalidasi ulang setelah cocok.

| Jenis | Validasi tambahan setelah regex cocok |
|---|---|
| NIK | Kode provinsi 11–94, kabupaten dan kecamatan bukan nol, tanggal 1–31 (atau +40 untuk perempuan), bulan 1–12, nomor urut bukan nol. Mundur kalau kalimatnya menyebut kartu dan angkanya lolos Luhn |
| NPWP | Format bertitik langsung diterima. 15–16 digit polos butuh kata "NPWP" di sekitarnya, supaya tidak berebut dengan NIK |
| Kartu kredit | Wajib lolos algoritma Luhn. Ditolak kalau bentuknya nomor seluler Indonesia, atau kalau ia 16 digit yang lolos struktur NIK dan kalimatnya tidak menyebut kartu |
| Nomor rekening | Wajib didahului "rekening", "rek", "no rek", "a.n.", atau "virtual account" dalam 24 karakter |
| Nomor HP | `(\+62\|62\|0)8[1-9]…`, dua varian: rapat dan berspasi |
| Email | RFC 5322 sederhana |
| Akun media sosial | Domain yang dikenali (`instagram.com`, `tiktok.com`, `wa.me`, `t.me`, `linkedin.com`, …) plus pola `@handle` |
| Alamat | Kata kunci ("Jl.", "Jalan", "Gg.", "Perumahan", "Blok", "RT/RW", "Kel.", "Kec.", "Desa") **dan** angka di dalamnya, atau token berikutnya berhuruf besar. Tanpa syarat kedua, "jalan memutar supaya bisa lewat taman" ikut tertangkap |
| Koordinat | Pasangan desimal, wajib berada di dalam rentang wilayah Indonesia |
| Plat nomor | Wajib ada pemicu kata ("plat", "nopol", "mobil", "motor", "kendaraan", "parkir", "stnk") di sekitarnya. Tanpa ini, "BAB 2 A" dan "RT 3 RW" ikut tertangkap |
| Tanggal lahir | Tahun 1930 sampai tahun ini dikurangi 5, **dan** kata "lahir", "ultah", atau "kelahiran" dalam 48 karakter |

Saat dua temuan menempati potongan teks yang sama, yang membungkus menang. Tanpa aturan ini, nomor
HP di dalam `wa.me/62812…` akan menggantikan tautan media sosialnya hanya karena bobot jenisnya
lebih tinggi.

## 4. Lapis 2 — pengenal entitas bernama

Mengenali nama orang (PER), nama tempat (LOC), dan nama organisasi (ORG) lewat leksikon dan tata
aturan konteks: sapaan yang hampir selalu diikuti nama ("Mbak", "Pak", "Bang"), kata kerja sosial
("ketemu", "diantar", "curhat sama"), penanda organisasi ("PT", "Universitas", "RS"), gazetteer nama
tempat Indonesia, dan daftar kata berhuruf besar yang bukan nama diri.

Berjalan di Web Worker terpisah supaya modal tidak membeku. Kalau worker gagal dibuat — browser
lama, mode privat yang ketat, memori tipis — pemindaian jatuh ke thread utama dan panel di modal
menyebut jalur mana yang sedang dipakai, bukan diam-diam mati.

### Kenapa bukan model ONNX

PRD versi awal membayangkan model NER terkuantisasi int8 lewat Transformers.js. Itu dilepas dengan
sadar, dan PRD 34.5 memang mengizinkan berhenti di lapis 1 kalau angkanya tidak memenuhi syarat.
Tiga alasannya:

1. **Anggaran unduhan 80 MB bertabrakan dengan janji "berfungsi penuh tanpa jaringan".** Alur demo
   mematikan wifi di depan juri. Fitur yang butuh unduhan sekali pun adalah fitur yang bisa gagal
   di saat paling salah.
2. **Bobot model perlu dilayani dari origin sendiri supaya `connect-src 'self'` tetap utuh.**
   Melonggarkan CSP demi satu fitur adalah pertukaran yang buruk di aplikasi yang seluruh premisnya
   adalah ketahanan terhadap XSS (lihat T5 di `THREAT-MODEL.md`).
3. **Evaluasi awal NER bahasa Indonesia untuk nama panggilan dan nama tidak lazim ada di bawah
   ambang yang kami tetapkan sendiri.**

Titik sambungnya dijaga: `pindaiEntitas(teks)` menerima teks dan mengembalikan `Temuan[]`, jadi
mesin lain bisa menggantikannya tanpa menyentuh satu pun pemanggilnya.

**Yang tidak boleh diklaim:** ini bukan model neural. Antarmuka menyebutnya "pengenal entitas",
bukan "AI", dan panel transparansi di modal menyebut jalur mana yang benar-benar berjalan.

## 5. Skor Paparan

| Jenis temuan | Bobot |
|---|---|
| NIK, NPWP, kartu kredit, nomor rekening | 30 |
| Nomor HP, email, akun media sosial, alamat, koordinat | 20 |
| Plat nomor, tanggal lahir | 15 |
| Nama orang | 10 |
| Nama organisasi | 8 |
| Nama tempat | 5 |

| Total | Kategori | Tampilan |
|---|---|---|
| 0 | Bersih | Paku hijau |
| 1–29 | Perlu dilihat | Paku kuning |
| 30 ke atas | Sebaiknya disunting | Paku merah, butuh centang tambahan |

Temuan lapis 2 dikalikan keyakinannya sebelum dijumlahkan. Lapis 1 memakai validator keras, jadi
bobot penuhnya bisa dipertanggungjawabkan; lapis 2 menebak, dan tebakan lemah tidak boleh mendorong
catatan yang sebenarnya bersih ke kategori merah.

**Skor tidak pernah memblokir penerbitan.** Kategori merah hanya meminta satu centang tambahan, dan
centang itu gugur sendiri begitu pengguna menyunting salah satu temuan. Cloister memberi informasi;
keputusannya tetap milik pengguna.

## 6. Tindakan yang ditawarkan

| Tindakan | Contoh |
|---|---|
| Sensor | `0812-3456-7890` → `███████████` |
| Inisial | `Rina Kartika` → `R.K.` |
| Ganti generik | `Rina` → `seorang teman`, `Jl. Kaliurang No. 14` → `sebuah alamat` |
| Biarkan | Ditandai sudah ditinjau |

**Penyuntingan hanya berlaku pada salinan publik.** Catatan privat yang asli tidak pernah disentuh.
Seluruh `src/lib/redact/sunting.ts` bekerja pada string dan mengembalikan string baru; tidak ada satu
pun jalur yang menulis balik ke IndexedDB.

Penerapan ke markdown dilakukan berbasis potongan teks, bukan indeks. Ini konservatif dengan sengaja:
kalau potongan tidak ditemukan apa adanya di markdown, ia dilewati, dan pengguna melihat teks aslinya
di preview alih-alih hasil sunting yang salah tempat.

## 7. Hasil evaluasi

Dataset: 200 kalimat sintetis berbahasa Indonesia bergaya jurnal harian, dianotasi tangan —
100 mengandung PII, 100 bersih. Semua angka, nama, dan alamat di dalamnya dibuat-buat; nomor kartu
memakai nomor uji publik yang lolos Luhn dan tidak pernah diterbitkan penerbit mana pun.

Jalankan sendiri: `pnpm test tests/redaction-eval`

| Metrik | Target PRD | Hasil |
|---|---|---|
| Recall lapis 1 pada kalimat ber-PII | > 90% | **100,0%** (100/100) |
| Ketepatan jenis temuan | — | **100,0%** (106/106 anotasi) |
| Positif palsu lapis 1 pada kalimat bersih | — | **0** dari 100 |
| Kalimat bersih yang naik ke kategori merah karena lapis 2 | 0 | **0** |

**Caveat yang wajib disebut kalau angka ini dipresentasikan:** dataset ini kami tulis sendiri.
Angka setinggi ini wajar untuk dataset yang disusun oleh pihak yang sama dengan penulis polanya,
dan ia **tidak** memprediksi performa pada tulisan orang lain. Yang bisa diklaim jujur adalah:
polanya berperilaku seperti yang dirancang, dan regresi akan tertangkap CI. Yang tidak bisa diklaim
adalah bahwa penyaring ini menangkap 100% PII di dunia nyata.

## 8. Keterbatasan yang wajib didokumentasikan

- Pengenal entitas bahasa Indonesia jauh lebih lemah daripada bahasa Inggris. Nama tidak lazim,
  nama panggilan, dan singkatan sering terlewat.
- Regex punya positif palsu (angka yang kebetulan berbentuk NIK) dan negatif palsu (nomor HP yang
  ditulis dengan pemisah tidak lazim, misalnya `0812.3456.7890`).
- Penyaring hanya melihat teks. Wajah di lampiran, metadata yang tersisa, dan gaya menulis yang
  khas tidak tersentuh.
- **Ini alat bantu, bukan jaminan.** Kalimat ini muncul di antarmuka, bukan hanya di dokumentasi.

Menyampaikan keterbatasan secara terbuka menaikkan nilai di tanya jawab. Peserta yang mengklaim
akurasi sempurna akan runtuh pada pertanyaan pertama.

## 9. Bukti bahwa pemindaian berjalan lokal

1. Buka tab Network, bersihkan, jalankan pemindaian. Tidak ada request keluar.
2. Matikan jaringan sepenuhnya, jalankan pemindaian. Tetap berjalan.
3. Panel di modal menyebut jalur yang dipakai ("Web Worker terpisah" atau "thread utama") dan
   menyatakan tidak ada teks yang dikirim ke mana pun.
4. [`tests/unit/redact-offline.test.ts`](../tests/unit/redact-offline.test.ts) menegakkan hal yang
   sama secara otomatis: ia membaca seluruh sumber di `src/lib/redact/` dan menolak `fetch(`,
   `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `importScripts`, `EventSource`, dan URL absolut;
   lalu menjalankan pemindaian sungguhan dengan keempat API itu diganti jebakan yang melempar.

## 10. Saklar pengguna

Pengaturan → Catatan publik menyediakan saklar untuk mematikan lapis 2 secara permanen. Lapis 1
tidak bisa dimatikan: ia murah, presisinya tinggi, dan mematikannya berarti menghapus satu-satunya
perlindungan otomatis di perbatasan privat dan publik.
