import { describe, it, expect } from 'vitest';
import { pickBucket } from '$crypto/padding.ts';
import { slugify, makeSlug } from '$lib/server/slug.ts';
import { sanitizeMarkdown, excerptOf, plainText, renderMarkdown } from '$lib/server/sanitize.ts';
import { promptHarian } from '$lib/utils/prompt.ts';
import { labelCuaca, bulatkanKoordinat } from '$lib/utils/cuaca.ts';
import { arahDariTombol, kartuBerikutnya } from '$lib/components/papan/navigasi-papan.ts';
import type { PosisiKartu } from '$lib/components/papan/tata-letak.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';

const kartu = (id: string, cx: number, cy: number): PosisiKartu => ({
	entri: { id, entryDate: '2026-03-01', tags: [] } as unknown as LocalEntry,
	x: cx - 92,
	y: cy - 102,
	cx,
	cy,
	delay: 0
});

describe('slug entri publik', () => {
	it('menurunkan slug dari judul', () => {
		expect(slugify('Delapan menit, bukan seumur hidup')).toBe('delapan-menit-bukan-seumur-hidup');
	});

	it('judul tanpa huruf latin tetap dapat slug', () => {
		expect(slugify('!!!')).toBe('tulisan');
	});

	it('slug lengkap deterministik dari seed', () => {
		expect(makeSlug('Akhir bulan', 'seed-1')).toBe(makeSlug('Akhir bulan', 'seed-1'));
		expect(makeSlug('Akhir bulan', 'seed-1')).not.toBe(makeSlug('Akhir bulan', 'seed-2'));
	});
});

describe('sanitasi markdown', () => {
	it('membuang tag berbahaya dari markdown mentah', () => {
		const kotor = 'halo <script>alert(1)</script> dunia <iframe src="x"></iframe>';
		const bersih = sanitizeMarkdown(kotor);
		expect(bersih).not.toContain('<script');
		expect(bersih).not.toContain('<iframe');
	});

	it('render markdown membuang skrip dan atribut kejadian', () => {
		const html = renderMarkdown('# Judul\n\n<img src=x onerror="alert(1)">\n\n<script>x()</script>');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('<script');
		expect(html).toContain('<h1');
	});

	it('tautan javascript: diblokir', () => {
		const html = renderMarkdown('[klik](javascript:alert(1))');
		expect(html).not.toContain('javascript:');
	});

	it('tautan eksternal diberi rel aman', () => {
		const html = renderMarkdown('[a](https://contoh.id)');
		expect(html).toContain('rel="noopener noreferrer nofollow"');
		expect(html).toContain('target="_blank"');
	});

	it('ringkasan dipotong rapi', () => {
		const teks = excerptOf('kata '.repeat(200), 50);
		expect(teks.length).toBeLessThanOrEqual(51);
		expect(teks.endsWith('…')).toBe(true);
	});

	it('plainText membuang penanda', () => {
		expect(plainText('# Judul **tebal**')).toBe('Judul tebal');
	});
});

describe('prompt harian', () => {
	it('deterministik per tanggal', () => {
		expect(promptHarian('2026-03-17')).toBe(promptHarian('2026-03-17'));
	});

	it('berbeda antar tanggal pada umumnya', () => {
		const kumpulan = new Set(
			Array.from({ length: 30 }, (_, i) => promptHarian(`2026-03-${String(i + 1).padStart(2, '0')}`))
		);
		expect(kumpulan.size).toBeGreaterThan(5);
	});

	it('tersedia dalam dua bahasa', () => {
		expect(promptHarian('2026-03-17', 'id')).not.toBe(promptHarian('2026-03-17', 'en'));
	});
});

describe('cuaca', () => {
	it('memetakan kode WMO ke label', () => {
		expect(labelCuaca(0, 'id')).toBe('Cerah');
		expect(labelCuaca(61, 'id')).toBe('Hujan');
		expect(labelCuaca(95, 'en')).toBe('Thunderstorm');
		expect(labelCuaca(999, 'id')).toBe('Tidak diketahui');
	});

	it('koordinat dibulatkan supaya tidak menunjuk rumah persis', () => {
		expect(bulatkanKoordinat(-6.208763)).toBe(-6.21);
		expect(bulatkanKoordinat(106.845599)).toBe(106.85);
	});
});

describe('navigasi keyboard papan', () => {
	const papan = [
		kartu('a', 100, 100),
		kartu('b', 400, 100),
		kartu('c', 100, 340),
		kartu('d', 400, 340)
	];

	it('memetakan tombol panah ke arah', () => {
		expect(arahDariTombol('ArrowRight')).toBe('kanan');
		expect(arahDariTombol('ArrowUp')).toBe('atas');
		expect(arahDariTombol('Enter')).toBeNull();
	});

	it('panah kanan pindah ke kartu di sebelah kanan', () => {
		expect(kartuBerikutnya(papan, 'a', 'kanan')).toBe('b');
	});

	it('panah bawah pindah ke baris berikutnya', () => {
		expect(kartuBerikutnya(papan, 'a', 'bawah')).toBe('c');
	});

	it('tidak ada kartu di arah itu mengembalikan null', () => {
		expect(kartuBerikutnya(papan, 'a', 'kiri')).toBeNull();
		expect(kartuBerikutnya(papan, 'd', 'bawah')).toBeNull();
	});

	it('id tidak dikenal jatuh ke kartu pertama', () => {
		expect(kartuBerikutnya(papan, 'entah', 'kanan')).toBe('a');
	});
});

describe('bucket ukuran', () => {
	it('entri kecil tidak membocorkan panjang persis', () => {
		expect(pickBucket(10)).toBe(pickBucket(200));
	});
});
