# ADR 0004 — Observability tanpa layanan pelacakan galat pihak ketiga

Status: diterima
Tanggal: 2026-08-12

## Konteks

Aplikasi produksi butuh cara mengetahui apa yang rusak di perangkat pengguna. Jalur standar untuk itu
adalah SDK pelacakan galat (Sentry dan sejenisnya) yang mengirim stack trace, breadcrumb, state
komponen, dan sering kali session replay.

Pada aplikasi biasa itu wajar. Pada Cloister, setiap jalur itu adalah jalur keluar untuk isi catatan:

- Breadcrumb merekam nilai input, dan input di sini adalah tulisan harian orang.
- State komponen pada layar editor **adalah** isi catatan.
- Session replay merekam layar, dan layar sedang menampilkan catatan yang sudah didekripsi.
- Pesan galat sering memuat potongan data yang menyebabkannya.

Memasang SDK semacam itu berarti membangun arsitektur zero-knowledge lalu meletakkan pipa langsung
dari plaintext ke peladen pihak ketiga. Konfigurasi ketat bisa mengurangi risikonya, tapi ia menjadi
sesuatu yang harus terus dijaga benar, dan satu regresi diam-diam sudah cukup untuk membatalkan
seluruh janji produk.

## Keputusan

Tidak memakai layanan pelacakan galat pihak ketiga sama sekali. Sebagai gantinya:

1. **Log galat lokal.** Galat dicatat ke IndexedDB, maksimal 200 entri rolling, berisi stack trace,
   versi build, dan nama rute. Isi catatan, judul, dan tag tidak pernah ikut.
2. **Pengiriman manual dengan pratinjau.** Tombol "Kirim laporan galat" menampilkan **persis** apa
   yang akan dikirim, dalam bentuk teks yang bisa dibaca dan disunting pengguna sebelum menekan
   kirim.
3. **Metrik agregat tanpa identitas.** Peladen mencatat kode galat per endpoint dan latensi p50 dan
   p95. Tidak ada ID pengguna, tidak ada payload.
4. **Uptime monitoring eksternal** hanya terhadap endpoint kesehatan publik.

Analitik mengikuti aturan yang sama: tidak ada di `/app`. Kalau suatu saat dibutuhkan, hanya Umami
yang di-host sendiri, dan hanya di halaman pemasaran dan halaman publik.

## Alasan

Privasi di produk ini adalah sifat arsitektur, bukan kebijakan. Kebijakan yang berbunyi "kami
mengonfigurasi SDK-nya dengan hati-hati" adalah tepat jenis janji yang seluruh produk ini dibangun
untuk tidak perlu diminta dari pengguna.

## Konsekuensi

- **Kemampuan debugging turun secara nyata.** Bug yang hanya muncul di satu perangkat dan tidak
  dilaporkan penggunanya kemungkinan besar tidak akan pernah kami lihat. Ini diterima secara sadar.
- Kompensasinya digeser ke sisi yang tidak melanggar batas: cakupan tes yang lebih tinggi, vektor
  uji kriptografi tetap, tes E2E lintas peramban, dan pesan galat yang cukup jelas supaya pengguna
  bisa melaporkannya sendiri dengan kata-katanya.
- Tidak ada dasbor yang memberi tahu kami masalah lebih dulu dari pengguna. Waktu tanggap bergantung
  pada laporan manusia.
- `connect-src` di CSP tetap bisa berbunyi `'self'` tanpa pengecualian, yang memperkuat mitigasi
  XSS di T5.
