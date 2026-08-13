import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { URL_CUACA } from '$lib/utils/cuaca.ts';
import { HOST_UBIN } from '$lib/utils/peta.ts';

const konfig = readFileSync('vite.config.ts', 'utf8');

function daftarCsp(arahan: string): string[] {
	const m = new RegExp(`'${arahan}':\\s*\\[([^\\]]*)\\]`).exec(konfig);
	if (!m) return [];
	return [...(m[1] ?? '').matchAll(/'([^']+)'/g)].map((x) => x[1] as string);
}

describe('CSP mengizinkan layanan yang benar-benar dipanggil peramban', () => {
	// Cuaca diambil langsung dari peramban supaya koordinat tidak lewat server kita.
	// Waktu host ini tidak ada di connect-src, permintaannya diblokir dan cuacanya
	// hilang tanpa pesan galat sama sekali.
	it('connect-src memuat host layanan cuaca yang dipakai kode', () => {
		const host = new URL(URL_CUACA).origin;
		expect(daftarCsp('connect-src')).toContain(host);
	});

	it('connect-src tidak dibuka lebar-lebar', () => {
		const nilai = daftarCsp('connect-src');
		expect(nilai.length).toBeGreaterThan(0);
		expect(nilai).not.toContain('*');
		expect(nilai).not.toContain('https:');
	});

	// Ubin peta dimuat langsung sebagai <img> ke host OSM.
	it('img-src memuat host ubin peta yang dipakai kode', () => {
		expect(daftarCsp('img-src')).toContain(new URL(HOST_UBIN).origin);
	});

	it('img-src tidak dibuka lebar-lebar', () => {
		const nilai = daftarCsp('img-src');
		expect(nilai).not.toContain('*');
		expect(nilai).not.toContain('https:');
	});

	it('default-src tetap none supaya sisanya harus disebut satu per satu', () => {
		expect(daftarCsp('default-src')).toEqual(['none']);
	});
});
