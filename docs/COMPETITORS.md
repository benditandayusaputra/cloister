# Posisi Cloister terhadap Produk Lain

Dokumen ini ada supaya posisi kami tercatat, bukan sekadar diingat. Menyebut kompetitor sendiri
sebelum ditanya jauh lebih meyakinkan daripada mengklaim segalanya baru.

---

## 1. Lanskap

| Produk | Yang sudah dimiliki | Yang tidak dimiliki |
|---|---|---|
| **Notesnook** | E2EE dengan XChaCha20-Poly1305 dan Argon2, sumber terbuka penuh, server sinkronisasi yang bisa di-self-host, app lock dan vault, serta **Vericrypt** — alat verifikasi yang memakai data asli akun dan berjalan sepenuhnya offline untuk membuktikan catatan benar-benar terenkripsi | Penyaring identitas, ruang publik, identitas visual |
| **Standard Notes** (kini bagian Proton) | E2EE lintas platform, audit independen berkali-kali, tema dan editor kustom | Penyaring identitas, ruang publik, identitas visual |
| **Joplin, Turtl, Laverna, CryptPad** | Enkripsi, sumber terbuka, sinkronisasi ke penyimpanan pihak ketiga | Pengalaman jurnal harian, penyaring identitas |
| **Day One, Journey, Diarium** | Pengalaman jurnal yang matang, lampiran kaya | Zero-knowledge sejati, sumber terbuka |

## 2. Konsekuensi yang harus diterima

**Halaman Bukti bukan ide baru.** Notesnook sudah punya padanannya lewat Vericrypt. Presentasikan
halaman Bukti sebagai standar minimum yang kami anggap wajib, bukan sebagai inovasi.

Kalimat yang dipakai, dan yang juga tertulis apa adanya di halaman `/bukti` itu sendiri:

> Verifikasi semacam ini sudah dilakukan Notesnook lewat Vericrypt. Kami menganggapnya standar
> minimum untuk aplikasi terenkripsi, bukan fitur unggulan.

**Pilihan algoritma juga bukan pembeda.** XChaCha20-Poly1305 dan Argon2id adalah kombinasi yang sama
dengan yang dipakai Notesnook. Yang bisa kami pertahankan adalah *alasan* memilihnya, bukan klaim
bahwa kami yang pertama.

## 3. Pembeda asli

Tinggal tiga, dan ketiganya harus menjadi tulang punggung presentasi.

### 3.1 Penyaring Identitas on-device

Tidak dimiliki Notesnook, Standard Notes, maupun Joplin. Satu-satunya fitur yang benar-benar baru di
ruang ini.

Semua kompetitor melindungi catatan dari server. Tidak satu pun melindungi **orang ketiga yang
disebut di dalam catatan** ketika penulisnya memutuskan menerbitkannya. Itu celah yang nyata: risiko
terbesar dari fitur penerbitan bukan pada server, melainkan pada penggunanya sendiri.

Rincian dan angka evaluasinya di [`REDACTION.md`](REDACTION.md).

### 3.2 Identitas visual papan flanel

Semua kompetitor tampilannya fungsional dan seragam — daftar, kartu putih, sidebar. Tidak ada yang
punya karakter visual.

Ini bukan soal selera. UI/UX bernilai 20% di rubrik penilaian, sama besar dengan Kualitas Kode.
Aplikasi terenkripsi yang tidak menyenangkan dipakai adalah aplikasi yang tidak dipakai, dan
enkripsi pada catatan yang tidak pernah ditulis melindungi nol byte.

### 3.3 Ruang publik dengan batas yang eksplisit

Aplikasi lain hanya punya berbagi tautan. Kombinasi jurnal privat dan ruang publik dalam satu
produk, dengan penyaring identitas berdiri tepat di perbatasannya, adalah milik Cloister sendiri.

Penerbitan diperlakukan sebagai **peristiwa pelepasan klasifikasi**: pengguna memindahkan konten
terpilih dari ranah privat terenkripsi ke ranah publik, sadar, dengan teks peringatan lengkap dan
centang yang tidak pernah tercentang otomatis. Tabel `entries` dan `public_entries` terpisah total
karena tanggung jawabnya memang berbeda.

## 4. Kalimat untuk tanya jawab

> **Apa bedanya dengan Notesnook atau Standard Notes?**
>
> Notesnook memakai kombinasi algoritma yang sama dan bahkan sudah punya alat verifikasi enkripsi
> bernama Vericrypt, jadi halaman Bukti kami adalah standar minimum, bukan inovasi. Yang belum
> dimiliki keduanya ada tiga: penyaring identitas on-device sebelum penerbitan, ruang publik dengan
> batas privat dan publik yang eksplisit, dan identitas visual yang membuat orang biasa mau
> memakainya tiap malam.

## 5. Yang tidak boleh diucapkan

- "Tidak bisa diretas"
- "100% aman"
- "Server kami buta total"
- "Sistem paling aman di Indonesia"
- "Belum ada yang pernah membuat ini"

Ganti dengan pernyataan presisi tentang ancaman apa yang dilindungi arsitektur dan ancaman apa yang
tetap mungkin terjadi. Kalimat rujukan:

> Penyimpanan terenkripsi melindungi dari paparan di sisi server, tetapi tidak bisa mengubah
> perangkat atau browser yang sudah dikompromikan menjadi lingkungan yang tepercaya.
