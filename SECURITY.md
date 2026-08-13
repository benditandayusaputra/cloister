# Kebijakan Keamanan

## Melaporkan kerentanan

Jangan buka issue publik untuk masalah keamanan.

Kirim ke **security@cloister.example** (ganti dengan alamat asli saat fork). Sertakan langkah
reproduksi, dampak yang kamu perkirakan, dan versi atau commit yang diuji.

Kami membalas dalam 72 jam dan menargetkan perbaikan dalam 90 hari sebelum disclosure publik.

## Cakupan

**Di dalam cakupan:**

- Kebocoran plaintext jurnal ke server dalam bentuk apa pun
- XSS, CSRF, atau bypass CSP di halaman aplikasi
- Kesalahan implementasi kriptografi di `src/lib/crypto/`
- Bypass otorisasi antar akun
- Bypass batasan transfer perangkat (PIN, TTL, jumlah percobaan)
- Enumerasi akun lewat perbedaan respons

**Di luar cakupan:**

- Serangan yang butuh akses fisik ke perangkat yang sudah tidak terkunci
- Rekayasa sosial terhadap pengguna
- Laporan pemindai otomatis tanpa dampak nyata
- Kekurangan yang sudah kami catat sendiri di model ancaman internal

## Yang kami janjikan dan tidak

Kami **tidak** mengklaim bahwa aplikasi web bisa melindungi kamu dari operator server yang mengirim
kode jahat. Itu keterbatasan mendasar, dan kami menuliskannya terbuka di halaman `/privasi` dan
`/keamanan` alih-alih menyembunyikannya. Kalau model ancamanmu mencakup itu, self-host.

## Aturan review kode kripto

Semua perubahan pada `src/lib/crypto/` butuh persetujuan dua maintainer (lihat `CODEOWNERS`) dan
harus lulus `pnpm test` termasuk seluruh test vector di `tests/crypto-vectors/`.

Format terenkripsi tidak boleh berubah tanpa menaikkan `schema_version` dan menyediakan jalur
migrasi.
