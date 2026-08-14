# Sinkronisasi Multi-Perangkat

Kode: [`src/lib/sync/`](../src/lib/sync/) dan [`src/routes/api/sync/`](../src/routes/api/sync/).
Tes: [`tests/unit/konflik.test.ts`](../tests/unit/konflik.test.ts),
[`tests/unit/jendela-sync.test.ts`](../tests/unit/jendela-sync.test.ts),
[`tests/e2e/dua-perangkat.spec.ts`](../tests/e2e/dua-perangkat.spec.ts).

---

## 1. Model

Sumber kebenaran ada di IndexedDB perangkat pengguna. Server adalah **replika terenkripsi**, bukan
otoritas. Kalimat itu bukan slogan: seluruh alur tulis, baca, sunting, hapus, dan cari berjalan
tanpa server, dan aplikasi tidak pernah menunggu jaringan untuk menampilkan apa pun.

Delta sync berbasis Lamport counter per pengguna (`users.sync_rev`). Setiap perubahan menaikkan
`rev`, dan yang mengelola kenaikan itu adalah server, supaya urutannya monoton di semua perangkat.

- **Pull** — `GET /api/sync/pull?since=<rev>&limit=200`
- **Push** — `POST /api/sync/push`, batch maksimal 100 perubahan, masing-masing membawa `baseRev`

Batas 100 dan 200 bukan angka acak: fungsi Node di Vercel tier Hobby mati di 10 detik, dan batch
sebesar itu selesai jauh di bawahnya bahkan pada koneksi lambat.

## 2. Apa yang menyeberang

Item push:

```
{ id, entryDate, ciphertext, nonce, wrappedDek, dekNonce,
  sizeBucket, keyVersion, schemaVersion, tagTokens[],
  clientUpdatedAt, deviceId, baseRev }
```

Tidak ada `title`, `body`, `content`, `mood`, `tags`, `location`, maupun `weather`. Semuanya ada di
dalam `ciphertext`. Batas ini ditegakkan tiga lapis:

1. **Skema Valibot** di rute sinkronisasi menolak properti tak dikenal.
2. **Tes unit** memastikan skema itu menolak bidang terlarang secara eksplisit.
3. **Tes E2E** `no-plaintext-on-server.spec.ts` menulis catatan berisi frasa penanda unik, memicu
   sinkronisasi, lalu membaca seluruh isi tabel `entries` langsung dari Postgres dan memastikan
   frasa itu tidak muncul dalam bentuk apa pun — utf8, base64, maupun hex.

`entryDate` sengaja dibiarkan terbaca. Ia dipakai untuk indeks, paginasi, dan jendela sinkronisasi
selektif. Konsekuensinya jujur: server tahu kapan seseorang menulis, meski tidak tahu apa. Ini
tercatat di tabel "Apa yang diketahui server" di `THREAT-MODEL.md` dan di halaman `/privasi`.

## 3. State machine klien

```
                 online, ada rev baru / timer
        Idle ─────────────────────────────────► Pulling
         │  ▲                                      │
         │  │ tidak ada konflik                    │ data diterima
         │  └──────────── Merging ◄────────────────┘
         │                  │ baseRev tertinggal
         │                  ▼
         │               Conflict ──► Resolving ──► UserChoice
         │
         │ antrean lokal tidak kosong
         ├──────────────────────────► Pushing ──► 409 ──► Conflict
         │                                └──► gagal jaringan ──► Backoff
         │                                          (2s, 4s, 8s, maks 60s)
         └── navigator.onLine false ──► Offline ──► online kembali ──► Idle
```

Pemicu putaran: timer periodik, event `online`, dan setiap kali antrean lokal bertambah. Saat
offline, pita di bawah header — bukan toast melayang — menampilkan status dan jumlah antrean.

## 4. Resolusi konflik

Kebijakan: **tidak pernah menimpa diam-diam.**

1. Server menolak push yang `baseRev`-nya tertinggal dengan `409 Conflict` dan mengembalikan versi
   miliknya.
2. Klien mencoba merge otomatis. Merge hanya dilakukan untuk perubahan yang jelas tidak bentrok:
   badan tulisan sama persis, yang berubah cuma tag, mood, atau daftar lampiran. Merge dikerjakan
   di klien karena hanya klien yang bisa membaca isinya.
3. Kalau merge tidak aman, klien membuat **catatan tandingan** berlabel
   "Versi dari &lt;nama perangkat&gt;, &lt;waktu&gt;" pada tanggal yang sama. Tidak ada data yang hilang.
4. Papan menampilkan dua kartu bertumpuk miring dengan badge "Dua versi", dan layar perbandingan
   berdampingan dengan pilihan "Simpan yang ini", "Simpan keduanya", dan "Gabungkan".

Tie-break saat timestamp identik: `clientUpdatedAt` lebih dulu, lalu perbandingan leksikografis
`deviceId`. Deterministik, jadi dua perangkat yang bertemu di titik yang sama sampai pada keputusan
yang sama tanpa perlu bicara.

## 5. Idempotensi

Setiap item membawa `id` (UUIDv7 dibuat klien) dan `clientUpdatedAt`. Push dengan pasangan nilai
yang sama dengan yang sudah tersimpan dijawab `200` tanpa efek samping. Ini yang membuat percobaan
ulang setelah timeout aman — dan percobaan ulang setelah timeout adalah kejadian normal di jaringan
seluler, bukan kasus tepi.

## 6. Jendela sinkronisasi selektif

Pengguna dengan riwayat panjang tidak perlu menarik seluruhnya ke setiap perangkat. `jendela.ts`
membatasi pull ke rentang tanggal yang dipilih (misalnya 12 bulan terakhir), disimpan sebagai
preferensi perangkat. Catatan di luar jendela tetap ada di server dan bisa ditarik kapan saja.

## 7. Penyambungan perangkat baru

Dua lapis perlindungan:

**Lapis kebijakan (ditegakkan server).** Server tidak mengirim `wrappedMk` ke perangkat yang belum
terdaftar meskipun login berhasil. Pencuri sandi tidak langsung mendapat isi.

**Lapis kriptografis (Mode Diperkuat, opsional).** Server tidak menyimpan `wrappedMk` sama sekali.
Satu-satunya jalur masuk ke perangkat baru adalah transfer dari perangkat lama atau 24 kata
pemulihan. Pengguna harus mengetik kata "DIPERKUAT" untuk mengaktifkannya.

Protokol transfer dan alasan kenapa QR **dan** PIN dua-duanya dibutuhkan ada di
`CRYPTOGRAPHY.md` bagian transfer perangkat.

## 8. Pencabutan perangkat

Efeknya: semua refresh token perangkat itu dicabut dan perangkatnya dikeluarkan dari daftar
terdaftar.

Yang wajib disampaikan jujur ke pengguna, dan memang ditampilkan di antarmuka: **pencabutan tidak
menghapus data yang sudah tersimpan lokal di perangkat itu**, dan tidak menghilangkan kunci utama
yang mungkin masih ada di sana. Kalau perangkat benar-benar jatuh ke tangan orang lain, langkah yang
benar adalah ganti sandi lalu rotasi kunci utama.

## 9. Rotasi kunci utama

Ciphertext catatan tidak perlu didekripsi ulang — hanya DEK-nya yang dibungkus ulang dengan kunci
utama baru. Untuk 5.000 catatan itu sekitar 10.000 operasi AEAD, di bawah tiga detik di perangkat
kelas menengah.

Rotasi berjalan dalam batch, bisa dilanjutkan kalau terputus, dan menampilkan progres. Selama
rotasi berjalan, perangkat lain diberi tanda untuk menarik ulang setelah selesai.
