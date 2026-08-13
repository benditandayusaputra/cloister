/**
 * Menghasilkan build-manifest.json berisi SHA-256 setiap aset yang dilayani.
 *
 * Dijalankan CI setelah `pnpm build`, lalu manifestnya dilampirkan ke GitHub
 * Release. Siapa pun bisa membandingkannya dengan situs yang sedang berjalan
 * lewat `./scripts/verify.sh`.
 *
 *   node scripts/build-manifest.mjs [direktori-keluaran] > build-manifest.json
 *
 * Direktori bawaan mengikuti adapter Vercel; untuk build adapter-node pakai
 * `node scripts/build-manifest.mjs build/client`.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const KANDIDAT = ['.vercel/output/static', 'build/client', '.svelte-kit/output/client'];
const akar = process.argv[2] ?? KANDIDAT.find((d) => existsSync(d));

if (!akar || !existsSync(akar)) {
	console.error(`Direktori keluaran tidak ditemukan. Dicoba: ${KANDIDAT.join(', ')}`);
	console.error('Jalankan `pnpm build` dulu, atau sebutkan direktorinya sebagai argumen.');
	process.exit(2);
}

/**
 * Aset yang tidak dipatok: source map (tidak dilayani produksi), varian
 * terkompresi (dilayani lewat negosiasi konten di jalur yang sama), dan service
 * worker (memuat versi build yang berubah tiap deploy).
 */
const ABAIKAN = [/\.map$/, /\.(?:br|gz)$/, /\/service-worker\.js$/];

function telusuri(dir) {
	const keluar = [];
	for (const nama of readdirSync(dir)) {
		const penuh = join(dir, nama);
		if (statSync(penuh).isDirectory()) keluar.push(...telusuri(penuh));
		else keluar.push(penuh);
	}
	return keluar;
}

const assets = telusuri(akar)
	.map((berkas) => ({
		path: '/' + relative(akar, berkas).split(sep).join(posix.sep),
		berkas
	}))
	.filter(({ path }) => !ABAIKAN.some((re) => re.test(path)))
	.sort((a, b) => a.path.localeCompare(b.path))
	.map(({ path, berkas }) => ({
		path,
		bytes: statSync(berkas).size,
		sha256: createHash('sha256').update(readFileSync(berkas)).digest('hex')
	}));

process.stdout.write(
	JSON.stringify(
		{
			schema: 1,
			// Sengaja tanpa timestamp: manifest untuk commit yang sama harus
			// menghasilkan berkas yang sama persis, supaya build bisa dibandingkan.
			source: akar,
			count: assets.length,
			assets
		},
		null,
		2
	) + '\n'
);
