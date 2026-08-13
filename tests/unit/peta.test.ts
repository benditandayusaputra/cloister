import { describe, it, expect } from 'vitest';
import { keUbin, susunPetak, UKURAN_UBIN, HOST_UBIN, tautanOsm } from '$lib/utils/peta.ts';

describe('keUbin', () => {
	// Nilai acuan slippy map: di zoom 0 seluruh dunia satu ubin, pusatnya 0.5/0.5.
	it('menaruh titik nol di tengah ubin tunggal saat zoom 0', () => {
		const t = keUbin(0, 0, 0);
		expect(t.x).toBeCloseTo(0.5, 10);
		expect(t.y).toBeCloseTo(0.5, 10);
	});

	it('cocok dengan contoh baku Berlin di zoom 13', () => {
		const t = keUbin(52.52, 13.405, 13);
		expect(Math.floor(t.x)).toBe(4401);
		expect(Math.floor(t.y)).toBe(2686);
	});

	it('bujur paling barat dan paling timur jatuh di dua ujung', () => {
		expect(keUbin(0, -180, 2).x).toBeCloseTo(0, 10);
		expect(keUbin(0, 180, 2).x).toBeCloseTo(4, 10);
	});

	// Di luar batas Mercator tangen jadi tak hingga, jadi harus dijepit dulu.
	it('menjepit lintang ekstrem alih-alih menghasilkan angka tak hingga', () => {
		for (const lat of [90, -90, 89.999, -95]) {
			const t = keUbin(lat, 0, 5);
			expect(Number.isFinite(t.y)).toBe(true);
			expect(t.y).toBeGreaterThanOrEqual(0);
			expect(t.y).toBeLessThanOrEqual(2 ** 5);
		}
	});
});

describe('susunPetak', () => {
	const LEBAR = 260;
	const TINGGI = 160;

	it('menutupi seluruh kotak tanpa celah', () => {
		const petak = susunPetak(-6.23, 106.86, 14, LEBAR, TINGGI);
		expect(petak.length).toBeGreaterThan(0);

		const kiriMin = Math.min(...petak.map((p) => p.kiri));
		const atasMin = Math.min(...petak.map((p) => p.atas));
		const kananMaks = Math.max(...petak.map((p) => p.kiri + UKURAN_UBIN));
		const bawahMaks = Math.max(...petak.map((p) => p.atas + UKURAN_UBIN));

		expect(kiriMin).toBeLessThanOrEqual(0);
		expect(atasMin).toBeLessThanOrEqual(0);
		expect(kananMaks).toBeGreaterThanOrEqual(LEBAR);
		expect(bawahMaks).toBeGreaterThanOrEqual(TINGGI);
	});

	it('semua url menunjuk host ubin yang sama dengan yang diizinkan CSP', () => {
		for (const p of susunPetak(-6.23, 106.86, 14, LEBAR, TINGGI)) {
			expect(p.url.startsWith(`${HOST_UBIN}/`)).toBe(true);
			expect(p.url).toMatch(/\/14\/\d+\/\d+\.png$/);
		}
	});

	// Tanpa pembungkusan, ubin di dekat garis tanggal minta indeks negatif dan 404.
	it('membungkus bujur di dekat garis tanggal internasional', () => {
		const n = 2 ** 6;
		for (const p of susunPetak(0, 179.99, 6, LEBAR, TINGGI)) {
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThan(n);
		}
	});

	it('tidak meminta ubin di luar kutub', () => {
		const n = 2 ** 4;
		for (const p of susunPetak(85, 0, 4, LEBAR, TINGGI)) {
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThan(n);
		}
	});
});

describe('tautanOsm', () => {
	it('membawa penanda di koordinat yang sama', () => {
		const t = tautanOsm(-6.23, 106.86);
		expect(t).toContain('mlat=-6.23');
		expect(t).toContain('mlon=106.86');
	});
});
