# Kontribusi

## Setup lokal

Server pengembangan berjalan di **port 4820**, pratinjau di **4821**. Port sengaja bukan default
Vite supaya tidak bentrok dengan aplikasi lain yang sedang berjalan.

```bash
pnpm install
cp .env.example .env
docker compose up -d db      # Postgres di port 5442, atau pakai yang sudah ada
pnpm db:migrate
pnpm dev
```

## Sebelum membuka PR

```bash
pnpm check      # TypeScript strict, nol error
pnpm test       # unit, test vector kriptografi, dan evaluasi Penyaring Identitas
pnpm build
```

## Konvensi commit

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

Contoh: `feat(papan): tambah tema washi`

## Aturan khusus kode kriptografi

Perubahan pada `src/lib/crypto/` butuh review dua maintainer dan tidak boleh mengubah format
terenkripsi tanpa menaikkan `schema_version`. Test vector di `tests/crypto-vectors/` sengaja tetap
supaya refactor tidak diam-diam mengubah format.

## Aturan khusus Penyaring Identitas

Berkas di `src/lib/redact/` tidak boleh memuat satu pun jalur jaringan — tidak `fetch`, tidak
`XMLHttpRequest`, tidak `importScripts`, tidak URL absolut. Ini ditegakkan dua kali: oleh
`tests/unit/redact-offline.test.ts` dan oleh langkah terpisah di CI. Klaim "pemindaian berjalan di
perangkat" hanya bernilai kalau ada yang menjaganya.

Setiap perubahan pada pola atau leksikon wajib menjalankan ulang evaluasinya
(`pnpm test tests/redaction-eval`) dan memperbarui tabel angka di `docs/REDACTION.md`. Angka yang
ditulis sekali lalu dilupakan lebih buruk daripada tidak ada angka sama sekali.

## Aturan komponen

Komponen dipecah per domain di `src/lib/components/`. Satu komponen satu tanggung jawab; kalau satu
berkas mulai melebihi sekitar 200 baris, pecah.

Jangan pakai `{@html}` di komponen baru. Satu-satunya tempat yang boleh adalah
`components/markdown/AmanMarkdown.svelte`, dan isinya selalu lewat DOMPurify.

## Menambah tema

Tema adalah pintu masuk kontribusi paling ramah. Cukup dua langkah:

1. Tambah blok `[data-theme="nama"]` di `src/lib/styles/tokens.css`
2. Daftarkan di `TEMA` pada `src/lib/state/tema.svelte.ts`

Tema wajib lulus kontras WCAG AA (4.5:1) di mode malam dan siang.

## Menambah bahasa

Salin `src/lib/i18n/id.ts` ke bahasa baru, terjemahkan, lalu daftarkan di
`src/lib/state/i18n.svelte.ts`. Tipe `Kamus` memastikan tidak ada kunci yang tertinggal.
