# Panduan Demonstrasi

Untuk juri yang ingin mencoba sendiri, dan untuk tim yang menyiapkan sesi live 10 menit.

---

## 1. Akun demo

Kredensial akun demo ada di berkas `AKUN-CONTOH.txt` yang **tidak ikut masuk repositori** (ia ada di
`.gitignore` dengan sengaja — sandi yang dikomit adalah sandi yang bocor). Berkas itu dilampirkan
terpisah bersama formulir pengumpulan, dan URL produksinya ada di README.

Untuk membuat akun demo baru dengan data sintetis:

```bash
pnpm dev                                              # terminal 1
node scripts/seed-sample.mjs --email demo@contoh.id   # terminal 2
```

Skrip menjalankan peramban sungguhan, mendaftar, lalu menulis 15 catatan tersebar di tiga bulan
terakhir. Ia harus begitu: catatan dienkripsi di perangkat, jadi tidak bisa disemai lewat SQL.
Sandi diacak setiap kali dijalankan dan ditulis ke `AKUN-CONTOH.txt` bersama 24 kata pemulihannya.

**Data demo seluruhnya sintetis.** Tidak boleh ada satu pun tulisan pribadi sungguhan saat
penjurian.

## 2. Yang bisa dicoba tanpa akun

| Halaman | Isi |
|---|---|
| `/` | Halaman muka, penjelas arsitektur, tabel "yang kami simpan dan yang tidak" |
| `/baca` | Feed catatan publik |
| `/keamanan` | Hierarki kunci dan model ancaman versi ringkas |
| `/privasi` | Ditulis dalam bahasa manusia, bukan bahasa hukum |

`/bukti` butuh login karena ia menampilkan baris basis data milik pengguna sendiri.

## 3. Skenario 10 menit

| Waktu | Aksi | Yang harus dipahami juri |
|---|---|---|
| 0:00–0:45 | Masalah, satu kalimat inti produk, penjelasan nama | Kenyamanan awan tidak seharusnya mewajibkan isi privat terbaca berada di peladen |
| 0:45–2:00 | Buka papan yang sudah berisi. Tulis satu catatan sintetis yang sensitif | Produk benar-benar dapat dipakai dan punya identitas visual yang berbeda |
| 2:00–3:30 | Buka `/bukti`. Tiga panel, lalu tombol "Coba buka dengan kunci salah" | Privasi adalah sifat arsitektur, bukan janji kebijakan |
| 3:30–5:00 | **Matikan wifi di depan juri.** Tulis, sunting, cari. Tutup aplikasi, buka lagi | Aplikasi tidak bergantung peladen untuk penggunaan dasar |
| 5:00–5:45 | Nyalakan jaringan, tunjukkan antrean terkirim | Awan adalah replika terenkripsi, bukan satu-satunya sumber kebenaran |
| 5:45–7:00 | Terbitkan catatan yang memuat nomor HP dan alamat. Penyaring Identitas menyala. Tunjukkan tab Network kosong | AI dipakai untuk melindungi, dan dijalankan di perangkat. Ini pembeda asli |
| 7:00–8:15 | Sambungkan perangkat kedua dengan QR dan PIN memakai HP sungguhan | Siklus hidup kunci benar-benar diimplementasikan |
| 8:15–9:00 | Ganti tema, tunjukkan tampilan di lebar HP | Kualitas antarmuka dan responsivitas |
| 9:00–10:00 | Slide arsitektur, slide hierarki kunci, slide dampak, penutup | Tim memahami keputusan desain dan siap mempertahankannya |

**Pembukaan:**

> Jurnal pribadi dapat memuat informasi paling sensitif yang pernah kita tulis. Kami ingin
> menghadirkan sinkronisasi awan tanpa meminta pengguna percaya bahwa peladen tidak akan pernah
> membaca catatan mereka. Karena itu Cloister dirancang agar isi privat berhenti di perangkat
> pengguna. Cloister sendiri berarti ruang berdinding tempat orang menulis. Apa yang ditulis di
> dalamnya tidak terlihat dari luar dinding.

**Penutup:**

> Cloister tidak hanya meminta pengguna mempercayai janji bahwa kami tidak membaca catatan privat.
> Arsitekturnya dirancang agar peladen tidak membutuhkan kemampuan itu sejak awal.

## 4. Kalimat sensitif untuk demo Penyaring Identitas

Salin apa adanya. Semua nilai di bawah sintetis; nomor kartu memakai nomor uji publik.

```
Kemarin ketemu Rina di kosnya di Jl. Kaliurang No. 14, Sleman.
Dia cerita soal utangnya ke bank, nomor rekeningnya 1234567897 kalau mau transfer.
WA dia 081234567890, emailnya rina.kartika@contoh.id.
```

Yang akan terlihat: alamat, nomor rekening, nomor HP, surel, dan nama orang, dengan skor paparan di
kategori merah. Tunjukkan tab Network yang tetap kosong selama pemindaian.

## 5. Rencana cadangan

| Kalau ini gagal | Lakukan ini |
|---|---|
| Jaringan Zoom putus saat demo | Putar rekaman video cadangan yang sudah disiapkan |
| Peladen produksi bermasalah | Jalankan `pnpm dev` lokal; seluruh alur demo tidak butuh internet kecuali bagian sinkronisasi |
| Basis data tidak terjangkau | Alur offline tetap penuh: tulis, baca, sunting, cari, ganti tema, Penyaring Identitas |
| HP kedua tidak mau memindai QR | Pakai kode manual 20 karakter yang tersedia di layar yang sama |
| Argon2id lambat di perangkat demo | Kalibrasi otomatis sudah menurunkan parameter; sebutkan itu sebagai fitur, karena memang begitu |

Latih demo minimal lima kali tanpa membaca naskah. Hadir di Zoom sepuluh menit sebelum jadwal,
kamera aktif, screen share diuji lebih dulu.

## 6. Yang wajib bisa dijawab seluruh anggota tim

- Kenapa XChaCha20-Poly1305, bukan AES-GCM
- Kenapa Argon2id, bukan bcrypt atau PBKDF2
- Hierarki kunci dari sandi sampai ciphertext catatan
- Apa yang terjadi kalau sandi lupa dan 24 kata hilang
- Kenapa XSS adalah ancaman paling serius, dan apa saja lapis mitigasinya
- Batas antara privat dan publik, dan kenapa moderasi hanya berlaku di sisi publik
- Posisi Cloister terhadap Notesnook dan Standard Notes ([`COMPETITORS.md`](COMPETITORS.md))

Prinsip menjawab: setiap jawaban yang menyentuh batas keamanan diawali dengan pengakuan batas, baru
mitigasi. "Ya, XSS meruntuhkan jaminan ini, karena itu kami melakukan A, B, C" terdengar jauh lebih
menguasai daripada "aplikasi kami aman".
