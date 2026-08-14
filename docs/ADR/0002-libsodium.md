# ADR 0002 — libsodium WASM, bukan WebCrypto

Status: diterima
Tanggal: 2026-08-01

## Konteks

Cloister butuh key stretching yang tahan GPU dan AEAD dengan nonce panjang supaya nonce acak aman.

## Keputusan

`libsodium-wrappers-sumo` (WASM) untuk semua primitif kriptografi.

## Alasan

1. **WebCrypto tidak punya Argon2id.** Yang tersedia hanya PBKDF2, yang jauh lebih lemah terhadap
   serangan GPU dan ASIC untuk anggaran waktu yang sama.
2. **WebCrypto tidak punya XChaCha20-Poly1305.** AES-GCM punya nonce 96 bit; dengan nonce acak,
   batas amannya jauh lebih rendah. Nonce 192 bit XChaCha20 membuat nonce acak aman tanpa perlu
   penghitung yang harus disinkronkan antar perangkat.
3. **API sulit disalahgunakan.** libsodium memaksa parameter yang benar dan sudah diaudit.

## Konsekuensi

- Ada WASM sekitar 200 KB yang harus dimuat. Dimitigasi dengan memuatnya lazy di dalam Web Worker
  supaya tidak memblokir first paint.
- `wasm-unsafe-eval` harus diizinkan di CSP `script-src`. Ini jauh lebih sempit daripada
  `unsafe-eval` penuh dan hanya mengizinkan kompilasi WebAssembly.
- HMAC-SHA256 untuk HKDF harus diimplementasi manual karena `crypto_auth_hmacsha256` libsodium
  hanya menerima kunci 32 byte. Implementasinya diverifikasi terhadap RFC 5869.
