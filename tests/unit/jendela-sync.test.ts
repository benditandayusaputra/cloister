import { describe, it, expect } from 'vitest';
import { batasTanggal, labelJendela, PILIHAN_JENDELA } from '$lib/sync/jendela.ts';

describe('jendela sinkronisasi selektif', () => {
	const acuan = new Date(2026, 7, 15); // 15 Agustus 2026

	it('0 berarti tarik semuanya', () => {
		expect(batasTanggal(0, acuan)).toBeNull();
	});

	it('3 bulan terakhir mencakup Juni sampai Agustus', () => {
		expect(batasTanggal(3, acuan)).toBe('2026-06-01');
	});

	it('6 bulan terakhir mundur ke Maret', () => {
		expect(batasTanggal(6, acuan)).toBe('2026-03-01');
	});

	it('12 bulan melewati batas tahun dengan benar', () => {
		expect(batasTanggal(12, acuan)).toBe('2025-09-01');
	});

	it('24 bulan mundur dua tahun', () => {
		expect(batasTanggal(24, acuan)).toBe('2024-09-01');
	});

	it('batas selalu tanggal 1 supaya bulan terpotong ikut utuh', () => {
		for (const b of PILIHAN_JENDELA) {
			const t = batasTanggal(b, acuan);
			if (t !== null) expect(t.endsWith('-01')).toBe(true);
		}
	});

	it('bulan Januari mundur ke tahun sebelumnya', () => {
		expect(batasTanggal(3, new Date(2026, 0, 10))).toBe('2025-11-01');
	});

	it('label dwibahasa', () => {
		expect(labelJendela(0, 'id')).toBe('Semuanya');
		expect(labelJendela(0, 'en')).toBe('Everything');
		expect(labelJendela(6, 'id')).toBe('6 bulan terakhir');
		expect(labelJendela(6, 'en')).toBe('Last 6 months');
	});
});
