# ADR 0001 — SvelteKit 2 dan Svelte 5, bukan Next.js atau Nuxt

Status: diterima
Tanggal: 2026-08-01

## Konteks

Cloister adalah PWA offline-first dengan enkripsi ujung ke ujung. Semua data privat diproses di klien,
jadi ukuran bundle klien dan kesederhanaan state reaktif adalah dua hal yang paling menentukan.

## Keputusan

SvelteKit 2 dengan Svelte 5 (runes).

## Alasan

1. **Ukuran bundle.** Kami punya anggaran ketat: di bawah 180 KB gzip untuk `/app` dan di bawah
   40 KB untuk `/baca`. Next.js menghasilkan bundle yang jauh lebih besar untuk fungsi yang sama.
2. **RSC tidak memberi nilai di sini.** Model React Server Components menambah kompleksitas untuk
   keuntungan yang tidak kami dapatkan: semua data privat harus diproses di klien karena server
   tidak bisa membacanya.
3. **Runes cocok untuk state sync.** Sinkronisasi, antrean offline, dan status kunci adalah state
   lintas komponen yang rumit. `$state` dan `$derived` di modul `.svelte.ts` biasa memberi store
   global tanpa boilerplate.
4. **Adapter hybrid per route.** `/baca` bisa SSR dengan cache CDN sementara `/app` sepenuhnya CSR,
   dari satu basis kode.

## Konsekuensi

- Kontributor yang lebih akrab dengan React punya kurva belajar.
- Ekosistem komponen pihak ketiga lebih kecil. Untuk Cloister ini justru sesuai, karena kami memang
  tidak mau menarik dependensi UI besar ke dalam origin yang memegang kunci.
- Kalau tim kontributor nanti lebih nyaman dengan Vue, Nuxt adalah pengganti yang sah karena
  kemampuannya mirip; keputusannya akan turun ke ukuran bundle lagi.
