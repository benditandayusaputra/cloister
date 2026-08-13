# Model Ancaman Cloister

Dokumen ini menyebut apa yang Cloister lindungi, apa yang tidak, dan kenapa.

## Aset yang dilindungi

1. Isi tulisan jurnal privat (paling penting)
2. Judul, mood, nama tag, lokasi, isi lampiran
3. Master Key dan frasa pemulihan
4. Identitas penulis di entri anonim

Yang **tidak** dilindungi dan memang sengaja: entri yang diterbitkan pengguna ke halaman publik.

## T1 — Operator server jahat atau dipaksa hukum

**Kemampuan:** baca penuh database dan blob storage, ubah kode yang dikirim.

**Mitigasi:** enkripsi ujung ke ujung. Yang bisa diserahkan hanya ciphertext dan metadata di
`docs/CRYPTOGRAPHY.md` bagian 12.

**Sisa risiko:** operator bisa mengirim JavaScript jahat ke pengguna berikutnya dan mencuri kunci
saat itu juga. Tidak ada mitigasi teknis penuh untuk aplikasi web. Yang bisa dilakukan: hash bundle
dipublikasikan tiap rilis dan ditandatangani, tidak ada CDN pihak ketiga, dan self-hosting tersedia
untuk yang butuh.

## T2 — Pencuri database

**Kemampuan:** salinan penuh dump Postgres dan blob.

**Mitigasi:** sama seperti T1, ditambah `auth_hash` yang di-scrypt ulang di server dengan pepper
dari environment (tidak ada di database). Kebocoran DB saja tidak memberi kredensial login.

## T3 — Penyerang jaringan (MITM)

**Mitigasi:** HTTPS wajib, HSTS dengan preload, tidak ada plaintext jurnal yang pernah melewati
jaringan. Bahkan tanpa TLS, penyerang hanya melihat ciphertext.

## T4 — Pencuri sandi (phishing, kredensial dipakai ulang)

**Kemampuan:** tahu email dan sandi.

**Mitigasi berlapis:**

- Server tidak mengirim `wrappedMK` ke perangkat yang belum terdaftar, meski login berhasil.
  Penyerang masuk ke akun tapi tidak bisa membuka satu entri pun.
- Mode Diperkuat menghapus `wrappedMK` dari server sepenuhnya. Satu-satunya jalur masuk adalah
  transfer dari perangkat aktif atau 24 kata.
- Passkey sebagai faktor kedua. Kalau akun punya passkey terdaftar, sandi yang benar saja ditolak
  di `POST /api/auth/login`.

**Sisa risiko:** penyerang yang juga punya frasa pemulihan bisa masuk penuh. Frasa harus disimpan
offline.

## T4b — Perangkat lama masih menyimpan kunci

**Kemampuan:** perangkat yang pernah terdaftar, sekarang di tangan orang lain, dengan MK mungkin
masih ada di IndexedDB atau memori.

**Mitigasi:** rotasi kunci master di Pengaturan → Keamanan. Kunci master baru dibuat, seluruh entri
dienkripsi ulang di perangkat tepercaya, `key_version` naik, dan semua sesi lain dicabut. Frasa
pemulihan lama sekaligus berhenti berlaku.

**Sisa risiko yang harus disampaikan jujur:** salinan plaintext yang sudah terlanjur ada di
perangkat itu tidak bisa ditarik kembali. Rotasi menutup akses ke tulisan *berikutnya* dan ke
sinkronisasi, bukan menghapus yang sudah tersalin.

## T4c — Penyerang menghanguskan jurnal lewat "mulai dari nol"

**Kemampuan:** tahu sandi, ingin merusak alih-alih membaca.

**Mitigasi:**

- Akun dengan email terverifikasi butuh kode enam angka yang dikirim ke sana, jadi penyerang
  harus menguasai kotak masuk juga
- Brankas dan entri lama diarsipkan 30 hari, bukan dihapus; pemilik yang punya 24 kata lama
  bisa mengambil semuanya kembali
- Email pemberitahuan dikirim saat kode diminta dan saat prosesnya selesai
- Semua perangkat dikeluarkan dan tercatat di audit log

**Sisa risiko A — akun terverifikasi:** penyerang yang menguasai kotak masuk sekaligus tahu
sandi bisa membuat pemilik kehilangan akses selama masa tenggang, dan setelah 30 hari
kehilangan datanya permanen. Ini disampaikan terbuka di layar konfirmasi.

**Sisa risiko B — akun tanpa verifikasi email:** di sini tidak ada faktor kedua sama sekali,
jadi sandi ditambah konfirmasi ketikan sudah cukup untuk mengarsipkan jurnal. Ini pilihan
sadar: verifikasi email tidak diwajibkan saat mendaftar, dan memaksakan kode ke alamat yang
belum terbukti bisa dihubungi hanya akan mengunci pemiliknya sendiri — persis jalan buntu yang
mau dihilangkan T4c. Arsip 30 hari tetap berlaku, tapi hanya berguna kalau 24 katanya ada.
Pengguna yang mau faktor kedua ini tinggal memverifikasi emailnya.

## T5 — XSS (ancaman paling serius)

Pada aplikasi E2EE berbasis web, XSS menghapus seluruh jaminan keamanan.

**Mitigasi:**

1. CSP ketat tanpa `unsafe-eval` untuk skrip, dikonfigurasi di `vite.config.ts`.
2. Master Key hanya hidup di Web Worker terpisah. Thread utama hanya bisa meminta operasi, tidak
   pernah menerima kunci. XSS masih bisa meminta dekripsi semua entri, tapi tidak bisa mengekstrak
   kunci untuk eksfiltrasi permanen.
3. Satu-satunya `{@html}` di seluruh basis kode ada di `AmanMarkdown.svelte`, dan isinya selalu
   lewat DOMPurify dengan allowlist ketat.
4. `javascript:`, `data:` non-gambar, atribut `on*`, `<iframe>`, `<object>`, `<embed>`, `<form>`
   diblokir di renderer markdown. Tautan eksternal otomatis `rel="noopener noreferrer nofollow"`.
5. Header pendukung dipasang di `hooks.server.ts`.

**Sisa risiko:** XSS pada halaman aplikasi tetap berbahaya. Pemisahan origin penuh untuk `/baca`
disiapkan lewat `PUBLIC_READ_ORIGIN`.

## T6 — Rantai pasok

**Kemampuan:** dependensi jahat atau CDN dikompromikan.

**Mitigasi:** tidak ada CDN pihak ketiga sama sekali — font di-host sendiri di `static/fonts/`.
Lockfile terkunci, `pnpm install --frozen-lockfile` di CI, Dependabot dan CodeQL aktif.

## T7 — Perangkat pengguna dicuri

**Mitigasi:** kunci aplikasi dengan PIN lokal. Saat aktif, MK dibungkus kunci turunan PIN dan
dibuang dari memori setelah 5 menit idle.

**Sisa risiko:** kalau kunci aplikasi tidak aktif, plaintext ada di IndexedDB dan bisa dibaca siapa
pun yang punya akses ke profil peramban. Ini dinyatakan terbuka di halaman privasi.

## T8 — Penyerang menebak PIN transfer

**Kemampuan:** punya QR (misalnya terekam kamera lain) tapi tidak PIN.

**Mitigasi:** 5 percobaan dihitung di database, sesi hidup 180 detik, rate limit per IP. Menebak
20 bit dalam 5 percobaan tidak layak.

## T9 — Spam dan penyalahgunaan feed publik

**Mitigasi:** verifikasi email wajib sebelum menerbitkan, rate limit 5 per jam dan 20 per hari per
akun, akun berumur di bawah 24 jam masuk antrean tinjau, 3 laporan valid menyembunyikan entri
otomatis, dashboard moderasi di `/pengaturan/moderasi`.

Server tidak bisa dan tidak akan memindai entri privat. Moderasi hanya menyentuh yang sudah
diterbitkan penulisnya.

## T10 — Penyerang membaca IndexedDB

Sama seperti T7. Didokumentasikan terbuka, bukan disembunyikan.

## T11 — Pengguna sendiri membocorkan orang lain saat menerbitkan

**Kemampuan:** tidak ada penyerang di sini. Ancamannya adalah pengguna yang menulis
"kemarin ketemu Rina di kosnya di Jl. Kaliurang No. 14" lalu menerbitkannya tanpa sadar bahwa
kalimat itu memaparkan orang ketiga yang tidak pernah memberi persetujuan.

**Mitigasi:** Penyaring Identitas berjalan otomatis saat modal Terbitkan dibuka, sebelum apa pun
dikirim ke peladen. Rinciannya di `docs/REDACTION.md`.

**Sisa risiko:** penyaring adalah alat bantu, bukan jaminan. Nama panggilan, singkatan, dan cara
menulis yang tidak lazim masih bisa terlewat. Skor paparan tidak pernah memblokir penerbitan,
karena keputusan tetap milik pengguna.

## Keterbatasan PIN Darurat dan ruang umpan

PIN darurat dan ruang umpan **tidak** ada di rilis ini. Rancangannya sudah selesai (kedua vault
disimpan dengan ukuran dan struktur identik, keduanya selalu dicoba supaya waktu eksekusinya sama,
catatan ruang umpan tidak pernah disinkronkan), tapi penjelasan batasnya belum bisa ditulis dengan
cukup jelas untuk pengguna awam, dan fitur keamanan yang salah dipahami lebih buruk daripada tidak
ada. Yang wajib ikut disampaikan saat fitur ini dirilis nanti:

- Penyerang yang memeriksa IndexedDB secara forensik akan melihat dua vault dan bisa menyimpulkan
  keberadaan ruang umpan. Menyembunyikan ini sepenuhnya di peramban tidak mungkin.
- Penyerang yang punya akses ke akun peladen bisa melihat bahwa jumlah catatan di peladen tidak
  cocok dengan yang terlihat di ruang umpan.
- Fitur ini menaikkan biaya serangan, bukan menghilangkannya.

Yang sudah ada sekarang adalah kunci ruang dengan PIN lokal tunggal (T7).

## Keterbatasan verifikasi build

`scripts/verify.sh` menghitung SHA-256 setiap aset yang dilayani produksi dan membandingkannya
dengan `build-manifest.json` yang dihasilkan CI. Ini menjawab pertanyaan "bagaimana saya tahu
JavaScript yang dikirim peladen tidak disisipi backdoor" — tapi hanya sebagian.

**Yang terdeteksi:** penggantian menyeluruh, yaitu ketika peladen melayani bundle berbeda kepada
semua orang.

**Yang tidak terdeteksi:** penggantian selektif, yaitu ketika peladen melayani bundle jahat hanya
kepada satu pengguna yang ditargetkan dan bundle bersih kepada pemeriksa. Mitigasi untuk kasus ini
membutuhkan pemverifikasi di luar halaman itu sendiri — ekstensi peramban atau transparency log —
dan itu ada di roadmap, bukan di rilis ini.

## Yang di luar cakupan

- Malware dengan hak root di perangkat pengguna
- Serangan rantai pasok pada peramban atau sistem operasi
- Analisis lalu lintas jaringan tingkat negara terhadap pola waktu sinkronisasi
- Coercion fisik terhadap pengguna

## Melaporkan

Lihat `SECURITY.md`. Kebijakan disclosure 90 hari.
