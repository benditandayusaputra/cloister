# Operasional

Rotasi rahasia, prosedur insiden, dan runbook. Untuk pemasangan awal lihat
[`SELF-HOSTING.md`](SELF-HOSTING.md).

---

## 1. Rahasia server

Tidak ada rahasia di repositori. Semuanya lewat environment variable.

| Variabel | Fungsi | Kalau hilang |
|---|---|---|
| `SERVER_AUTH_PEPPER` | Pepper untuk `users.auth_hash` | **Semua akun tidak bisa masuk lagi.** Cadangkan terpisah dari database |
| `SALT_HMAC_SECRET` | Salt palsu deterministik untuk email tak terdaftar | Enumerasi akun jadi mungkin lagi |
| `IP_HMAC_SECRET` | Meng-HMAC alamat IP sebelum dicatat | Log lama tidak bisa dikorelasikan (dan itu tidak masalah) |
| `JWT_SECRET` | Menandatangani access token | Semua sesi berjalan gugur, pengguna login ulang |
| `CRON_SECRET` | Otorisasi endpoint cron | Cron berhenti; purge tidak berjalan |
| `VAPID_PRIVATE_KEY` | Web Push | Notifikasi berhenti; harus regenerasi pasangan kunci |

Cadangkan `SERVER_AUTH_PEPPER` di tempat yang **berbeda** dari database. Cadangan yang menyimpan
keduanya di satu tempat menghapus manfaat pepper.

## 2. Rotasi rahasia

Target: minimal setahun sekali.

### 2.1 `JWT_SECRET`, `IP_HMAC_SECRET`, `CRON_SECRET`

Rotasi langsung. Ganti nilainya, deploy ulang.

- `JWT_SECRET` — semua access token yang beredar langsung invalid. Klien otomatis memanggil
  `/api/auth/refresh` dan mendapat token baru. Refresh token tidak terpengaruh, jadi pengguna tidak
  perlu login ulang.
- `IP_HMAC_SECRET` — hash lama tidak lagi cocok dengan hash baru. Ini justru sesuai kebijakan
  retensi 30 hari.
- `CRON_SECRET` — perbarui juga di konfigurasi Vercel Cron.

### 2.2 `SALT_HMAC_SECRET`

Rotasi langsung, tapi perhatikan efeknya: salt palsu untuk email yang tidak terdaftar akan berubah.
Penyerang yang mencatat salt palsu sebelum rotasi bisa mendeteksi bahwa nilainya berganti. Ini
kebocoran informasi yang sangat lemah dan dapat diterima; rotasi tetap lebih baik daripada tidak.

### 2.3 `SERVER_AUTH_PEPPER` — butuh hash ganda transisi

Ini satu-satunya rotasi yang tidak bisa dilakukan dengan satu langkah, karena `auth_hash` tidak bisa
dihitung ulang tanpa `authKey` mentah, dan server tidak pernah menyimpannya.

Prosedur:

1. Tambahkan `SERVER_AUTH_PEPPER_LAMA` berisi nilai lama, dan isi `SERVER_AUTH_PEPPER` dengan nilai
   baru.
2. Deploy versi server yang memverifikasi login dengan pepper baru **lalu** pepper lama.
3. Setiap login yang berhasil dengan pepper lama langsung menulis ulang `auth_hash` memakai pepper
   baru, di dalam transaksi yang sama.
4. Pantau berapa persen pengguna aktif yang sudah pindah. Setelah sembilan puluh hari, tulis
   pengumuman untuk sisanya.
5. Hapus `SERVER_AUTH_PEPPER_LAMA` dan cabang verifikasinya. Akun yang belum login sejak rotasi
   harus memulihkan lewat 24 kata pemulihan.

Langkah 5 menghapus akses bagi akun yang tidak pernah login selama sembilan puluh hari. Itu keputusan
sadar dan harus diumumkan lebih dulu, bukan dilakukan diam-diam.

## 3. Cron

| Tugas | Jadwal | Endpoint |
|---|---|---|
| Purge `transfer_sessions` kedaluwarsa | tiap menit | `POST /api/cron/purge` |
| Purge tombstone catatan lebih dari 30 hari | harian | `POST /api/cron/purge` |
| Purge arsip "mulai dari nol" lewat tenggang | harian | `POST /api/cron/purge` |
| Null-kan `ip_hash` sesi lebih dari 30 hari | harian | `POST /api/cron/purge` |
| Pengingat menulis | harian | `POST /api/cron/pengingat` |

Semuanya butuh header `authorization: Bearer $CRON_SECRET`.

## 4. Migrasi database

```bash
pnpm db:generate     # setelah mengubah skema Drizzle
pnpm db:migrate      # jalankan migrasi
```

Gunakan `DATABASE_URL_UNPOOLED` untuk migrasi. Connection pooler tidak cocok untuk DDL.

Preview deploy memakai Neon branch otomatis per PR, sehingga data produksi tidak pernah tersentuh.

## 5. Prosedur insiden

### 5.1 Dugaan kebocoran database

Yang didapat penyerang: ciphertext, nonce, kunci terbungkus, alamat email, tanggal catatan, bucket
ukuran, dan token indeks tag. **Bukan** isi yang dapat dibaca.

Langkah:

1. Rotasi `SERVER_AUTH_PEPPER` mengikuti prosedur 2.3. `auth_hash` yang bocor tidak langsung memberi
   kredensial login, tapi rotasi menutup jalur brute force offline.
2. Cabut seluruh refresh token: `UPDATE sessions SET revoked_at = now() WHERE revoked_at IS NULL`.
3. Kirim pemberitahuan ke semua pengguna. Sampaikan apa yang bocor dan apa yang tidak, dengan tabel
   "Apa yang diketahui server" dari `THREAT-MODEL.md` disalin apa adanya.
4. Sarankan ganti sandi. **Jangan** sarankan rotasi kunci utama — ciphertext yang bocor tidak bisa
   dibuka oleh rotasi, dan menyarankannya akan menyiratkan bahwa isinya terancam.
5. Publikasikan post-mortem dalam sembilan puluh hari.

### 5.2 Dugaan kompromi build

1. Bandingkan aset produksi dengan manifest rilis: `./scripts/verify.sh <URL> <tag>`.
2. Kalau tidak cocok, ambil layanan offline lebih dulu, baru selidiki. Aplikasi tetap berfungsi
   penuh di perangkat pengguna yang sudah memasang PWA.
3. Deploy ulang dari commit yang diketahui bersih, hasilkan manifest baru, umumkan.
4. Ingat batasnya: verifikasi ini mendeteksi penggantian menyeluruh, bukan penggantian selektif ke
   satu pengguna. Jangan menyatakan "sudah dipastikan aman" berdasarkan cocoknya manifest saja.

### 5.3 Laporan celah dari luar

Ikuti `SECURITY.md`. Balas dalam 72 jam, perbaiki dalam sembilan puluh hari, beri atribusi kalau
pelapor menghendaki.

### 5.4 Konten publik bermasalah

Tiga laporan valid menyembunyikan catatan otomatis sampai ditinjau. Antrean ada di
`/pengaturan/moderasi`. Laporan dengan alasan "ada tanda bahaya diri" masuk prioritas dan dijawab
dengan tautan layanan konseling, bukan dengan penghapusan diam-diam.

Moderasi **tidak** berlaku pada catatan privat, dan itu memang disengaja. Server tidak bisa dan
tidak akan memindainya.

## 6. Observability

Cloister tidak memakai layanan pelacakan error pihak ketiga. Alasannya ada di
[`ADR/0004-observability-tanpa-pihak-ketiga.md`](ADR/0004-observability-tanpa-pihak-ketiga.md).

Yang tersedia:

- Log error lokal di IndexedDB, maksimal 200 entri rolling, tanpa isi catatan
- Pengiriman laporan error manual dengan preview persis apa yang akan dikirim
- Metrik agregat di server: kode error per endpoint, latensi p50 dan p95, tanpa ID pengguna
- Uptime monitoring eksternal hanya terhadap endpoint kesehatan publik

Konsekuensinya: debugging lebih sulit. Itu diterima secara sadar.

## 7. Kuota dan biaya

Tier gratis: 20.000 catatan dan 2 GB lampiran per akun, ditegakkan di server.

Batas platform yang membentuk desain:

- Fungsi Node Vercel Hobby mati di 10 detik — batch push dibatasi 100 item, batch rotasi 200
- Neon wajib memakai pooled connection string untuk runtime
- Ciphertext dibatasi 1 MiB per catatan (validasi server); push sinkronisasi dipecah otomatis per ~2,5 MB

Kalau biaya membengkak, jalan keluarnya adalah self-host. `docker-compose.yml` menyediakan Postgres,
MinIO, Redis, dan aplikasi Node.
