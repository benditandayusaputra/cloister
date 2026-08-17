import { describe, expect, it } from 'vitest';
import {
	buatTantangan,
	buatTantanganUntuk,
	verifikasiCaptcha,
	PANJANG_KODE
} from '$lib/server/captcha.ts';
import { ABJAD, HURUF } from '$lib/server/captcha-huruf.ts';
import { buatKode, gambarKode, LEBAR, TINGGI } from '$lib/server/captcha-gambar.ts';

function pngDari(dataUrl: string): Buffer {
	expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
	return Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
}

describe('kode gambar', () => {
	it('abjad tidak memuat huruf yang mudah tertukar', () => {
		for (const rancu of ['I', 'O', '0', '1']) expect(ABJAD).not.toContain(rancu);
		for (const huruf of ABJAD) expect(HURUF[huruf]).toBeDefined();
	});

	it('kode acak selalu sepanjang yang diminta dan hanya dari abjad', () => {
		for (let i = 0; i < 50; i++) {
			const kode = buatKode();
			expect(kode).toHaveLength(PANJANG_KODE);
			for (const h of kode) expect(ABJAD).toContain(h);
		}
	});

	it('menghasilkan PNG utuh seukuran kanvas', () => {
		const png = pngDari(gambarKode('AB23K'));
		expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
		expect(png.readUInt32BE(16)).toBe(LEBAR);
		expect(png.readUInt32BE(20)).toBe(TINGGI);
		expect(png.subarray(png.length - 8, png.length - 4).toString('ascii')).toBe('IEND');
	});

	it('dua gambar untuk kode sama tetap berbeda', () => {
		expect(gambarKode('AB23K')).not.toBe(gambarKode('AB23K'));
	});

	it('tantangan membawa gambar dan token bertanda tangan', () => {
		const t = buatTantangan();
		expect(t.panjang).toBe(PANJANG_KODE);
		expect(t.token).toMatch(/^[A-Za-z0-9_-]+\.\d+\.[a-f0-9]{32}$/);
		expect(t.exp * 1000).toBeGreaterThan(Date.now());
		expect(pngDari(t.gambar).length).toBeGreaterThan(500);
	});

	it('kode benar diterima sekali, ditolak saat diulang', () => {
		const t = buatTantanganUntuk('KJ4MT');
		expect(() => verifikasiCaptcha({ token: t.token, teks: 'KJ4MT' }, '')).not.toThrow();
		expect(() => verifikasiCaptcha({ token: t.token, teks: 'KJ4MT' }, '')).toThrow(/sudah dipakai/);
	});

	it('huruf kecil dan spasi tetap diterima', () => {
		const t = buatTantanganUntuk('KJ4MT');
		expect(() => verifikasiCaptcha({ token: t.token, teks: ' kj 4mt ' }, '')).not.toThrow();
	});

	it('kode salah ditolak dan tokennya langsung hangus', () => {
		const t = buatTantanganUntuk('KJ4MT');
		expect(() => verifikasiCaptcha({ token: t.token, teks: 'KJ4MX' }, '')).toThrow(/salah/);
		expect(() => verifikasiCaptcha({ token: t.token, teks: 'KJ4MT' }, '')).toThrow(/sudah dipakai/);
	});

	it('tanda tangan palsu dan token kedaluwarsa ditolak', () => {
		const t = buatTantanganUntuk('KJ4MT');
		const [nonce, exp] = t.token.split('.');
		expect(() => verifikasiCaptcha({ token: `${nonce}.${exp}.${'a'.repeat(32)}`, teks: 'KJ4MT' }, '')).toThrow(
			/salah/
		);
		expect(() => verifikasiCaptcha({ token: `zzz111.1000000000.${'a'.repeat(32)}`, teks: 'KJ4MT' }, '')).toThrow(
			/kedaluwarsa/
		);
	});

	it('honeypot terisi langsung ditolak, jawaban kosong ditolak', () => {
		const t = buatTantanganUntuk('KJ4MT');
		expect(() => verifikasiCaptcha({ token: t.token, teks: 'KJ4MT' }, 'https://spam.example')).toThrow(
			/tidak valid/
		);
		expect(() => verifikasiCaptcha(undefined, '')).toThrow(/belum diisi/);
		expect(() => verifikasiCaptcha({ token: t.token, teks: '' }, '')).toThrow(/belum diisi/);
	});
});
