import { describe, it, expect } from 'vitest';
import { polaCari, bacaKursor } from '$lib/server/feed.ts';

describe('polaCari', () => {
	it('membungkus kata kunci dengan wildcard di dua sisi', () => {
		expect(polaCari('hujan')).toBe('%hujan%');
	});

	// Tanpa ini, mencari "%" akan mencocokkan seluruh isi tabel.
	it('menetralkan wildcard yang diketik pembaca', () => {
		expect(polaCari('%')).toBe('%\\%%');
		expect(polaCari('_')).toBe('%\\_%');
		expect(polaCari('50%_off')).toBe('%50\\%\\_off%');
	});

	it('menetralkan garis miring terbalik supaya escape-nya tidak bisa dibatalkan', () => {
		expect(polaCari('a\\%b')).toBe('%a\\\\\\%b%');
	});

	it('membiarkan spasi dan huruf non-latin apa adanya', () => {
		expect(polaCari('kopi pagi')).toBe('%kopi pagi%');
		expect(polaCari('ñ 東京')).toBe('%ñ 東京%');
	});
});

describe('bacaKursor', () => {
	it('menerima waktu ISO untuk urutan terbaru', () => {
		expect(bacaKursor('2026-08-01T10:00:00.000Z', 'terbaru')).not.toBeNull();
	});

	it('menolak kursor yang bukan tanggal', () => {
		expect(bacaKursor('bukan-tanggal', 'terbaru')).toBeNull();
		expect(bacaKursor('', 'terbaru')).toBeNull();
	});

	it('menerima pasangan jumlah dan id untuk urutan populer', () => {
		expect(bacaKursor('42|018f-abc', 'populer')).not.toBeNull();
	});

	// Kursor populer yang cacat harus diabaikan, bukan bikin query ngawur.
	it('menolak kursor populer yang tidak lengkap', () => {
		expect(bacaKursor('42', 'populer')).toBeNull();
		expect(bacaKursor('|018f-abc', 'populer')).toBeNull();
		expect(bacaKursor('abc|018f', 'populer')).toBeNull();
	});

	it('tidak menerima kursor waktu saat urutannya populer', () => {
		expect(bacaKursor('2026-08-01T10:00:00.000Z', 'populer')).toBeNull();
	});
});
