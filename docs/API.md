# Kontrak API Cloister

Semua endpoint di bawah `/api`. Error mengikuti RFC 9457 Problem Details dengan
`content-type: application/problem+json`.

Autentikasi memakai `Authorization: Bearer <access token>`. Access token berumur 15 menit dan hanya
disimpan di memori. Refresh token adalah cookie `HttpOnly; Secure; SameSite=Strict`.

Semua permintaan mutasi memvalidasi header `Origin`.

## Autentikasi

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/auth/params?email=` | | `200 { saltUser, kdf }` — selalu 200, salt palsu untuk email tak terdaftar |
| POST | `/api/auth/register` | `{ email, authKey, saltUser, kdf, wrappedMk, mkNonce, recoveryWrappedMk, recoveryNonce, recoverySalt, recoveryAuthKey, deviceName, platform, locale }` | `201 { userId, deviceId, accessToken }` |
| POST | `/api/auth/login` | `{ email, authKey, deviceId?, deviceName?, platform? }` | `200 { accessToken, deviceId, deviceRegistered, wrappedMk?, mkNonce? }` |
| POST | `/api/auth/refresh` | cookie | `200 { accessToken }` |
| POST | `/api/auth/logout` | | `204` |
| GET | `/api/auth/session` | | `200` ringkasan akun dan profil |
| POST | `/api/auth/verify-email` | `{ code }` | `204` |
| PUT | `/api/auth/verify-email` | | `200 { sent }` — kirim ulang kode |
| POST | `/api/auth/change-password` | `{ authKeyOld, authKeyNew, saltUserNew, kdfNew, wrappedMk, mkNonce }` | `204` |
| POST | `/api/auth/recover` | `{ email }` | `200 { recoveryWrappedMk, recoveryNonce, recoverySalt, kdf }` |
| GET | `/api/auth/passkey/masuk?email=` | Opsi tantangan WebAuthn, selalu 200 |
| POST | `/api/auth/passkey/masuk` | Verifikasi passkey, mengembalikan tiket 180 detik |
| GET | `/api/auth/passkey/daftar` | Opsi pendaftaran passkey |
| POST | `/api/auth/passkey/daftar` | Simpan passkey baru |
| PUT | `/api/auth/passkey/daftar` | Daftar passkey milik pengguna |
| DELETE | `/api/auth/passkey/daftar?id=` | Hapus passkey |
| POST | `/api/auth/recovery-phrase` | Ganti 24 kata pemulihan |
| POST | `/api/auth/mulai-baru` | Mulai dari nol; butuh sandi benar. Balas `perluKode` — kode email dikirim hanya kalau email sudah terverifikasi |
| PUT | `/api/auth/mulai-baru` | Pasang brankas baru; butuh sandi, plus kode email kalau akunnya terverifikasi |
| GET | `/api/auth/mulai-baru?email=` | Ringkasan arsip yang masih dalam masa tenggang |
| POST | `/api/auth/reset` | `{ email, recoveryAuthKey, authKeyNew, saltUserNew, kdfNew, wrappedMk, mkNonce, deviceName }` | `200 { userId, deviceId, accessToken }` |

`wrappedMk` hanya dikembalikan saat login kalau perangkat sudah terdaftar dan Mode Diperkuat tidak
aktif.

## Sinkronisasi

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/sync/pull?since=&limit=&sejakTanggal=` | Delta entri sejak rev tertentu, maksimal 200. `sejakTanggal` untuk sync selektif |
| POST | `/api/sync/push` | Batch maksimal 100 entri |
| DELETE | `/api/sync/entries/:id` | Tombstone |
| POST | `/api/sync/attachments` | Multipart, berisi ciphertext lampiran |
| GET | `/api/sync/attachments/:id` | Ciphertext lampiran; nonce dan kunci terbungkus di header |
| DELETE | `/api/sync/attachments/:id` | Hapus lampiran |

Item push: `{ id, entryDate, ciphertext, nonce, wrappedDek, dekNonce, sizeBucket, tagTokens,
clientUpdatedAt, baseRev, deleted? }`.

Response push per item: `{ id, status: 'ok' | 'conflict', rev, server? }`. Kalau ada satu saja
konflik, status HTTP-nya `409`.

Validasi server bekerja pada bentuk dan ukuran, bukan isi: `nonce` tepat 24 byte, `wrapped_dek`
tepat 48 byte, panjang `ciphertext` harus persis `size_bucket + 16`, `entry_date` antara 1900 dan
tahun depan.

## Perangkat

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/devices` | Daftar perangkat aktif |
| DELETE | `/api/devices/:id` | Cabut perangkat dan semua sesinya |
| POST | `/api/devices/transfer` | Buat sesi transfer, TTL 180 detik |
| GET | `/api/devices/transfer/:id` | Ambil blob, menaikkan penghitung percobaan |
| POST | `/api/devices/transfer/:id/confirm` | Konfirmasi, hapus blob, daftarkan perangkat |

## Publikasi

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/publish` | Daftar entri publik milik pengguna |
| POST | `/api/publish` | Terbitkan; `consent: true` wajib. Menerima `redactionApplied` dan `exposureScore` sebagai jejak Penyaring Identitas |
| PATCH | `/api/publish/:id` | Perbarui versi publik |
| DELETE | `/api/publish/:id` | Tarik, hard delete di server |
| GET | `/api/baca/feed?q=&sort=&tag=&mood=&penulis=&cursor=` | Feed publik, tanpa auth. `q` mencari judul dan isi, `mood` 1-5, `sort` `terbaru` atau `populer` |
| GET | `/api/baca/search?q=` | Pencarian entri publik, bentuk ringkas tanpa saringan |
| POST | `/api/baca/:id/react` | Reaksi, toggle |
| POST | `/api/baca/:id/report` | Laporan |

## Bukti

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/bukti/rows?entryId=` | Baris `entries` milik pengguna sendiri, apa adanya, dengan nama kolom asli Postgres |

Aman karena yang dikembalikan adalah ciphertext milik pemanggil sendiri: peladen memang tidak punya
bentuk lain untuk diberikan. Dipakai halaman `/bukti` (lihat `docs/THREAT-MODEL.md`).

Respons juga memuat `entry_tags` berisi token indeks buta — bukan nama tag — dan
`kolom_yang_tidak_ada` yang menyebut bidang plaintext yang memang tidak ada di tabel.

## Tautan rahasia

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/share` | Simpan ciphertext entri; DEK tetap di klien |
| GET | `/api/share` | Daftar tautan milik pengguna |
| GET | `/api/share/:id` | Ambil ciphertext, tanpa auth |
| DELETE | `/api/share/:id` | Cabut |

Kunci ada di fragment URL (`#k=`) yang tidak pernah dikirim ke server.

## Akun dan data

| Method | Path | Keterangan |
|---|---|---|
| PATCH | `/api/profile` | Nama pena, bio, tema, bahasa, mode paranoid |
| POST | `/api/account/hardened` | Aktifkan Mode Diperkuat, `confirm: "DIPERKUAT"` |
| DELETE | `/api/account` | Jadwalkan hapus akun, butuh `authKey` |
| POST | `/api/account/rotate-key` | Mulai rotasi kunci master, butuh `authKeyLama` |
| PUT | `/api/account/rotate-key` | Unggah batch entri yang sudah dibungkus ulang |
| GET | `/api/account/rotate-key` | Berapa entri yang masih memakai kunci lama |
| GET | `/api/push` | Status pengingat dan kunci publik VAPID |
| POST | `/api/push` | Daftarkan langganan push dan jam pengingat |
| PUT | `/api/push` | Kirim notifikasi uji |
| DELETE | `/api/push?endpoint=` | Cabut langganan |
| GET | `/api/arsip` | Brankas arsip milik pengguna, masih terenkripsi |
| GET | `/api/arsip/entri?since=&limit=` | Ciphertext entri terarsip |
| POST | `/api/arsip/entri` | Kembalikan entri yang sudah dibungkus ulang dengan kunci aktif |
| GET | `/api/cron/pengingat` | Kirim pengingat harian, dilindungi `CRON_SECRET` |
| GET | `/api/admin/reports?state=` | Antrean moderasi, butuh role moderator |
| POST | `/api/admin/reports` | `{ reportId, action: 'biarkan' \| 'tarik' }` |
| GET | `/api/cron/purge` | Retensi data, dilindungi `CRON_SECRET` |

Ekspor tidak punya endpoint: berkas ZIP dibangun di klien dari data lokal, karena server tidak bisa
membaca isinya.

## Rate limit

| Endpoint | Batas |
|---|---|
| `POST /api/auth/login` | 5 per menit per IP, 10 per jam per email |
| `/api/auth/passkey/*` | 5 per menit per IP |
| `POST /api/auth/register` | 3 per jam per IP |
| `GET /api/auth/params` | 20 per menit per IP |
| `POST /api/auth/recover` dan `/reset` | 5 per jam per IP |
| `/api/auth/mulai-baru` | 5 per jam per IP, 5 per jam per email |
| `POST /api/sync/push` | 60 per menit per akun |
| `POST /api/publish` | 5 per jam, 20 per hari per akun |
| `POST /api/baca/:id/report` | 10 per jam per IP |
| `GET /api/bukti/rows` | 30 per menit per akun |
| `GET /api/devices/transfer/:id` | 5 total per sesi, dicatat di database |
