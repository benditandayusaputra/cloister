# Kebijakan Konten Halaman Publik

Kebijakan ini hanya berlaku untuk catatan yang **sengaja diterbitkan** penulisnya ke `/baca`.
Catatan privat tetap terenkripsi dan tidak bisa, serta tidak akan, dipindai siapa pun — server
memang tidak memiliki kemampuan itu.

Pemisahan tabel `entries` dan `public_entries` adalah implementasi dari pemisahan tanggung jawab
ini, bukan sekadar kebijakan tertulis.

## Tidak diperbolehkan

- Doxxing atau membuka identitas orang lain tanpa izin
- Pelecehan terarah terhadap individu
- Konten seksual yang melibatkan anak
- Ajakan atau instruksi menyakiti diri sendiri maupun orang lain
- Spam, iklan, dan skema penipuan
- Konten yang melanggar hukum di yurisdiksi operator

## Yang diperbolehkan meski berat

Cloister adalah aplikasi jurnal. Tulisan tentang depresi, kecemasan, duka, dan kesulitan hidup **boleh
diterbitkan**. Menceritakan pengalaman sulit bukan pelanggaran.

Yang membedakan: menceritakan pengalaman berbeda dari mengajak orang lain menyakiti diri.

## Penanganan laporan

| Situasi | Tindakan |
|---|---|
| Akun berumur di bawah 24 jam | Masuk antrean tinjau sebelum tampil di feed |
| 3 laporan valid | Catatan disembunyikan otomatis sampai ditinjau |
| Indikasi bahaya diri | Masuk antrean prioritas |
| Pelanggaran berulang | Batas terbit diturunkan, lalu akun ditangguhkan |

Sebelum sebuah catatan terbit, Penyaring Identitas berjalan di perangkat penulisnya dan menandai
informasi yang bisa mengarah ke orang tertentu. Ia tidak pernah memblokir — keputusan tetap milik
penulis — tapi ia menurunkan jumlah doxxing yang tidak disengaja sebelum kebijakan ini perlu
dipakai. Rinciannya di [`docs/REDACTION.md`](docs/REDACTION.md).

Halaman publik selalu menampilkan tautan sumber daya krisis di footer. Untuk Indonesia: layanan
konseling Kemenkes di 119 ext 8.

## Banding

Kirim ke **benditandayusaputra@gmail.com** dengan subjek diawali `[BANDING]`, sertakan URL catatan
dan alasannya. Dibalas dalam 72 jam.

## Catatan untuk instans lain

Cloister berlisensi AGPL-3.0 dan bisa dijalankan siapa saja. Kalau kamu menjalankan instansmu
sendiri, ganti alamat banding di atas dengan alamatmu, dan sesuaikan bagian "melanggar hukum di
yurisdiksi operator" dengan yurisdiksimu.
