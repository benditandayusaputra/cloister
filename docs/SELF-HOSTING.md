# Self-hosting Cloister

Cloister dirancang supaya kamu tidak perlu percaya siapa pun, termasuk kami. Panduan ini menjalankan
instans lengkap di mesinmu sendiri.

## Dengan Docker Compose

```bash
git clone https://github.com/<user>/papan.git
cd papan
cp .env.example .env
```

Isi rahasia di `.env`. Jangan pakai nilai contoh di produksi:

```bash
openssl rand -base64 32   # untuk SERVER_AUTH_PEPPER
openssl rand -base64 32   # untuk SALT_HMAC_SECRET
openssl rand -base64 32   # untuk IP_HMAC_SECRET
openssl rand -base64 48   # untuk JWT_SECRET
```

Lalu:

```bash
docker compose up -d
docker compose exec app pnpm db:migrate
```

Buka <http://localhost:4830>.

Yang ikut dijalankan:

| Layanan | Peran | Port |
|---|---|---|
| `db` | Postgres 17 | 5442 |
| `minio` | Pengganti Vercel Blob untuk lampiran | 9010, 9011 |
| `redis` | Rate limit (opsional) | 6389 |
| `app` | Cloister (Node) | 4830 |

Semua port sengaja digeser dari default supaya tidak bentrok dengan Postgres, Redis, atau MinIO
yang mungkin sudah berjalan di mesinmu.

## Tanpa Docker

Butuh Node 22+, pnpm 9+, dan Postgres 16+.

```bash
pnpm install --frozen-lockfile
createdb papan
cp .env.example .env               # sesuaikan DATABASE_URL
pnpm db:migrate
CLOISTER_ADAPTER=node pnpm build      # menghasilkan folder build/
PORT=4830 node build/index.js
```

`CLOISTER_ADAPTER=node` memilih adapter Node. Tanpa itu, build memakai adapter Vercel.

## Variabel environment

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Koneksi Postgres, pakai `-pooler` kalau serverless |
| `DATABASE_URL_UNPOOLED` | untuk migrasi | Koneksi langsung |
| `SERVER_AUTH_PEPPER` | ya | Pepper untuk `auth_hash`. **Kalau hilang, semua akun tidak bisa masuk lagi.** |
| `SALT_HMAC_SECRET` | ya | Salt palsu anti-enumerasi akun |
| `IP_HMAC_SECRET` | ya | Untuk `ip_hash`, agar IP mentah tidak tersimpan |
| `JWT_SECRET` | ya | Penandatanganan access token |
| `RESEND_API_KEY` | tidak | Email verifikasi. Tanpa ini, kode dicetak ke log server |
| `MAIL_FROM` | tidak | Alamat pengirim |
| `BLOB_READ_WRITE_TOKEN` | tidak | Vercel Blob. Tanpa ini, lampiran disimpan di disk |
| `BLOB_LOCAL_DIR` | tidak | Folder lampiran lokal, default `.blobstore` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | tidak | Rate limit lintas instans. Tanpa ini, rate limit per proses |
| `CRON_SECRET` | disarankan | Melindungi `/api/cron/purge` dan `/api/cron/pengingat` |
| `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY` | tidak | Pengingat harian lewat Web Push. Buat dengan `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | tidak | `mailto:` kontakmu, wajib kalau VAPID aktif |
| `WEBAUTHN_RP_ID` | tidak | Domain untuk passkey, default hostname permintaan |
| `WEBAUTHN_ORIGIN` | tidak | Origin lengkap untuk passkey, default origin permintaan |
| `PUBLIC_READ_ORIGIN` | tidak | Origin terpisah untuk halaman publik |

**Cadangkan `SERVER_AUTH_PEPPER` di tempat yang berbeda dari database.** Tanpa pepper, verifikasi
`authKey` gagal untuk semua akun dan satu-satunya jalan masuk yang tersisa adalah frasa pemulihan
24 kata.

## Cron pembersihan

Retensi data di PRD bagian 11.3 dijalankan oleh `/api/cron/purge`. Di Vercel sudah diatur lewat
`vercel.json`. Untuk self-host, tambahkan ke crontab:

```
0 3 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://cloister.contoh.id/api/cron/purge
0 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://cloister.contoh.id/api/cron/pengingat
```

Cron pengingat berjalan tiap jam dan hanya mengirim ke pengguna yang jam lokalnya cocok dan belum
menulis hari itu. Tanpa kunci VAPID, endpoint ini tidak melakukan apa-apa.

Yang dibersihkan: sesi transfer kedaluwarsa, tombstone entri lebih dari 30 hari, audit log lebih
dari 90 hari, `ip_hash` lebih dari 30 hari, akun terhapus lebih dari 7 hari, lampiran orphan.

## Deploy ke Vercel

1. Import repo di Vercel.
2. Buat database Neon dan salin kedua connection string.
3. Isi semua variabel environment di atas.
4. Jalankan `pnpm db:migrate` dengan `DATABASE_URL_UNPOOLED` mengarah ke produksi.

Preview deploy sebaiknya memakai Neon branch otomatis per PR supaya data produksi tidak tersentuh.

## Migrasi dari instans lain

Setiap pengguna bisa mengekspor sendiri dari Pengaturan → Data, lalu mengimpor di instans baru.
Ekspor dibuat di perangkat pengguna, jadi kamu sebagai operator tidak perlu (dan tidak bisa)
memindahkan isinya.

## Passkey di balik reverse proxy

WebAuthn mengikat kredensial ke domain. Kalau aplikasi berjalan di belakang proxy dengan hostname
berbeda dari yang dilihat pengguna, isi `WEBAUTHN_RP_ID` dengan domain publik (tanpa skema dan
port) dan `WEBAUTHN_ORIGIN` dengan origin lengkapnya. Salah isi membuat passkey yang sudah
terdaftar berhenti dikenali.

## Backup

Yang perlu dicadangkan:

1. Dump Postgres — isinya ciphertext, aman disimpan di mana saja.
2. Folder blob storage — juga ciphertext.
3. Variabel environment, terutama `SERVER_AUTH_PEPPER`.

Backup database saja tidak cukup untuk memulihkan akses pengguna kalau pepper hilang.
