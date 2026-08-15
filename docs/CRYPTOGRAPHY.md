# Spesifikasi Kriptografi Cloister

Dokumen ini adalah sumber kebenaran untuk audit independen. Implementasinya ada di
`src/lib/crypto/`, dan test vector tetapnya di `tests/crypto-vectors/`.

Semua perubahan pada dokumen ini dan pada `src/lib/crypto/` butuh review dua maintainer.

## 0. Catatan versi label

Label pemisah domain (`cloister:mk:v1`, `cloister:kek:v1`, dan seterusnya) adalah bagian dari
format terenkripsi. **Mengubahnya membuat seluruh ciphertext lama tidak bisa dibuka lagi.**

Label ini pernah berganti sekali, dari prefiks `papan:` ke `cloister:` saat produk berganti nama,
sebelum ada pengguna nyata. Setelah rilis pertama, label hanya boleh berubah lewat kenaikan versi
(`:v2`) dengan jalur migrasi yang menulis ulang seluruh entri, seperti yang sudah tersedia untuk
rotasi kunci master di bagian 11.

## 1. Primitif

| Fungsi | Algoritma | Parameter |
|---|---|---|
| Key stretching | Argon2id | m = 64 MiB, t = 3, p = 1, keluaran 32 byte |
| Derivasi sub-kunci | HKDF-SHA-256 | RFC 5869, `info` berlabel versi |
| Enkripsi simetris | XChaCha20-Poly1305 (IETF) | nonce 24 byte acak, AAD wajib diisi |
| Hash berkunci | BLAKE2b | 16 byte untuk blind index, 8 byte untuk sidik jari |
| Random | `sodium.randombytes_buf` (CSPRNG) | |
| Mnemonic | BIP-39 wordlist Inggris | 256 bit entropi, 24 kata |

Implementasi libsodium: `libsodium-wrappers-sumo` (WASM). Argon2id dan XChaCha20-Poly1305 dipilih
karena WebCrypto tidak menyediakan keduanya.

HMAC-SHA256 diimplementasi manual di atas `crypto_hash_sha256` (`src/lib/crypto/kdf.ts`) karena
`crypto_auth_hmacsha256` libsodium hanya menerima kunci tepat 32 byte, sedangkan HKDF butuh kunci
panjang bebas. Implementasinya diverifikasi dengan RFC 5869 test case 1.

Semua nonce dihasilkan acak. Dengan nonce 192 bit, risiko tabrakan dapat diabaikan.

## 2. Hierarki kunci

```
Sandi pengguna
  └─ Argon2id(sandi, salt_user, m=64MiB, t=3, p=1) ──► Stretched Key (32 B)
       ├─ HKDF(info="cloister:auth:v1") ──► Auth Key    (dikirim ke server)
       └─ HKDF(info="cloister:kek:v1")  ──► KEK         (tidak pernah keluar perangkat)

Master Key (32 B acak)
  ├─ AEAD(KEK, MK, aad="cloister:mk:v1")            ──► wrapped_master_key
  ├─ AEAD(RecoveryKey, MK, aad="cloister:rmk:v1")   ──► recovery_wrapped_mk
  ├─ HKDF(info="cloister:index:v1")                 ──► Index Key (blind index tag)
  └─ AEAD(MK, DEK, aad=entryId)                  ──► wrapped_dek per entri

Frasa pemulihan 24 kata
  └─ Argon2id(frasa, recovery_salt) ──► Recovery Key
       └─ HKDF(info="cloister:recovery-auth:v1") ──► Recovery Auth Key (dikirim ke server)

DEK per entri (32 B acak)
  └─ AEAD(DEK, padded_payload, aad=entryId) ──► ciphertext entri
```

## 3. Registrasi

Seluruhnya terjadi di klien, di dalam Web Worker.

```
salt_user      = random(16)
stretched      = Argon2id(sandi, salt_user, m=64MiB, t=3, p=1, len=32)
authKey        = HKDF-SHA256(stretched, info="cloister:auth:v1", len=32)
kek            = HKDF-SHA256(stretched, info="cloister:kek:v1",  len=32)

MK             = random(32)
nonce_mk       = random(24)
wrappedMK      = XChaCha20Poly1305(kek, nonce_mk, MK, aad="cloister:mk:v1")

recoveryPhrase = BIP39(random(32))                 # 24 kata, ditampilkan sekali
rk_salt        = random(16)
recoveryKey    = Argon2id(recoveryPhrase, rk_salt, m=64MiB, t=3, p=1, len=32)
nonce_rmk      = random(24)
recoveryWrapped= XChaCha20Poly1305(recoveryKey, nonce_rmk, MK, aad="cloister:rmk:v1")
recoveryAuthKey= HKDF-SHA256(recoveryKey, info="cloister:recovery-auth:v1", len=32)
```

**Dikirim ke server:** `email`, `authKey`, `salt_user`, parameter KDF, `wrappedMK`, `nonce_mk`,
`recoveryWrappedMK`, `nonce_rmk`, `rk_salt`, `recoveryAuthKey`.

**Tidak pernah dikirim:** sandi, `stretched`, `kek`, `MK`, `recoveryPhrase`, `recoveryKey`.

Server menyimpan `scrypt(authKey ‖ pepper, salt_server)` bukan `authKey` mentah, supaya kebocoran
database tidak langsung memberi kredensial login. Hal yang sama berlaku untuk `recoveryAuthKey`.

Parameter KDF disimpan per pengguna sehingga bisa dinaikkan tanpa memutus akun lama. Klien
mem-benchmark perangkat saat registrasi dan menurunkan parameter ke m=32 MiB pada perangkat lemah.

## 4. Login

1. `GET /api/auth/params?email=…` mengembalikan `salt_user` dan parameter KDF.
   Untuk email tidak terdaftar, salt dibuat deterministik dari `HMAC(server_secret, email)` sehingga
   tidak bisa dibedakan dari akun asli.
2. Klien menurunkan `authKey` dan `kek`. `kek` disimpan di memori worker.
3. Klien mengirim `authKey` ke `POST /api/auth/login`.
4. Server memverifikasi lalu mengembalikan access token dan refresh token.
5. Server mengembalikan `wrappedMK` **hanya jika perangkat sudah terdaftar** dan Mode Diperkuat
   tidak aktif.
6. Klien membuka `MK` dengan `kek` di dalam worker.

## 5. Enkripsi entri

Setiap entri punya DEK sendiri, supaya berbagi satu entri tidak pernah membocorkan MK.

```
DEK        = random(32)
payload    = JSON({ v, title, body, mood, tags, weather, location,
                    attachments, createdAt, updatedAt })
padded     = pad(payload)                  # ISO 7816-4 ke bucket tetap
ciphertext = XChaCha20Poly1305(DEK, nonce_e, padded, aad = entryId)
wrappedDEK = XChaCha20Poly1305(MK,  nonce_d, DEK,    aad = entryId)
```

Bucket ukuran: 256, 1024, 4096, 16384, 65536, 131072, 262144, 524288, 1048576 byte (bucket besar untuk catatan bergambar). Padding memakai byte `0x80` diikuti nol.

`entryId` sebagai AAD mengikat ciphertext ke entrinya, sehingga server tidak bisa menukar isi antar
entri tanpa terdeteksi.

## 6. Lampiran

```
FileKey        = random(32)
ct_file        = XChaCha20Poly1305(FileKey, nonce_f,  fileBytes, aad = attachmentId)
wrappedFileKey = XChaCha20Poly1305(MK,      nonce_wf, FileKey,   aad = attachmentId)
```

Metadata EXIF dihapus di klien sebelum enkripsi dengan melewatkan gambar melalui canvas. Gambar
juga di-resize ke maksimal 2048 px sisi terpanjang dan dikonversi ke WebP.

## 7. Blind index untuk tag

```
indexKey = HKDF-SHA256(MK, info="cloister:index:v1", len=32)
tagToken = base64(BLAKE2b(key=indexKey, msg=normalize(tag), len=16))
```

Server menyimpan `tagToken`, bukan tag. **Kelemahan yang harus disampaikan jujur:** server bisa
menghitung frekuensi tag dan melakukan analisis pola meski tidak tahu isinya. Pengguna bisa
mengaktifkan mode paranoid di Pengaturan supaya tag tidak dikirim sama sekali dan filter berjalan
lokal saja.

## 8. Ganti sandi

Tidak menyentuh entri sama sekali.

```
salt_user_baru = random(16)
stretched_baru = Argon2id(sandi_baru, salt_user_baru, …)
kek_baru       = HKDF(stretched_baru, "cloister:kek:v1")
wrappedMK_baru = XChaCha20Poly1305(kek_baru, nonce_baru, MK, aad="cloister:mk:v1")
```

Klien mengirim `authKey_lama` untuk verifikasi, lalu `authKey_baru`, `salt_user_baru`, dan
`wrappedMK_baru`. Server mencabut semua refresh token kecuali sesi saat ini dan mengirim email
notifikasi.

## 9. Pemulihan dengan 24 kata

```
recoveryKey     = Argon2id(frasa, rk_salt, …)
MK              = AEAD.open(recoveryKey, recovery_wrapped_mk, nonce_rmk, "cloister:rmk:v1")
recoveryAuthKey = HKDF(recoveryKey, "cloister:recovery-auth:v1")
```

`recoveryAuthKey` dikirim ke `POST /api/auth/reset` sebagai bukti kepemilikan frasa. Server
memverifikasinya terhadap hash tersimpan, lalu menerima `authKey` dan `wrappedMK` baru.

Frasanya sendiri tidak pernah dikirim. Checksum BIP-39 diverifikasi di klien sebelum Argon2id
dijalankan, sehingga salah ketik langsung ketahuan.

## 10. Transfer perangkat

```
transferSecret = random(32)                                  # dibawa QR
pin            = random 6 digit                              # ditampilkan terpisah
salt           = BLAKE2b(transferSecret, len=16)
pinKey         = Argon2id(pin, salt, m=64MiB, t=4)
transferKey    = HKDF(pinKey ‖ transferSecret, "cloister:transfer:v1")
blob           = XChaCha20Poly1305(transferKey, nonce, MK, aad="cloister:transfer-blob:v1")
```

Server menyimpan `blob` dan `nonce` selama 180 detik dengan maksimal 5 percobaan pengambilan.

**Kenapa QR dan PIN dua-duanya.** QR membawa 256 bit entropi, itu yang mencegah brute force. PIN
6 digit hanya 20 bit dan tidak cukup sendirian; fungsinya mencegah serangan di mana QR terekam
kamera lain di ruang publik. Penyerang yang punya QR tetap butuh PIN yang ditampilkan terpisah, dan
5 percobaan dalam 180 detik membuat tebakan PIN tidak layak.

Alternatif tanpa kamera: kode manual base32 yang berisi `sessionId` dan rahasia yang sama.

## 11. Rotasi kunci master

Dipakai kalau sebuah perangkat benar-benar hilang: mencabut perangkat tidak menghapus MK yang
mungkin masih ada di memorinya.

```
MK_baru        = random(32)
salt_baru      = random(16)
kek_baru       = HKDF(Argon2id(sandi_baru, salt_baru), "cloister:kek:v1")
wrappedMK_baru = AEAD(kek_baru, nonce, MK_baru, aad="cloister:mk:v1")
frasa_baru     = BIP39(random(32))            # frasa lama berhenti berlaku
```

Untuk setiap entri, klien membaca plaintext dari IndexedDB lalu mengenkripsi ulang dengan `MK_baru`
dan DEK baru. Server hanya menerima ciphertext baru; ia tidak pernah bisa membandingkan isi lama dan
baru.

Selama rotasi, worker memegang `MK_lama` dan `MK_baru` sekaligus. Kalau proses gagal di tengah,
`batalkanRotasiMk` mengembalikan `MK_lama` supaya arsip lokal tetap terbuka; entri yang sudah
terlanjur diunggah dengan kunci baru terdeteksi lewat `key_version` yang berbeda dan dilaporkan di
`GET /api/account/rotate-key`.

Blind index tag ikut berubah karena `indexKey` diturunkan dari MK. `key_version` di `users` dan
`entries` dinaikkan, dan semua sesi perangkat lain dicabut sehingga harus menyambung ulang.

## 11b. Mulai dari nol

Untuk pengguna yang masih ingat sandi tapi kehilangan 24 kata **dan** semua perangkat
terdaftar. Tanpa jalur ini mereka terkunci permanen dan bahkan tidak bisa masuk.

```
MK_baru        = random(32)                    # dibuat di perangkat, seperti registrasi
frasa_baru     = BIP39(random(32))
wrappedMK_baru = AEAD(kek_baru, nonce, MK_baru, aad="cloister:mk:v1")
```

Brankas lama **diarsipkan, bukan dihapus**: `recovery_wrapped_mk`, `recovery_mk_nonce`,
`recovery_salt`, `recovery_auth_hash`, dan parameter KDF-nya dipindahkan ke `key_archives`
dengan `purge_after = now() + 30 hari`. Seluruh entri lama ditandai `archived_at` dan
dikeluarkan dari sinkronisasi, tapi ciphertext-nya tetap utuh.

Kalau 24 kata lama ditemukan dalam masa tenggang, klien membuka MK lama dari arsip,
mendekripsi entri terarsip di dalam worker, membungkusnya ulang dengan MK aktif, lalu
mengembalikannya ke arsip utama. Kunci arsip hidup terpisah dari kunci aktif di worker dan
dibuang setelah selesai.

**Kenapa butuh kode email.** Kalau sandi saja cukup, siapa pun yang tahu sandi bisa
menghanguskan seluruh jurnal secara permanen — kerusakan yang tidak bisa dibatalkan, jauh
lebih buruk daripada sekadar membacanya. Kode email menuntut penyerang juga menguasai kotak
masuk, dan masa tenggang 30 hari memberi pemilik asli kesempatan membatalkan efeknya.

Mode Diperkuat dimatikan setelah mulai dari nol, karena pengguna baru saja membuktikan
bahwa jalur pemulihannya rapuh.

## 12. Kunci aplikasi lokal

```
vaultSalt = random(16)
vaultKey  = Argon2id(PIN_lokal, vaultSalt, m=64MiB, t=3)
vaultBlob = XChaCha20Poly1305(vaultKey, nonce, MK, aad="cloister:vault:v1")
```

Saat aktif, MK dibuang dari memori worker setelah 5 menit idle dan hanya bisa dibuka lagi dengan
PIN lokal.

## 13. Passkey sebagai faktor kedua

WebAuthn dipakai sebagai faktor kedua, **bukan** pengganti sandi. Sandi tetap satu-satunya yang
menurunkan KEK; passkey tidak memegang materi kunci enkripsi sama sekali.

Alur masuk saat akun punya passkey:

1. Klien meminta tantangan ke `GET /api/auth/passkey/masuk?email=…`. Tantangan selalu diberikan,
   bahkan untuk email tak terdaftar, supaya tidak bisa dipakai enumerasi akun.
2. Authenticator menandatangani tantangan.
3. `POST /api/auth/passkey/masuk` memverifikasi tanda tangan dan menerbitkan tiket sekali pakai
   berumur 180 detik.
4. `POST /api/auth/login` menolak permintaan tanpa tiket itu kalau akun punya passkey terdaftar.

Konsekuensi yang harus disampaikan jujur: kalau semua perangkat berisi passkey hilang, jalan masuk
yang tersisa hanya 24 kata pemulihan.

## 14. Apa yang diketahui server

| Server tahu | Server tidak tahu |
|---|---|
| Alamat email | Isi tulisan |
| Kapan entri dibuat dan diubah | Judul |
| Tanggal entri (`entry_date`) | Mood |
| Berapa banyak entri yang dimiliki | Nama tag (hanya token buta) |
| Bucket ukuran ciphertext | Isi lampiran |
| Jumlah dan bucket ukuran lampiran | Lokasi |
| Alamat IP dan user agent (log 7 hari) | Sandi atau frasa pemulihan |
| Daftar perangkat dan kapan terakhir sync | |

## 15. Keterbatasan yang diakui

1. **Pengiriman kode.** Cloister adalah aplikasi web; JavaScript yang menjalankan enkripsi dikirim oleh
   server setiap kali halaman dibuka. Server yang dikompromikan bisa mengirim kode jahat. Ini
   keterbatasan mendasar semua aplikasi E2EE berbasis web. Mitigasi: tidak ada CDN pihak ketiga,
   semua aset self-host, CSP ketat, hash bundle dipublikasikan tiap rilis. Pengguna dengan model
   ancaman ini sebaiknya self-host.
2. **Plaintext di IndexedDB.** Saat kunci aplikasi tidak aktif, entri tersimpan plaintext di
   IndexedDB untuk kecepatan baca dan pencarian. Siapa pun yang punya akses ke profil browser bisa
   membacanya.
3. **Analisis frekuensi tag.** Lihat bagian 7.
4. **`entry_date` plaintext.** Sengaja dibuka supaya sinkronisasi parsial per bulan mungkin
   dilakukan.
