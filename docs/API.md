# Kontrak API Cloister

Seluruh endpoint adalah SvelteKit server route di bawah `/api`. Tidak ada server terpisah.

## Aturan umum

| Hal | Ketentuan |
|---|---|
| Format | JSON masuk, JSON keluar. `Content-Type: application/json` |
| Otentikasi | `Authorization: Bearer <access token>`. Token JWT berumur 15 menit, disimpan **hanya di memori** klien |
| Perpanjangan sesi | Refresh token opaque di cookie `HttpOnly`, `Secure`, `SameSite=Strict`, diputar lewat `POST /api/auth/refresh` |
| Rute yang mengubah data | Wajib lolos `assertSameOrigin` |
| Validasi | Skema Valibot per endpoint. `strictObject` menolak properti tak dikenal |
| Format error | RFC 9457 Problem Details, `content-type: application/problem+json` |
| Rate limit | Sliding window per IP dan per akun; melampaui batas menghasilkan `429` dengan `Retry-After` |

### Bentuk error

```json
{
  "type": "https://cloister.app/problems/400",
  "title": "Permintaan tidak valid",
  "status": 400,
  "detail": "Kode gambar salah. Coba kode baru."
}
```

| Status | Arti |
|---|---|
| `400` | Skema tidak lolos, captcha gagal, atau honeypot terisi |
| `401` | Token tidak ada, kedaluwarsa, atau kredensial salah |
| `403` | Terotentikasi tapi tidak berhak, atau kuota terbit terlampaui |
| `404` | Sumber daya tidak ada atau bukan milik pemanggil |
| `409` | Konflik sinkronisasi |
| `413` | Payload melebihi batas (ciphertext maksimal 1 MiB + 16 byte tag) |
| `429` | Rate limit |

## Autentikasi

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/auth/tantangan` | | `200 { token, gambar, exp, panjang }` — captcha gambar, tanpa auth |
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
aktif. Inilah yang membuat pencurian sandi saja tidak cukup untuk membuka arsip.

### `GET /api/auth/tantangan`

```json
{ "token": "7PyDFFijs0rMXEEe.1786903581.3f1c…", "gambar": "data:image/png;base64,…",
  "exp": 1786903581, "panjang": 5 }
```

`gambar` adalah PNG berisi lima huruf yang diputar dan dilengkungkan, digambar server tanpa pustaka
luar. Kodenya tidak pernah ikut dikirim: yang ada di `token` hanya tanda tangan HMAC dari jawaban
yang benar. Klien mengirim `{ token, teks }` sebagai field `captcha`. Satu gambar berlaku untuk satu
percobaan, benar atau salah, dan kedaluwarsa 10 menit.

### `GET /api/auth/params?email=`

```json
{ "saltUser": "JumMYKZV7CIOMgtxnheNgQ==",
  "kdf": { "algo": "argon2id", "memKib": 65536, "time": 3, "parallel": 1 } }
```

Email yang tidak terdaftar tetap menerima salt deterministik dari `HMAC(server_secret, email)`,
sehingga tidak bisa dipakai untuk enumerasi akun.

### `POST /api/auth/register`

```jsonc
{
  "email": "kamu@contoh.id",
  "authKey": "<base64 32 B>",          // HKDF(Argon2id(sandi), "cloister:auth:v1")
  "saltUser": "<base64 16 B>",
  "kdf": { "algo": "argon2id", "memKib": 65536, "time": 3, "parallel": 1 },
  "wrappedMk": "<base64 48 B>",        // Master Key dibungkus KEK
  "mkNonce": "<base64 24 B>",
  "recoveryWrappedMk": "<base64 48 B>",
  "recoveryNonce": "<base64 24 B>",
  "recoverySalt": "<base64 16 B>",
  "recoveryAuthKey": "<base64 32 B>",
  "deviceName": "Chrome di macOS",
  "captcha": { "token": "…", "teks": "KJ4MT" },
  "situs": ""                          // honeypot, harus kosong
}
```

**Sandi, KEK, Master Key, dan 24 kata tidak pernah ada di badan permintaan mana pun.**

### `POST /api/auth/login`

```jsonc
{ "email": "…", "authKey": "<base64 32 B>", "deviceId": "<uuid, opsional>",
  "deviceName": "…", "platform": "…", "tiketPasskey": "<opsional>",
  "captcha": { "token": "…", "teks": "…" }, "situs": "" }
```

→ `200`

```jsonc
{
  "userId": "…", "accessToken": "…", "deviceId": "…",
  "deviceRegistered": true, "hardenedMode": false,
  "emailVerified": true, "syncRev": 42,
  "wrappedMk": "…", "mkNonce": "…"   // HANYA kalau perangkat sudah terdaftar
}
```

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

### `POST /api/sync/push`

```jsonc
{
  "entries": [{
    "id": "01a0043e-a84c-747c-a5f7-80666c25b517",
    "entryDate": "2026-08-15",
    "ciphertext": "<base64>",
    "nonce": "<base64 24 B>",
    "wrappedDek": "<base64 48 B>",
    "dekNonce": "<base64 24 B>",
    "sizeBucket": 4096,
    "tagTokens": ["<blind index base64 16 B>"],
    "clientUpdatedAt": "2026-08-15T12:02:28.960Z",
    "baseRev": 16
  }]
}
```

→ `200` `{ "results": [{ "id": "…", "status": "ok", "rev": 17 }], "serverRev": 17 }`

Pada `conflict`, server menyertakan versinya di `server` dan klien menyimpan **kedua** versi sebagai
jurnal bertanda konflik, tidak pernah menimpa diam-diam. Batas: maksimal 100 jurnal per permintaan,
ciphertext maksimal 1 MiB + 16 byte tag per jurnal, dan klien memecah kiriman per kelompok
maksimal 2,5 MB.

### `GET /api/sync/pull?since=0&limit=200`

```jsonc
{
  "entries": [{ "id": "…", "entryDate": "2026-08-15", "ciphertext": "…", "nonce": "…",
                "wrappedDek": "…", "dekNonce": "…", "sizeBucket": 4096, "rev": 17,
                "clientUpdatedAt": "…", "deletedAt": null }],
  "serverRev": 17,
  "hasMore": false
}
```

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
| GET | `/api/baca/:id/komentar` | Daftar komentar berutas (induk + balasan), tanpa auth |
| POST | `/api/baca/:id/komentar` | Kirim komentar atau balasan (`parentId`), butuh login. Komentar dari pemilik catatan diberi tanda `penulis`; kalau catatannya anonim, nama pena penulis ikut disembunyikan |
| DELETE | `/api/baca/:id/komentar?komentarId=` | Hapus komentar (soft delete, ikut balasannya). Boleh: penulis komentar atau pemilik catatan |

### `GET /api/baca/feed`

| Parameter | Nilai | Arti |
|---|---|---|
| `sort` | `terbaru` \| `populer` | Urutan |
| `tag` | string | Filter label |
| `q` | string | Kata kunci di judul dan isi |
| `mood` | 1-5 | Filter suasana hati |
| `gambar` | `1` | Hanya yang ada fotonya |
| `penulis` | nama pena | Filter penulis |
| `hal` | 1-500 | Halaman |

```jsonc
{
  "items": [{ "id", "slug", "title", "excerpt", "entryDate", "mood", "penName",
               "terverifikasi", "isAnonymous", "publishedAt", "viewCount",
               "reactionCount", "tags", "gambar", "jumlahGambar" }],
  "nextCursor": null, "total": 27, "hal": 1, "totalHal": 3, "tags": ["kota", "pagi"]
}
```

### `POST /api/publish`

```jsonc
{
  "sourceEntryId": "<uuid jurnal privat, opsional>",
  "title": "Kopi tubruk dan ampas yang mengendap",
  "bodyMd": "<HTML tersanitasi, maksimal 1.500.000 karakter>",
  "entryDate": "2026-08-13",
  "mood": 5,
  "tags": ["kopi", "pagi"],
  "isAnonymous": false,
  "visibility": "public",
  "redactionApplied": true,
  "exposureScore": 12,
  "consent": true          // wajib true, persetujuan keluar dari enkripsi
}
```

→ `201` `{ "id", "slug", "penName", "url", "moderationState" }`

Aturan yang ditegakkan server: email harus terverifikasi, nama pena harus ada kecuali anonim, batas
5 terbit per jam dan 20 per hari, dan akun berumur di bawah 24 jam masuk antrean tinjau
(`moderationState: "pending"`). `redactionApplied` dan `exposureScore` adalah **jejak** dari
Penyaring Identitas yang berjalan di perangkat; server tidak pernah memindai ulang karena ia tidak
punya catatan privatnya.

## Bukti

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/bukti/rows?entryId=` | Baris `entries` milik pengguna sendiri, apa adanya, dengan nama kolom asli Postgres |

Aman karena yang dikembalikan adalah ciphertext milik pemanggil sendiri: server memang tidak punya
bentuk lain untuk diberikan. Dipakai halaman `/bukti` (lihat `docs/THREAT-MODEL.md`).

Respons juga memuat `entry_tags` berisi token indeks buta, bukan nama tag, dan
`kolom_yang_tidak_ada` yang menyebut bidang plaintext yang memang tidak ada di tabel. Nama kolom
sengaja memakai nama aslinya di PostgreSQL supaya bisa dicocokkan langsung dengan `psql`.

```jsonc
{
  "tabel": "entries",
  "baris": { "id": "…", "user_id": "…", "entry_date": "2026-08-15",
             "ciphertext": "Ig+HEMEH1mqf+vY1BUqBEVMIgUELdIdy00UpkmLF06Sjkasf…",
             "nonce": "…", "wrapped_dek": "…", "dek_nonce": "…",
             "size_bucket": 4096, "key_version": 1, "rev": 17 },
  "ukuran": { "ciphertext_byte": 272, "nonce_byte": 24,
              "wrapped_dek_byte": 48, "dek_nonce_byte": 24 },
  "entry_tags": ["<blind index>"],
  "kolom_yang_tidak_ada": ["title", "body", "content", "mood", "tags", "location", "weather"]
}
```

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

Ekspor tidak punya endpoint: file ZIP dibangun di klien dari data lokal, karena server tidak bisa
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
| `POST /api/baca/:id/komentar` | 20 per jam per akun |
| `GET /api/devices/transfer/:id` | 5 total per sesi, dicatat di database |

## Yang sengaja **tidak** ada di API ini

| Tidak ada | Kenapa |
|---|---|
| Endpoint yang mengembalikan isi jurnal dalam bentuk terbaca | Server tidak punya kuncinya |
| Endpoint pencarian isi jurnal privat di server | Pencarian berjalan di perangkat |
| "Reset sandi" lewat email | Server tidak memegang kunci; yang bisa memulihkan hanya 24 kata pemulihan |
| Bidang `title`, `body`, atau `content` di rute privat mana pun | Skema Valibot menolaknya; diuji `tests/unit/validasi.test.ts` |
| Endpoint ekspor | File ZIP dibangun di klien dari data lokal, karena server tidak bisa membacanya |
