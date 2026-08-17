<p align="center">
  <img src="static/logo.png" alt="Cloister" width="160" />
</p>

<h1 align="center">Cloister</h1>

<p align="center"><em>Ditulis di dalam. Tidak terbaca dari luar.</em></p>

<p align="center">
  <img alt="Lisensi" src="https://img.shields.io/badge/lisensi-AGPL--3.0--or--later-2A3630" />
  <img alt="Tes" src="https://img.shields.io/badge/tes-342%20hijau-4E7A52" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict%2C%200%20error-2B4F8E" />
  <img alt="Enkripsi" src="https://img.shields.io/badge/XChaCha20--Poly1305-Argon2id-9B3B2F" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-offline--first-B4862C" />
</p>

---

Cloister adalah jurnal pribadi yang mengutamakan penyimpanan lokal dan privasi kriptografis. Catatan
privat dienkripsi di perangkat pengguna sebelum sinkronisasi, sehingga server menyimpan replika
terenkripsi, bukan isi jurnal yang dapat dibaca. Aplikasi dapat digunakan tanpa jaringan, mendukung
sinkronisasi terenkripsi antarperangkat dan pemulihan, serta menjadikan penerbitan sebagai batas
yang secara eksplisit dikendalikan pengguna.

Nama produknya berasal dari lorong berdinding di dalam biara — ruang tertutup yang selama
berabad-abad menjadi tempat naskah ditulis dan disalin. Satu kata yang sekaligus berarti **ruang
tertutup** dan **tempat menulis**.

**Tampilannya bukan tabel.** Catatan adalah kartu kertas yang ditancap paku di papan flanel,
dikelompokkan dalam map manila per bulan, dengan tujuh tema yang bisa diganti.

---

## Daftar isi

- [Masalah yang diselesaikan](#masalah-yang-diselesaikan)
- [Tiga hal yang membedakan Cloister](#tiga-hal-yang-membedakan-cloister)
- [Akun demo](#akun-demo)
- [Cara menjalankan](#cara-menjalankan)
- [Teknologi](#teknologi)
- [Buktinya bisa diperiksa](#buktinya-bisa-diperiksa)
- [Fitur](#fitur)
- [Arsitektur](#arsitektur)
- [Struktur repositori](#struktur-repositori)
- [Perintah](#perintah)
- [Dokumentasi](#dokumentasi)
- [Penggunaan AI dalam pengembangan](#penggunaan-ai-dalam-pengembangan)
- [Lisensi](#lisensi)

---

## Masalah yang diselesaikan

Jurnal pribadi memuat informasi paling sensitif yang pernah ditulis seseorang: kondisi kesehatan,
relasi keluarga, keuangan, keluhan tentang atasan, hal-hal yang tidak diceritakan ke siapa pun.

Aplikasi jurnal berbasis awan mengharuskan pengguna mempercayai empat hal sekaligus: niat pengelola
layanan, konfigurasi servernya, kontrol akses database-nya, dan kualitas penanganan insidennya.

Cloister menghadirkan kenyamanan sinkronisasi awan tanpa meminta kepercayaan itu. Server tidak
membutuhkan kemampuan membaca catatan privat, jadi ia tidak diberi kemampuan itu sejak awal.

## Tiga hal yang membedakan Cloister

### 1. Privasi berasal dari arsitektur, bukan kebijakan

Enkripsi terjadi di perangkat dengan XChaCha20-Poly1305, kunci diturunkan dengan Argon2id, dan kunci
utama hidup di Web Worker terpisah yang tidak pernah menyerahkannya ke thread utama. Yang sampai ke
server hanya `ciphertext`, `nonce`, `wrapped_dek`, `dek_nonce`, dan `size_bucket`.

Klaim ini bisa diperiksa di halaman [`/bukti`](#buktinya-bisa-diperiksa) dan lewat tes otomatis.

### 2. AI dipakai untuk melindungi, bukan untuk membaca

**Penyaring Identitas** berjalan sepenuhnya di perangkat dan menandai informasi yang bisa
mengidentifikasi orang sebelum sebuah catatan diterbitkan ke publik — NIK, NPWP, nomor rekening,
nomor HP, alamat, koordinat, plat nomor, akun media sosial, tanggal lahir, plus nama orang, tempat,
dan organisasi.

Risiko terbesar dari fitur penerbitan bukan pada server, melainkan pada penggunanya sendiri: orang
menerbitkan kalimat yang memaparkan orang ketiga yang tidak pernah memberi persetujuan. Tidak ada
kompetitor di ruang ini yang menyelesaikan masalah itu.

Recall 100% dan nol positif palsu pada [dataset evaluasi 200 kalimat](tests/redaction-eval/) —
dengan caveat yang ditulis jujur di [`docs/REDACTION.md`](docs/REDACTION.md), termasuk kenapa model
ONNX jarak jauh **tidak** dipakai.

### 3. Identitas visual papan flanel

Papan pengumuman flanel di ruangan yang lampunya cuma satu, jam sebelas malam. Cahaya datang dari
satu sumber di kiri atas, semua bayangan jatuh ke kanan bawah. Rotasi kartu deterministik dari hash
tanggal, jadi tidak pernah berubah antar render.

Metafora fisik tidak pernah mengorbankan struktur semantik: papan tetap `<ul>`, kartu tetap `<li>`
berisi `<article>`. Tujuh tema, dua mode, semuanya lolos kontras WCAG AA yang diperiksa otomatis di
tes.

---

## Akun demo

Kredensial akun demo dilampirkan terpisah bersama formulir pengumpulan, **bukan** di repositori ini
— sandi yang dikomit adalah sandi yang bocor.

Untuk membuat akun demo sendiri berisi data sintetis:

```bash
pnpm dev                                              # terminal 1
node scripts/seed-sample.mjs --email demo@contoh.id   # terminal 2
```

Skrip menjalankan browser sungguhan, mendaftar, lalu menulis 15 catatan tersebar di tiga bulan
terakhir. Ia harus begitu: catatan dienkripsi di perangkat, jadi tidak bisa disemai lewat SQL. Sandi
diacak setiap kali dijalankan dan ditulis ke `AKUN-CONTOH.txt` bersama 24 kata pemulihannya.

Yang bisa dicoba **tanpa akun**: `/` halaman muka dengan catatan publik terbaru, `/tentang` cerita
nama dan arsitektur, `/baca` feed publik, `/keamanan` hierarki kunci dan model ancaman, `/privasi`
kebijakan privasi dalam bahasa manusia.

Panduan lengkap untuk juri ada di [`docs/DEMO.md`](docs/DEMO.md).

---

## Cara menjalankan

**Prasyarat:** Node.js 22+, pnpm 11+, dan Postgres 16+.

```bash
pnpm install
cp .env.example .env          # isi DATABASE_URL dan rahasia server
pnpm db:migrate
pnpm dev
```

Buka <http://localhost:4820>. Port sengaja bukan default Vite (5173) supaya tidak bentrok dengan
aplikasi lain yang sedang berjalan.

Belum punya Postgres? Ada di `docker-compose.yml`:

```bash
docker compose up -d db       # Postgres di port 5442
```

Rahasia yang wajib diisi di `.env` — buat dengan `openssl rand -base64 32`:

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi Postgres (pooled) |
| `DATABASE_URL_UNPOOLED` | Untuk migrasi; pooler tidak cocok untuk DDL |
| `SERVER_AUTH_PEPPER` | Pepper untuk `users.auth_hash`. **Hilang = semua akun tidak bisa masuk lagi** |
| `SALT_HMAC_SECRET` | Salt palsu deterministik yang mencegah enumerasi akun |
| `IP_HMAC_SECRET` | Meng-HMAC alamat IP sebelum masuk log |
| `JWT_SECRET` | Menandatangani access token |

Sisanya opsional dan aplikasi tetap jalan tanpanya: Resend (email), Vercel Blob atau MinIO
(lampiran), Upstash Redis (rate limit; jatuh ke memori kalau kosong), VAPID (pengingat push).

**Self-host penuh** dengan Postgres, MinIO, dan Redis:

```bash
docker compose up -d
```

Langkah lengkapnya di [`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md).

---

## Teknologi

| Lapisan | Pilihan | Alasan memilihnya |
|---|---|---|
| Framework | SvelteKit 2, Svelte 5 (runes) | Bundle terkecil di antara kandidat, penting untuk PWA offline-first. Halaman publik tanpa hydration cost. Adapter Vercel mendukung mode hybrid per rute |
| Bahasa | TypeScript strict | `strict`, `noUncheckedIndexedAccess`, dan `exactOptionalPropertyTypes` semuanya aktif |
| Styling | Tailwind CSS 4 + CSS custom properties | Tujuh tema butuh pergantian variabel runtime yang tidak bisa dikerjakan utility class saja |
| Kriptografi | `libsodium-wrappers-sumo` (WASM) | WebCrypto tidak menyediakan Argon2id maupun XChaCha20-Poly1305. libsodium sudah diaudit dan API-nya sulit disalahgunakan. **Tidak ada primitif kriptografi buatan sendiri** |
| Database | Postgres (Neon di produksi) | Pooling untuk serverless, branching untuk preview deploy |
| ORM | Drizzle | Type-safe, SQL-first, migrasi berbasis file, runtime kecil |
| Database lokal | Dexie 4 (IndexedDB) | API bersih, transaksi, cocok dengan runes |
| Validasi | Valibot | Lebih kecil dari Zod. `strictObject` menolak properti tak dikenal — ini yang menegakkan batas plaintext |
| Editor | TipTap 3 (ProseMirror) | WYSIWYG: tabel disunting di tempat, gambar base64 bisa digeser dan diubah ukurannya, H1–H6, ukuran huruf. Keluarannya HTML yang lewat sanitizer yang sama dengan render |
| Sanitasi | `isomorphic-dompurify` + `marked` | Satu kebijakan allowlist untuk HTML editor maupun markdown lama; satu-satunya `{@html}` di seluruh basis kode ada di `AmanMarkdown.svelte` |
| Penyaring Identitas | Regex tervalidasi + pengenal entitas berbasis leksikon, di Web Worker | Nol unduhan, nol request jaringan, berjalan penuh offline. Alasan tidak memakai ONNX ada di [`docs/REDACTION.md`](docs/REDACTION.md) |
| Auth | `jose` (JWT) + `@simplewebauthn` (passkey) | Access token 15 menit di memori saja, refresh token opaque di cookie `HttpOnly` |
| Pengujian | Vitest + Playwright | 342 unit dan vektor kripto, 31 skenario E2E |
| PWA | Service worker tulis tangan | Precache shell, strategi berbeda per jenis aset |

---

## Buktinya bisa diperiksa

Kelemahan mendasar semua aplikasi terenkripsi ujung ke ujung adalah jaminannya tidak terlihat.
Pengguna dan juri sama-sama diminta percaya pada klaim.

**Halaman `/bukti`** (butuh login, menampilkan data milik sendiri) mengubah klaim itu menjadi
sesuatu yang bisa dilihat dalam 15 detik:

| Panel | Isi |
|---|---|
| 1. Yang kamu lihat | Catatan asli, dirender persis seperti di aplikasi |
| 2. Yang dikirim ke server | Payload permintaan sungguhan dari sesi ini, apa adanya |
| 3. Yang tersimpan di database | Baris `entries` yang sesungguhnya, nama kolom asli Postgres |

Plus **tombol "Coba buka dengan kunci salah"** yang benar-benar menjalankan dekripsi dengan kunci
32 byte acak dan menampilkan kegagalan verifikasi tag Poly1305 apa adanya, dan **penghitung byte
plaintext yang pernah dikirim ke server**, dihitung dari instrumentasi klien terhadap seluruh
permintaan di sesi berjalan.

> Verifikasi semacam ini sudah dilakukan Notesnook lewat Vericrypt. Kami menganggapnya standar
> minimum untuk aplikasi terenkripsi, bukan fitur unggulan.

**Hal yang sama dibuktikan ulang otomatis di CI:**

| File | Yang dibuktikan |
|---|---|
| [`tests/e2e/no-plaintext-on-server.spec.ts`](tests/e2e/no-plaintext-on-server.spec.ts) | Menulis catatan berisi frasa penanda, memicu sinkronisasi, lalu memindai seluruh isi tabel `entries` **langsung dari Postgres** dan memastikan frasa itu tidak muncul dalam bentuk apa pun — utf8, base64, maupun hex |
| [`tests/unit/validasi.test.ts`](tests/unit/validasi.test.ts) | Skema rute privat menolak bidang `title`, `body`, dan `content` |
| [`tests/unit/markdown-aman.test.ts`](tests/unit/markdown-aman.test.ts) | Pipeline render markdown menolak payload XSS sungguhan: `<script>`, `javascript:`, `data:text/html` di gambar, handler event, injeksi lewat teks alternatif — diuji pada fungsi yang sama persis dengan yang dipakai aplikasi |
| [`tests/unit/editor-html.test.ts`](tests/unit/editor-html.test.ts) | Badan HTML dari editor kaya: `onerror`, `javascript:`, SVG base64, `style` dengan `url()`/`position`, `<iframe>`, `<form>`, kelas sembarang, `srcset` ditolak; gambar raster base64 dengan lebar/perataan, tabel dengan `colspan`, daftar centang, ukuran huruf, dan `text-align` dipertahankan; skema `lampiran:` hanya lolos di jalur penyimpanan |
| [`tests/unit/redact-offline.test.ts`](tests/unit/redact-offline.test.ts) | Penyaring Identitas tidak memuat satu pun jalur jaringan, diperiksa dari sumbernya **dan** dengan menjalankannya sambil menjebak `fetch`, `XMLHttpRequest`, `WebSocket`, dan `sendBeacon` |
| [`tests/crypto-vectors/`](tests/crypto-vectors/) | Vektor uji tetap untuk KDF, AEAD, pembungkusan kunci, dan rotasi, supaya refactor tidak diam-diam mengubah format |
| [`tests/unit/kontras.test.ts`](tests/unit/kontras.test.ts) | Tujuh tema x dua mode lolos kontras WCAG AA |

**Verifikasi build.** `scripts/build-manifest.mjs` menghasilkan SHA-256 setiap aset yang dilayani,
dan `scripts/verify.sh <url> <tag>` membandingkannya dengan situs yang berjalan. Batasnya disebut
apa adanya di dalam skripnya: ini mendeteksi penggantian menyeluruh, bukan penggantian selektif ke
satu pengguna.

**Yang tidak akan kami klaim.** Penyimpanan terenkripsi melindungi dari paparan di sisi server,
tetapi tidak bisa mengubah perangkat atau browser yang sudah dikompromikan menjadi lingkungan yang
tepercaya. XSS pada origin aplikasi tetap ancaman paling serius, dan mitigasinya berlapis, bukan
absolut. Semuanya ditulis lengkap di [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md).

---

## Fitur

**Menulis** — editor WYSIWYG (TipTap/ProseMirror) dengan bilah alat lengkap: judul H1–H6, ukuran
huruf, tebal/miring/garis bawah/coret/kode, perataan, daftar, daftar berangka, daftar centang,
kutipan, blok kode, tautan, emoji, dan **tabel yang disunting langsung di tempat** (tambah/hapus
baris dan kolom, gabung sel, baris judul, lebar kolom bisa ditarik). Unggah foto dari toolbar,
tempel, atau seret: gambar dijadikan base64 di dalam badan catatan, bisa **digeser, diubah
ukurannya dengan pegangan, dan diratakan** seperti di CKEditor. Autosave debounce tanpa tombol
simpan, mode preview memakai pipeline render publik yang sama; satu atau lebih catatan per tanggal,
pemilih suasana hati, tag, lampiran terenkripsi dengan EXIF dibuang yang bisa disisipkan ke teks
(`lampiran:id`, diresolusi ke hasil dekripsi saat render), lokasi dan cuaca opsional, prompt
harian. Catatan lama berformat markdown dikonversi otomatis saat dibuka.

**Navigasi** — tampilan tahun berupa 12 map bulan (bulan berjalan selalu ditandai, ikon folder
bisa dipilih dari ratusan emoji), papan flanel per bulan dengan kartu terpaku, **folder Tersemat**
untuk jurnal yang disematkan dari bulan dan tahun mana pun (tombol pin di editor dan mode baca,
status pin ikut terenkripsi dan tersinkron), lencana "terbit di publik" pada kartu, linimasa
dengan peta panas dan "di tanggal ini", pencarian full-text lokal, benang tag yang terentang ke
kartu lain dengan tag serupa. Semua konfirmasi (hapus, cabut perangkat, tarik dari publik) memakai
dialog kustom yang konsisten, bukan `confirm()` browser.

**Keamanan** — 24 kata pemulihan BIP-39, ganti sandi tanpa menyentuh catatan, rotasi kunci utama,
passkey sebagai faktor kedua, kunci ruang dengan PIN lokal, Mode Diperkuat yang membuat server
tidak menyimpan kunci terbungkus sama sekali, jalan keluar "mulai dari nol" saat semua kunci hilang.
Formulir masuk dan daftar dilindungi **captcha gambar buatan sendiri** (lima huruf digambar
langsung oleh server sebagai PNG, tiap huruf diputar dan dilengkungkan, tanpa teks yang bisa dibaca
mesin dari sumber halaman; jawabannya hanya disimpan sebagai tanda tangan HMAC di dalam token,
sekali pakai, kedaluwarsa 10 menit; tanpa layanan pihak ketiga dan tanpa cookie pelacak) plus
**honeypot** tersembunyi yang langsung menolak bot pengisi formulir. Tombol tampilkan/sembunyikan sandi tersedia
di semua field sandi.

**Sinkronisasi** — delta sync dengan Lamport counter, resolusi konflik yang tidak pernah menimpa
diam-diam, penyambungan perangkat baru lewat QR dan PIN enam digit, kode manual sebagai alternatif
tanpa kamera, jendela sinkronisasi selektif, indikator status.

**Publikasi** — Penyaring Identitas sebelum terbit, modal persetujuan yang tidak pernah tercentang
otomatis, halaman publik SSR, feed dengan pencarian dan saringan, nama pena atau anonim, reaksi,
pelaporan dan antrean moderasi, tautan rahasia dengan kunci di fragmen URL yang tidak pernah dikirim
ke server, penarikan permanen.

**Data** — ekspor ZIP berisi markdown ber-frontmatter, JSON, dan media; impor dari ekspor Cloister,
Day One, Journey, dan markdown biasa; hapus akun.

**Tampilan** — tujuh tema x dua mode, responsif 360 sampai 1920 px, `prefers-reduced-motion`
dihormati, dua bahasa.

---

## Arsitektur

```
Perangkat Pengguna                        Server
──────────────────                        ───────
Antarmuka SvelteKit                       Rute server SvelteKit (Node)
  ├─ Crypto Worker (libsodium WASM)  ├─ Postgres (Drizzle)
  │    └─ kunci utama hidup di sini,       ├─ Blob storage (lampiran terenkripsi)
  │       tidak pernah keluar              └─ Redis (rate limit, opsional)
  └─ Worker Penyaring Identitas
       └─ nol request jaringan
IndexedDB (Dexie) — sumber kebenaran
Service Worker — shell offline
```

**Lima batas yang tidak boleh dilanggar:**

1. Semua operasi kriptografi terjadi di Web Worker terpisah. Kunci utama tidak pernah berada di
   thread utama dalam bentuk yang dapat diekstrak.
2. Rute server privat tidak pernah menerima bidang bernama `content`, `title`, `body`, atau apa pun
   yang berisi plaintext catatan.
3. IndexedDB adalah sumber kebenaran bagi pengguna. Server adalah replika terenkripsi.
4. Halaman publik tidak memuat kode kriptografi sama sekali.
5. Penyaring Identitas tidak pernah melakukan request jaringan saat memindai.

Batas nomor 2 ditegakkan tiga lapis: skema Valibot yang menolak properti tak dikenal, tes unit atas
skema itu, dan tes E2E yang membaca langsung ke Postgres.

**Hierarki kunci** — ringkasnya: sandi diregangkan dengan Argon2id, lalu HKDF memisahkannya menjadi
kunci autentikasi (dikirim ke server, di-hash ulang dengan pepper di sana) dan KEK (tidak pernah
keluar perangkat). KEK membungkus kunci utama; kunci utama membungkus DEK per catatan; DEK
mengenkripsi ciphertext. 24 kata pemulihan menghasilkan jalur kedua ke kunci utama yang sepenuhnya
terpisah dari sandi. Lengkapnya di [`docs/CRYPTOGRAPHY.md`](docs/CRYPTOGRAPHY.md).

---

## Struktur repositori

```
cloister/
├─ src/
│  ├─ lib/
│  │  ├─ crypto/       kdf, aead, envelope, recovery, transfer, rotasi, worker
│  │  ├─ redact/       Penyaring Identitas: pola, entitas, skor, sunting, worker
│  │  ├─ bukti/        instrumentasi byte plaintext untuk halaman Bukti
│  │  ├─ db/local/     skema Dexie dan repositori
│  │  ├─ db/server/    skema Drizzle per domain
│  │  ├─ sync/         mesin sinkronisasi dan resolusi konflik
│  │  ├─ state/        store berbasis runes Svelte 5
│  │  ├─ components/   per domain: dasar, papan, tahun, entri, nav, auth, pengaturan, publik
│  │  ├─ server/       auth, rate limit, sanitasi, blob, feed
│  │  └─ i18n/         kamus ID dan EN
│  ├─ routes/
│  │  ├─ (marketing)/  halaman muka, privasi, keamanan
│  │  ├─ (auth)/       daftar, masuk, pulih, verifikasi, sambung
│  │  ├─ (app)/        aplikasi, pengaturan, dan /bukti (butuh auth)
│  │  ├─ (public)/     /baca feed publik dan /s tautan rahasia, SSR
│  │  └─ api/          kontrak API
│  ├─ hooks.server.ts  header keamanan
│  └─ service-worker.ts
├─ tests/
│  ├─ unit/            validasi, konflik, kontras, papan, penyaring offline
│  ├─ crypto-vectors/  vektor uji tetap
│  ├─ redaction-eval/  dataset 200 kalimat dan evaluasinya
│  └─ e2e/             Playwright, termasuk no-plaintext-on-server
├─ docs/               kriptografi, model ancaman, sinkronisasi, penyaring, ADR
├─ drizzle/            migrasi
├─ scripts/            seed data contoh, manifest build, verify.sh
└─ docker-compose.yml
```

---

## Perintah

| Perintah | Isi |
|---|---|
| `pnpm dev` | Server pengembangan di port **4820** |
| `pnpm build` | Build produksi (adapter Vercel) |
| `CLOISTER_ADAPTER=node pnpm build` | Build untuk self-host (`node build/index.js`) |
| `pnpm preview` | Preview build di port **4821** |
| `pnpm check` | `svelte-check` dengan TypeScript strict |
| `pnpm test` | Unit, vektor kriptografi, dan evaluasi Penyaring Identitas |
| `pnpm test:e2e` | End-to-end (Playwright) |
| `pnpm db:generate` | Buat migrasi Drizzle dari skema |
| `pnpm db:migrate` | Jalankan migrasi |
| `pnpm seed` | Buat akun contoh berisi catatan (butuh server dev jalan) |
| `pnpm manifest` | Hasilkan `build-manifest.json` untuk verifikasi build |

---

## Dokumentasi

| File | Isi |
|---|---|
| [`docs/CRYPTOGRAPHY.md`](docs/CRYPTOGRAPHY.md) | Spesifikasi kriptografi lengkap: primitif, hierarki kunci, pendaftaran, login, enkripsi catatan, transfer perangkat, rotasi |
| [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) | Sebelas ancaman, mitigasi, dan **sisa risiko** masing-masing |
| [`docs/SYNC.md`](docs/SYNC.md) | Model delta sync, state machine, resolusi konflik, idempotensi |
| [`docs/REDACTION.md`](docs/REDACTION.md) | Penyaring Identitas: pola, skor paparan, hasil evaluasi, keterbatasan |
| [`docs/COMPETITORS.md`](docs/COMPETITORS.md) | Posisi terhadap Notesnook, Standard Notes, Joplin, Day One |
| [`docs/DEMO.md`](docs/DEMO.md) | Panduan untuk juri dan skenario demonstrasi |
| [`docs/API.md`](docs/API.md) | Kontrak API lengkap |
| [`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md) | Panduan self-host |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Rotasi rahasia, prosedur insiden, runbook |
| [`docs/ADR/`](docs/ADR/) | Architecture Decision Records |
| [`SECURITY.md`](SECURITY.md) | Kebijakan pengungkapan celah |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup lokal dan aturan review kode kripto |
| [`CONTENT-POLICY.md`](CONTENT-POLICY.md) | Kebijakan konten publik |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | Atribusi pustaka, font, dan aset pihak ketiga |

---

## Penggunaan AI dalam pengembangan

Bagian ini ditulis proaktif karena pertanyaannya wajar diajukan, dan menjawabnya lebih dulu lebih
baik daripada menunggu ditanya.

**Di mana AI dipakai:** asisten pemrograman dipakai sebagai alat bantu selama implementasi — untuk
menulis boilerplate berulang, mempercepat penulisan tes, menyusun draf dokumentasi, dan sebagai
lawan diskusi saat menimbang pendekatan. Kalimat-kalimat dalam dokumen ini melalui penyuntingan
manual.

**Di mana keputusan diambil manual, dan kenapa:**

- **Seluruh sistem visual.** Tesis papan flanel, palet tujuh tema, arah cahaya tunggal dari kiri
  atas, rotasi kartu deterministik dari hash tanggal, benang tag sebagai elemen signature — semuanya
  keputusan desain manual yang bisa dipertanggungjawabkan satu per satu. Kenapa flanel hijau dan
  bukan gabus cokelat, kenapa pasangan huruf itu, kenapa tidak ada animasi lebih dari 420 ms:
  masing-masing punya alasan yang bisa dijelaskan di tanya jawab.
- **Seluruh keputusan arsitektur keamanan.** Pemilihan XChaCha20-Poly1305 di atas AES-GCM, Argon2id
  di atas bcrypt, DEK per catatan alih-alih derivasi dari kunci utama, padding ke bucket ukuran
  tetap, indeks buta untuk tag beserta kelemahannya yang diakui terbuka. Alasannya tercatat di
  `docs/CRYPTOGRAPHY.md` dan di ADR.
- **Batas produk.** Apa yang masuk rilis dan apa yang ditunda — PIN darurat ditunda karena
  penjelasan batasnya belum bisa ditulis cukup jelas, model NER ONNX dilepas karena bertabrakan
  dengan janji offline dan dengan CSP. Keputusan semacam ini tidak didelegasikan.
- **Kosakata produk dan seluruh teks antarmuka** dalam bahasa Indonesia, termasuk keputusan untuk
  tidak pernah menulis "100% aman".

**Yang bisa diperiksa:** riwayat commit memperlihatkan iterasi, bukan satu ledakan kode. Setiap
keputusan arsitektur besar punya ADR atau bagian dokumen yang menjelaskan alasan dan
konsekuensinya. Setiap anggota tim dapat mempertahankan keputusan desain di sesi tanya jawab.

---

## Kompetisi

Karya untuk **FTI Festival 2026, Kompetisi Web Development, ISB Atma Luhur**.

Tema utama **PIXEL: Protection Information Exploration in the Digital Era**, dengan subtema utama
**Privasi Data dan Perlindungan Identitas Digital**, didukung **Keamanan Siber dan Perlindungan
Informasi Digital** serta **Artificial Intelligence untuk Keamanan Informasi**.

| Fokus panduan lomba | Jawaban Cloister |
|---|---|
| Perlindungan data dan keamanan informasi | Enkripsi di perangkat, rute privat hanya menerima payload terenkripsi, pembungkusan kunci berlapis |
| Edukasi mengenai keamanan siber | Halaman Bukti, halaman privasi yang menjelaskan batas kepercayaan server, model ancaman yang terbuka |
| Peningkatan literasi digital masyarakat | Penyaring Identitas mengajari pengguna mengenali informasi yang bisa mengidentifikasi orang, tepat pada saat mereka hendak menerbitkan |
| Solusi digital yang inovatif | Jurnal harian, arsitektur zero-knowledge, dan AI on-device dalam satu produk yang layak dipakai sehari-hari |
| Pemanfaatan AI secara etis | Pemindaian berjalan di browser, tidak ada teks yang dikirim ke layanan mana pun, dan bisa dibuktikan dengan tab Network kosong |

---

## Lisensi

**AGPL-3.0-or-later.** Layanan turunan wajib membuka kodenya juga — itu memang tujuannya untuk
aplikasi privasi. Kalau seseorang menjalankan Cloister sebagai layanan, penggunanya berhak memeriksa
kode yang benar-benar melayani mereka.

Atribusi pustaka pihak ketiga ada di [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
