// Sengaja tidak di-prerender: file statis dilayani sebelum hooks.server.ts,
// sehingga header keamanan (CSP, COOP, nosniff) tidak ikut terpasang.
// Kecepatan tetap dijaga lewat cache-control di +layout.server.ts.
export const prerender = false;
