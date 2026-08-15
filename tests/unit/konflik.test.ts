import { describe, it, expect } from 'vitest';
import { coba, labelTandingan } from '$lib/sync/konflik.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';

function entri(patch: Partial<LocalEntry> = {}): LocalEntry {
	return {
		id: 'id-1',
		entryDate: '2026-03-17',
		title: 'Judul',
		body: 'Isi tulisan.',
		mood: 3,
		tags: ['kerja'],
		weather: null,
		location: null,
		attachments: [],
		createdAt: '2026-03-17T10:00:00.000Z',
		updatedAt: '2026-03-17T10:00:00.000Z',
		rev: 1,
		baseRev: 1,
		dirty: 1,
		deletedAt: null,
		conflictOf: null,
		conflictLabel: null,
		publicId: null, pinned: false,
		...patch
	};
}

describe('resolusi konflik', () => {
	it('menggabungkan otomatis kalau hanya tag yang bertambah', () => {
		const lokal = entri({ tags: ['kerja', 'marah'] });
		const server = entri({ tags: ['kerja'], rev: 5 });
		const hasil = coba(lokal, server);
		expect(hasil.jenis).toBe('gabung');
		if (hasil.jenis === 'gabung') {
			expect(hasil.hasil.tags.sort()).toEqual(['kerja', 'marah']);
			expect(hasil.hasil.rev).toBe(5);
			expect(hasil.hasil.dirty).toBe(1);
		}
	});

	it('menggabungkan mood lokal di atas mood server', () => {
		const hasil = coba(entri({ mood: 5 }), entri({ mood: 2, rev: 4 }));
		expect(hasil.jenis).toBe('gabung');
		if (hasil.jenis === 'gabung') expect(hasil.hasil.mood).toBe(5);
	});

	it('membuat versi tandingan kalau badan tulisan berbeda', () => {
		const hasil = coba(entri({ body: 'Versi lokal.' }), entri({ body: 'Versi server.', rev: 9 }));
		expect(hasil.jenis).toBe('versi-tandingan');
	});

	it('membuat versi tandingan kalau judul berbeda', () => {
		const hasil = coba(entri({ title: 'A' }), entri({ title: 'B', rev: 3 }));
		expect(hasil.jenis).toBe('versi-tandingan');
	});

	it('mengambil versi server kalau lokal masih kosong', () => {
		const hasil = coba(entri({ title: '', body: '  ' }), entri({ rev: 7 }));
		expect(hasil.jenis).toBe('ambil-server');
	});

	it('penghapusan di server tidak menimpa suntingan lokal diam-diam', () => {
		const hasil = coba(entri({ body: 'masih ditulis' }), entri({ deletedAt: '2026-03-18T00:00:00.000Z' }));
		expect(hasil.jenis).toBe('versi-tandingan');
	});

	it('tidak menandai kotor kalau hasil gabung identik dengan server', () => {
		const hasil = coba(entri({ tags: ['kerja'], mood: 3 }), entri({ tags: ['kerja'], mood: 3, rev: 6 }));
		expect(hasil.jenis).toBe('gabung');
		if (hasil.jenis === 'gabung') expect(hasil.hasil.dirty).toBe(0);
	});

	it('label versi tandingan memuat nama perangkat dan jam', () => {
		const label = labelTandingan('Chrome di macOS', new Date(2026, 2, 17, 21, 4));
		expect(label).toBe('Versi dari Chrome di macOS, 21.04');
	});
});

describe('gabung tidak boleh menjatuhkan konteks', () => {
	const dasar = (p: Partial<LocalEntry> = {}): LocalEntry =>
		({
			id: 'e1',
			entryDate: '2026-08-02',
			title: 'Judul',
			body: 'Isi tulisan',
			mood: 3,
			tags: [],
			weather: null,
			location: null,
			attachments: [],
			createdAt: '2026-08-02T10:00:00.000Z',
			updatedAt: '2026-08-02T10:00:00.000Z',
			rev: 0,
			baseRev: 0,
			dirty: 1,
			deletedAt: null,
			conflictOf: null,
			conflictLabel: null,
			publicId: null, pinned: false,
			...p
		}) as LocalEntry;

	const LOKASI = { lat: -6.23, lon: 106.86, label: 'Jakarta' };
	const CUACA = { code: 61, tempC: 29 };

	// Dulu `...server` menimpa keduanya, dan dirty=0 membuat hilangnya permanen.
	it('membawa lokasi dan cuaca dari sisi lokal saat server belum punya', () => {
		const hasil = coba(dasar({ location: LOKASI, weather: CUACA }), dasar({ rev: 5 }));
		expect(hasil.jenis).toBe('gabung');
		if (hasil.jenis !== 'gabung') return;
		expect(hasil.hasil.location).toEqual(LOKASI);
		expect(hasil.hasil.weather).toEqual(CUACA);
	});

	it('menandai kotor supaya konteks yang baru ikut terkirim balik', () => {
		const hasil = coba(dasar({ location: LOKASI }), dasar({ rev: 5 }));
		if (hasil.jenis !== 'gabung') throw new Error('harusnya gabung');
		expect(hasil.hasil.dirty).toBe(1);
	});

	it('tidak menandai kotor kalau memang tidak ada yang berubah', () => {
		const sama = { location: LOKASI, weather: CUACA, mood: 3, tags: ['a'] };
		const hasil = coba(dasar(sama), dasar({ ...sama, rev: 5 }));
		if (hasil.jenis !== 'gabung') throw new Error('harusnya gabung');
		expect(hasil.hasil.dirty).toBe(0);
	});

	it('mempertahankan lokasi server kalau lokal tidak punya', () => {
		const hasil = coba(dasar(), dasar({ location: LOKASI, rev: 5 }));
		if (hasil.jenis !== 'gabung') throw new Error('harusnya gabung');
		expect(hasil.hasil.location).toEqual(LOKASI);
		expect(hasil.hasil.dirty).toBe(0);
	});

	// Lampiran baru di sisi lokal juga harus memicu kiriman balik.
	it('menandai kotor kalau lampiran lokal belum ada di server', () => {
		const lampiran = [{ id: 'a1', kind: 'image', name: 'f.png', mime: 'image/png', size: 10 }];
		const hasil = coba(dasar({ attachments: lampiran } as Partial<LocalEntry>), dasar({ rev: 5 }));
		if (hasil.jenis !== 'gabung') throw new Error('harusnya gabung');
		expect(hasil.hasil.dirty).toBe(1);
	});
});
