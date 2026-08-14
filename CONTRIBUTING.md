# Menjalankan dan Mengembangkan Cloister

Repositori ini adalah karya untuk **Kompetisi Web Development FTI Festival 2026**, sekaligus proyek
sumber terbuka berlisensi AGPL-3.0. Dokumen ini melayani dua pembaca: dewan juri yang ingin
memverifikasi karya, dan siapa pun yang ingin melanjutkan pengembangannya setelah lomba selesai.

---

## Untuk juri: lima menit pertama

Kalau waktumu terbatas, ini urutan yang paling cepat memperlihatkan isi karya.

**Tanpa memasang apa pun** — buka URL produksi yang tercantum di formulir pengumpulan, lalu:

| Halaman | Yang terlihat |
|---|---|
| `/` | Halaman muka: catatan publik terbaru dan ringkasan produk |
| `/tentang` | Cerita nama, empat pilar, penjelas arsitektur, tabel jujur "yang kami simpan dan yang tidak" |
| `/baca` | Feed catatan publik |
| `/keamanan` | Hierarki kunci, primitif kriptografi, model ancaman ringkas |
| `/privasi` | Kebijakan privasi dalam bahasa manusia, bukan bahasa hukum |
| `/bukti` | **Butuh login.** Tiga panel berdampingan: catatan asli, payload yang dikirim ke server, dan baris database yang sesungguhnya |

Kredensial akun demo dilampirkan terpisah bersama formulir pengumpulan — sengaja tidak dikomit,
karena sandi yang dikomit adalah sandi yang bocor.

**Dengan memasang** — tiga perintah yang membuktikan klaim inti tanpa perlu memercayai kami:

```bash
pnpm install
pnpm test tests/unit/redact-offline.test.ts   # Penyaring Identitas tidak menyentuh jaringan
pnpm test tests/crypto-vectors                 # vektor uji kriptografi tetap
pnpm test tests/redaction-eval                 # evaluasi 200 kalimat, angkanya dicetak ke konsol
```

Tes yang membuktikan tidak ada plaintext di database butuh Postgres dan browser:

```bash
docker compose up -d db
pnpm db:migrate
pnpm test:e2e no-plaintext-on-server
```

Peta lengkap dokumentasi ada di [README](README.md#dokumentasi). Panduan demonstrasi dan skenario
sepuluh menit ada di [`docs/DEMO.md`](docs/DEMO.md).

---

## Setup lokal

**Prasyarat:** Node.js 22+, pnpm 11+, Postgres 16+.

```bash
pnpm install
cp .env.example .env
docker compose up -d db      # Postgres di port 5442, atau pakai yang sudah ada
pnpm db:migrate
pnpm dev
```

Server pengembangan berjalan di **port 4820**, preview di **4821**. Port sengaja bukan default
Vite (5173) supaya tidak bentrok dengan aplikasi lain yang sedang berjalan.

Isi rahasia wajib di `.env` — buat dengan `openssl rand -base64 32`. Daftar lengkapnya di
[README](README.md#cara-menjalankan).

## Sebelum mengirim perubahan

```bash
pnpm check      # TypeScript strict, nol error
pnpm test       # unit, vektor kriptografi, dan evaluasi Penyaring Identitas
pnpm build
```

Ketiganya juga dijalankan CI, ditambah E2E Playwright dan tiga penjaga keamanan (lihat di bawah).

## Konvensi commit

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

Contoh: `feat(papan): tambah tema washi`

---

## Aturan yang ditegakkan otomatis

Empat aturan di bawah bukan imbauan. Semuanya punya penjaga di CI yang menggagalkan build, karena
klaim keamanan yang tidak dijaga akan runtuh sendiri dalam beberapa bulan.

### Kriptografi

Perubahan pada `src/lib/crypto/` tidak boleh mengubah format terenkripsi tanpa menaikkan
`schema_version` dan menyediakan jalur migrasi. Vektor uji di `tests/crypto-vectors/` sengaja
dipatok supaya refactor tidak diam-diam mengubah format dan membuat catatan lama tidak bisa dibuka.

Tidak ada primitif kriptografi buatan sendiri. Semuanya dari libsodium.

### Rute privat tidak menerima plaintext

Rute di bawah `src/routes/api/sync/` tidak boleh menyentuh bidang `body`, `title`, atau `plaintext`.
Ditegakkan tiga lapis: skema Valibot yang menolak properti tak dikenal,
`tests/unit/validasi.test.ts`, dan langkah grep di CI.

### Penyaring Identitas tidak menyentuh jaringan

File di `src/lib/redact/` tidak boleh memuat `fetch`, `XMLHttpRequest`, `WebSocket`,
`sendBeacon`, `importScripts`, `EventSource`, maupun URL absolut. Ditegakkan oleh
`tests/unit/redact-offline.test.ts` **dan** langkah terpisah di CI. Klaim "pemindaian berjalan di
perangkat" hanya bernilai kalau ada yang menjaganya.

Setiap perubahan pada pola atau leksikon wajib menjalankan ulang evaluasinya
(`pnpm test tests/redaction-eval`) dan memperbarui tabel angka di [`docs/REDACTION.md`](docs/REDACTION.md).
Angka yang ditulis sekali lalu dilupakan lebih buruk daripada tidak ada angka sama sekali.

### Tidak ada `{@html}` liar dan tidak ada CDN pihak ketiga

Satu-satunya tempat `{@html}` boleh muncul adalah `components/markdown/AmanMarkdown.svelte` dan
`components/publik/LembarPublik.svelte`, dan isinya selalu lewat DOMPurify dengan allowlist ketat.

Tidak boleh ada aset dari Google Fonts, jsdelivr, atau unpkg. Semua font di-host sendiri di
`static/fonts/`. Ini yang membuat `connect-src` di CSP bisa tetap berbunyi `'self'`.

---

## Aturan komponen

Komponen dipecah per domain di `src/lib/components/`. Satu komponen satu tanggung jawab; kalau satu
file mulai melebihi sekitar 200 baris, pecah.

Metafora visual tidak boleh mengorbankan struktur semantik. Papan tetap `<ul>`, kartu tetap `<li>`
berisi `<article>`, dan setiap target sentuh minimal 44 x 44 px.

## Menambah tema

Pintu masuk kontribusi paling ramah. Dua langkah:

1. Tambah blok `[data-theme="nama"]` di `src/lib/styles/tokens.css`
2. Daftarkan di `TEMA` pada `src/lib/state/tema.svelte.ts`

Tema wajib lulus kontras WCAG AA (4.5:1) di mode malam dan siang. `tests/unit/kontras.test.ts`
memeriksanya otomatis, jadi tema yang gagal kontras tidak akan lolos CI.

## Menambah bahasa

Salin `src/lib/i18n/id.ts` ke bahasa baru, terjemahkan, lalu daftarkan di
`src/lib/state/i18n.svelte.ts`. Tipe `Kamus` memastikan tidak ada kunci yang tertinggal.

Istilah kriptografi (Argon2id, XChaCha20-Poly1305) tidak diterjemahkan. Nama produk Cloister juga
tidak.

## Kosakata produk

Konsistensi istilah adalah rambu navigasi bagi pengguna. Yang dipakai di seluruh antarmuka dan
dokumentasi:

| Konsep | Pakai | Jangan pakai |
|---|---|---|
| Satu tulisan harian | Catatan | Entri, post |
| Kumpulan catatan satu bulan | Papan | Halaman, board |
| Kunci utama pengguna | Kunci utama | Master key (di UI) |
| 24 kata pemulihan | Kata pemulihan | Seed phrase, mnemonic |
| Memindahkan catatan ke publik | Terbitkan | Publish, share |
| Menyambungkan perangkat baru | Sambungkan perangkat | Sync device, pairing |

---

## Lapor masalah

Bug dan usulan lewat [issue GitHub](https://github.com/benditandayusaputra/cloister/issues).

**Kerentanan keamanan jangan lewat issue publik** — ikuti [`SECURITY.md`](SECURITY.md).

Perilaku di ruang proyek diatur [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Ringkasnya untuk
kontributor: jangan pernah menempelkan data pribadi orang sungguhan di issue, PR, atau data uji.
