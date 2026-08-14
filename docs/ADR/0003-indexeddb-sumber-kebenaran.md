# ADR 0003 — IndexedDB sebagai sumber kebenaran, server sebagai replika

Status: diterima
Tanggal: 2026-08-01

## Konteks

Aplikasi harus jalan penuh tanpa jaringan, dan server tidak bisa membaca isinya sehingga tidak bisa
melakukan merge, pencarian, atau validasi isi.

## Keputusan

IndexedDB (lewat Dexie) adalah sumber kebenaran. Server adalah replika terenkripsi yang menyimpan
Lamport counter per pengguna.

## Alasan

1. Menulis tidak boleh pernah menunggu jaringan. Autosave menulis ke IndexedDB, sinkronisasi
   menyusul.
2. Resolusi konflik harus terjadi di klien karena hanya klien yang bisa membaca isi entri.
3. Pencarian full-text harus lokal karena server hanya punya ciphertext.

## Konsekuensi

- Kuota IndexedDB bisa dihapus browser, terutama Safari iOS setelah 7 hari tidak dipakai. Dimitigasi
  dengan `navigator.storage.persist()` setelah pengguna menulis entri ketiga, plus server sebagai
  cadangan terenkripsi.
- Plaintext ada di IndexedDB saat kunci aplikasi tidak aktif. Ini didokumentasikan terbuka di
  halaman privasi dan model ancaman, bukan disembunyikan.
- Konflik menghasilkan versi tandingan sebagai kartu terpisah, bukan penimpaan diam-diam.
