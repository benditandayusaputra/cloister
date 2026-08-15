import { describe, it, expect } from 'vitest';
import { geometri, seedFromString, pinOf, moodLabel, PAPERS } from '$lib/utils/kertas.ts';
import { kisi, tataKartu, tataLubang, benangTag, tinggiPapan, CARD_W } from '$lib/components/papan/tata-letak.ts';
import { tokenize, highlight } from '$lib/utils/search.ts';
import { isoDate, daysInMonth, namaBulan, namaHari, stempelTanggal, parseIso } from '$lib/utils/tanggal.ts';
import { skorSandi, sandiCukup } from '$lib/utils/sandi.ts';
import { plainTeks, plainRingkas } from '$lib/utils/teks.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';

const buatEntri = (tanggal: string, tags: string[] = []): LocalEntry => ({
	id: `id-${tanggal}`,
	entryDate: tanggal,
	title: '',
	body: 'isi',
	mood: 3,
	tags,
	weather: null,
	location: null,
	attachments: [],
	createdAt: '2026-03-01T00:00:00.000Z',
	updatedAt: '2026-03-01T00:00:00.000Z',
	rev: 1,
	baseRev: 1,
	dirty: 0,
	deletedAt: null,
	conflictOf: null,
	conflictLabel: null,
	publicId: null, pinned: false
});

describe('geometri kartu', () => {
	it('rotasi deterministik dari kunci yang sama', () => {
		const a = geometri('2026-03-17');
		const b = geometri('2026-03-17');
		expect(a.rot).toBe(b.rot);
		expect(a.paper).toBe(b.paper);
		expect(a.pinShift).toBe(b.pinShift);
	});

	it('rotasi selalu dalam rentang -3.5 sampai 3.5 derajat', () => {
		for (let d = 1; d <= 31; d++) {
			const g = geometri(`2026-03-${String(d).padStart(2, '0')}`);
			expect(g.rot).toBeGreaterThanOrEqual(-3.5);
			expect(g.rot).toBeLessThanOrEqual(3.5);
		}
	});

	it('reduce motion mematikan rotasi', () => {
		expect(geometri('2026-03-17', true).rot).toBe(0);
	});

	it('warna kertas selalu dari palet', () => {
		for (let d = 1; d <= 31; d++) {
			expect(PAPERS).toContain(geometri(`2026-05-${d}`).paper as never);
		}
	});

	it('hash FNV-1a stabil', () => {
		expect(seedFromString('papan')).toBe(seedFromString('papan'));
		expect(seedFromString('papan')).not.toBe(seedFromString('papam'));
	});

	it('warna paku mengikuti mood', () => {
		expect(pinOf(1)).toContain('8E2F2A');
		expect(pinOf(5)).toContain('4F7F53');
		expect(pinOf(null)).toBe(pinOf(3));
	});

	it('label mood dwibahasa', () => {
		expect(moodLabel(1, 'id')).toBe('Berat');
		expect(moodLabel(1, 'en')).toBe('Heavy');
		expect(moodLabel(null, 'id')).toBe('Tanpa mood');
	});
});

describe('tata letak papan', () => {
	it('jumlah kolom menyesuaikan lebar', () => {
		expect(kisi(400).cols).toBe(2);
		expect(kisi(1040).cols).toBeGreaterThanOrEqual(4);
		expect(kisi(4000).cols).toBe(5);
	});

	it('kartu tidak pernah keluar dari papan', () => {
		const L = kisi(1040);
		const entries = Array.from({ length: 16 }, (_, i) =>
			buatEntri(`2026-03-${String(i + 1).padStart(2, '0')}`)
		);
		for (const c of tataKartu(entries, L, false)) {
			expect(c.x).toBeGreaterThanOrEqual(0);
			expect(c.x).toBeLessThanOrEqual(L.W - CARD_W);
			expect(c.y).toBeGreaterThanOrEqual(-14);
		}
	});

	it('lubang paku menempati gutter dan tetap di dalam papan', () => {
		const L = kisi(1040);
		const kosong = ['2026-03-02', '2026-03-04', '2026-03-06'];
		for (const h of tataLubang(kosong, L)) {
			expect(h.x).toBeGreaterThanOrEqual(0);
			expect(h.x).toBeLessThanOrEqual(L.W - 44);
		}
	});

	it('benang hanya menghubungkan kartu dengan tag sama', () => {
		const L = kisi(1040);
		const entries = [
			buatEntri('2026-03-01', ['kerja']),
			buatEntri('2026-03-02', ['rumah']),
			buatEntri('2026-03-03', ['kerja'])
		];
		const kartu = tataKartu(entries, L, false);
		const benang = benangTag(kartu, 'id-2026-03-01', 'kerja');
		expect(benang.length).toBe(1);
		expect(benang[0]?.d.startsWith('M')).toBe(true);
	});

	it('tinggi papan cukup untuk semua baris', () => {
		const L = kisi(1040);
		expect(tinggiPapan(16, 15, L)).toBeGreaterThan(216);
		expect(tinggiPapan(0, 0, L)).toBeGreaterThanOrEqual(238 + 216);
	});
});

describe('pencarian lokal', () => {
	it('memecah token dan membuang kata henti', () => {
		expect(tokenize('Hujan dan angin di jalan')).toEqual(['hujan', 'angin', 'jalan']);
	});

	it('token unik', () => {
		expect(tokenize('hujan hujan hujan')).toEqual(['hujan']);
	});

	it('sorotan mengambil sekitar kata kunci', () => {
		const teks = 'a'.repeat(80) + ' kunci ' + 'b'.repeat(80);
		expect(highlight(teks, 'kunci')).toContain('kunci');
		expect(highlight(teks, 'kunci').startsWith('…')).toBe(true);
	});
});

describe('tanggal', () => {
	it('format ISO lokal', () => {
		expect(isoDate(new Date(2026, 2, 7))).toBe('2026-03-07');
	});

	it('jumlah hari per bulan', () => {
		expect(daysInMonth(2026, 2)).toBe(28);
		expect(daysInMonth(2024, 2)).toBe(29);
		expect(daysInMonth(2026, 3)).toBe(31);
		expect(daysInMonth(2026, 4)).toBe(30);
	});

	it('nama bulan dan hari dwibahasa', () => {
		expect(namaBulan(3, 'id')).toBe('Maret');
		expect(namaBulan(3, 'en')).toBe('March');
		expect(namaHari('2026-03-17', 'id')).toBe('Selasa');
	});

	it('stempel tanggal', () => {
		expect(stempelTanggal('2026-03-17', 'id')).toBe('17 mar 2026');
	});

	it('parse ISO', () => {
		expect(parseIso('2026-03-07')).toEqual({ year: 2026, month: 3, day: 7 });
	});
});

describe('kekuatan sandi', () => {
	it('sandi pendek dibatasi skor rendah', () => {
		expect(skorSandi('')).toBe(0);
		expect(skorSandi('Abc1!')).toBeLessThanOrEqual(2);
	});

	it('sandi panjang dan beragam mendapat skor tinggi', () => {
		expect(skorSandi('Sandi-Panjang-2026!')).toBeGreaterThanOrEqual(5);
	});

	it('minimal 12 karakter', () => {
		expect(sandiCukup('duabelas123')).toBe(false);
		expect(sandiCukup('duabelas1234')).toBe(true);
	});
});

describe('teks markdown', () => {
	it('membuang penanda markdown', () => {
		expect(plainTeks('# Judul\n\n**tebal** dan _miring_')).toBe('Judul tebal dan miring');
	});

	it('membuang tautan dan gambar', () => {
		expect(plainTeks('lihat [ini](https://a.id) dan ![alt](x.png)')).toBe('lihat ini dan');
	});

	it('ringkasan dipotong di batas kata', () => {
		const r = plainRingkas('kata '.repeat(100), 40);
		expect(r.length).toBeLessThanOrEqual(41);
		expect(r.endsWith('…')).toBe(true);
	});
});
