# Kebijakan Keamanan

Cloister adalah jurnal pribadi dengan privasi kriptografis, dikembangkan sebagai karya untuk
**Kompetisi Web Development FTI Festival 2026** dan dirilis terbuka di bawah AGPL-3.0.

Karena seluruh premis produk ini adalah bahwa server tidak dapat membaca catatan privat, laporan
kerentanan diperlakukan sebagai masukan paling berharga yang bisa kami terima — termasuk laporan
yang datang dari dewan juri.

## Melaporkan kerentanan

**Jangan buka issue publik untuk masalah keamanan.**

Kirim ke **benditandayusaputra@gmail.com** dengan subjek diawali `[KEAMANAN]`, atau lewat
[GitHub Security Advisory](https://github.com/benditandayusaputra/cloister/security/advisories/new).

Sertakan langkah reproduksi, dampak yang kamu perkirakan, dan versi atau commit yang diuji.

Kami membalas dalam 72 jam dan menargetkan perbaikan dalam 90 hari sebelum disclosure publik.
Pelapor diberi atribusi kalau menghendaki.

## Cakupan

**Di dalam cakupan:**

- Kebocoran plaintext jurnal ke server dalam bentuk apa pun
- XSS, CSRF, atau bypass CSP di halaman aplikasi
- Kesalahan implementasi kriptografi di `src/lib/crypto/`
- Bypass otorisasi antar akun
- Bypass batasan transfer perangkat (PIN, TTL, jumlah percobaan)
- Enumerasi akun lewat perbedaan respons
- Jalur jaringan tersembunyi di `src/lib/redact/`, yang akan membatalkan klaim "pemindaian berjalan
  di perangkat"

**Di luar cakupan:**

- Serangan yang butuh akses fisik ke perangkat yang sudah tidak terkunci
- Rekayasa sosial terhadap pengguna
- Laporan pemindai otomatis tanpa dampak nyata
- Keterbatasan yang sudah kami catat sendiri di [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md)

Poin terakhir bukan cara menghindar. Sebelas ancaman beserta **sisa risikonya** ditulis terbuka di
dokumen itu, termasuk yang tidak bisa kami lindungi. Kalau kamu menemukan sesuatu yang kami klaim
terlindungi padahal tidak, itu justru laporan yang paling kami butuhkan.

## Yang kami janjikan dan tidak

Kami **tidak** mengklaim bahwa aplikasi web bisa melindungi pengguna dari operator server yang
mengirim kode jahat. Itu keterbatasan mendasar semua aplikasi E2EE berbasis web, dan kami
menuliskannya terbuka di halaman `/privasi` dan `/keamanan` alih-alih menyembunyikannya. Kalau model
ancamanmu mencakup itu, self-host — panduannya di [`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md).

Kami juga tidak akan menulis "100% aman", "tidak bisa diretas", atau "server kami buta total".
Setiap klaim keamanan di repositori ini diikuti batasannya.

## Untuk juri yang ingin memverifikasi sendiri

Klaim inti produk bisa diperiksa tanpa memercayai kami:

| Cara | Perintah atau tautan |
|---|---|
| Jalankan tes yang membuktikan tidak ada plaintext di database | `pnpm test:e2e no-plaintext-on-server` |
| Jalankan tes yang membuktikan penyaring tidak menyentuh jaringan | `pnpm test tests/unit/redact-offline.test.ts` |
| Jalankan vektor uji kriptografi | `pnpm test tests/crypto-vectors` |
| Lihat langsung di aplikasi yang berjalan | Halaman `/bukti` setelah login |
| Bandingkan aset produksi dengan rilis yang ditandatangani | `./scripts/verify.sh <url> <tag>` |

## Aturan review kode kriptografi

Perubahan pada `src/lib/crypto/` tidak boleh mengubah format terenkripsi tanpa menaikkan
`schema_version` dan menyediakan jalur migrasi. Seluruh vektor uji di `tests/crypto-vectors/` wajib
tetap hijau — vektor itu sengaja dipatok supaya refactor tidak diam-diam mengubah format dan membuat
catatan lama tidak bisa dibuka.

Jalur file yang diberi penjagaan tambahan tercantum di [`CODEOWNERS`](CODEOWNERS).
