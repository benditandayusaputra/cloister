# Atribusi Pihak Ketiga

Cloister sendiri berlisensi **AGPL-3.0-or-later** (lihat [`LICENSE`](LICENSE)).

Berkas ini mencantumkan seluruh pustaka, font, dan aset pihak ketiga yang dipakai, beserta
lisensinya. Daftar versi dihasilkan dari `package.json` dan `node_modules` pada saat rilis; sumber
kebenaran yang mengikat adalah `pnpm-lock.yaml`.

Cloister **tidak memuat CDN pihak ketiga sama sekali**. Seluruh font dan skrip dilayani dari origin
sendiri. Ini keputusan keamanan (lihat T6 di [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md)),
sekaligus yang membuat `connect-src` di CSP bisa tetap berbunyi `'self'`.

---

## 1. Dependensi runtime

| Paket | Versi | Lisensi | Sumber |
|---|---|---|---|
| `@simplewebauthn/browser` | 13.3.0 | MIT | https://github.com/MasterKale/SimpleWebAuthn |
| `@simplewebauthn/server` | 13.3.2 | MIT | https://github.com/MasterKale/SimpleWebAuthn |
| `@sveltejs/adapter-vercel` | 6.3.4 | MIT | https://svelte.dev/docs/kit/adapter-vercel |
| `@vercel/blob` | 2.6.1 | Apache-2.0 | https://vercel.com/storage/blob |
| `dexie` | 4.4.4 | Apache-2.0 | https://dexie.org |
| `drizzle-orm` | 0.45.2 | Apache-2.0 | https://orm.drizzle.team |
| `isomorphic-dompurify` | 3.20.0 | MIT | https://github.com/kkomelin/isomorphic-dompurify |
| `jose` | 6.2.5 | MIT | https://github.com/panva/jose |
| `libsodium-wrappers-sumo` | 0.8.4 | ISC | https://github.com/jedisct1/libsodium.js |
| `marked` | 18.0.7 | MIT | https://marked.js.org |
| `postgres` | 3.4.9 | Unlicense | https://github.com/porsager/postgres |
| `qrcode` | 1.5.4 | MIT | https://github.com/soldair/node-qrcode |
| `uuidv7` | 1.2.1 | Apache-2.0 | https://github.com/LiosK/uuidv7 |
| `valibot` | 1.4.2 | MIT | https://valibot.dev |
| `web-push` | 3.6.7 | MPL-2.0 | https://github.com/web-push-libs/web-push |

### Catatan khusus

**`libsodium-wrappers-sumo` (ISC).** Seluruh operasi kriptografi Cloister memakai primitif dari
libsodium — XChaCha20-Poly1305, Argon2id, BLAKE2b, dan generator acak. Tidak ada primitif kriptografi
buatan sendiri di basis kode ini, dan itu disengaja. Varian *sumo* dipakai karena Argon2id dan
BLAKE2b tidak ada di build standar.

**`web-push` (MPL-2.0).** MPL-2.0 adalah copyleft per berkas. Cloister memakainya sebagai dependensi
tanpa memodifikasi sumbernya, sehingga kewajiban MPL terpenuhi dengan mencantumkan atribusi ini dan
menautkan ke sumber aslinya.

**`jszip` (MIT atau GPL-3.0-or-later).** Dipakai untuk membangun berkas ekspor di klien. Kami memilih
opsi MIT.

## 2. Dependensi pengembangan dan pengujian

| Paket | Versi | Lisensi | Sumber |
|---|---|---|---|
| `@playwright/test` | 1.62.1 | Apache-2.0 | https://playwright.dev |
| `@sveltejs/adapter-auto` | 7.0.1 | MIT | https://svelte.dev |
| `@sveltejs/adapter-node` | 5.5.7 | MIT | https://svelte.dev |
| `@sveltejs/kit` | 2.70.2 | MIT | https://svelte.dev |
| `@sveltejs/vite-plugin-svelte` | 7.2.0 | MIT | https://github.com/sveltejs/vite-plugin-svelte |
| `@tailwindcss/vite` | 4.3.3 | MIT | https://tailwindcss.com |
| `@types/libsodium-wrappers-sumo` | 0.8.2 | MIT | DefinitelyTyped |
| `@types/qrcode` | 1.5.6 | MIT | DefinitelyTyped |
| `@types/web-push` | 3.6.4 | MIT | DefinitelyTyped |
| `@vitest/browser` | 4.1.10 | MIT | https://vitest.dev |
| `drizzle-kit` | 0.31.10 | MIT | https://orm.drizzle.team |
| `jszip` | 3.10.1 | MIT atau GPL-3.0-or-later | https://github.com/Stuk/jszip |
| `playwright` | 1.62.1 | Apache-2.0 | https://playwright.dev |
| `svelte` | 5.56.8 | MIT | https://svelte.dev |
| `svelte-check` | 4.7.4 | MIT | https://github.com/sveltejs/language-tools |
| `tailwindcss` | 4.3.3 | MIT | https://tailwindcss.com |
| `typescript` | 6.0.3 | Apache-2.0 | https://www.typescriptlang.org |
| `vite` | 8.2.0 | MIT | https://vite.dev |
| `vitest` | 4.1.10 | MIT | https://vitest.dev |

## 3. Font

Semuanya **SIL Open Font License 1.1**, di-host sendiri di `static/fonts/`, disubset ke rentang
latin dan latin-ext.

| Font | Peran di produk | Sumber |
|---|---|---|
| Bricolage Grotesque | Judul dan tipografi tampilan | https://github.com/ateliertriay/bricolage |
| Newsreader | Badan tulisan, teks yang dibaca panjang | https://github.com/productiontype/Newsreader |
| IBM Plex Mono | Data, kode, dan nilai kriptografi | https://github.com/IBM/plex |
| Shantell Sans | Angka tanggal di kartu, aksen tulisan tangan | https://github.com/arrowtype/shantell-sans |

Salinan lisensi OFL menyertai berkas font di repositori masing-masing dan berlaku pada berkas
`.woff2` yang disubset di sini.

## 4. Layanan yang dipanggil langsung dari peramban

| Layanan | Dipakai untuk | Catatan privasi |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) | Cuaca opsional pada catatan | Dipanggil langsung dari peramban, **bukan** lewat peladen Cloister, supaya koordinat pengguna tidak pernah melewati sistem kami. Fitur ini opsional dan mati secara bawaan |
| [OpenStreetMap tiles](https://www.openstreetmap.org/copyright) | Peta lokasi opsional | Ubin baru diminta **setelah** pengguna menyetujuinya di antarmuka, tidak otomatis. Data peta &copy; kontributor OpenStreetMap, ODbL |

Keduanya adalah satu-satunya origin selain milik sendiri yang muncul di CSP, dan alasannya
tertulis sebagai komentar tepat di sebelah barisnya di `vite.config.ts`.

## 5. Layanan infrastruktur

Dipakai saat deploy, tidak dibundel ke dalam kode klien: Vercel (hosting dan Blob), Neon (Postgres),
Upstash (Redis untuk rate limit), Resend (email transaksional).

Seluruhnya bersifat opsional untuk self-host. `docker-compose.yml` menyediakan Postgres, MinIO, dan
Redis sebagai gantinya — lihat [`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md).

## 6. Yang tidak dipakai

Dicantumkan supaya jelas, karena ketiadaannya adalah keputusan desain:

- **Tidak ada CDN pihak ketiga.** Tidak ada Google Fonts, tidak ada unpkg, tidak ada jsdelivr.
- **Tidak ada layanan analitik atau pelacakan galat pihak ketiga.** Alasannya di
  [`docs/ADR/0004-observability-tanpa-pihak-ketiga.md`](docs/ADR/0004-observability-tanpa-pihak-ketiga.md).
- **Tidak ada model bahasa jarak jauh.** Penyaring Identitas berjalan sepenuhnya di perangkat;
  alasan tidak dipakainya model ONNX jarak jauh ada di [`docs/REDACTION.md`](docs/REDACTION.md).
- **Tidak ada aset visual berlisensi premium.** Seluruh tekstur, bayangan, dan elemen papan flanel
  dibuat dengan CSS dan SVG di dalam repositori ini.
