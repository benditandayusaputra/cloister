import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buatTantangan, nolDiDepan, verifikasiCaptcha, CAPTCHA_BITS } from '$lib/server/captcha.ts';

function pecahkan(salt: string, bits: number): number {
	for (let nonce = 0; ; nonce++) {
		const d = createHash('sha256').update(`${salt}:${nonce}`).digest();
		if (nolDiDepan(d) >= bits) return nonce;
	}
}

describe('captcha bukti-kerja', () => {
	it('menghitung bit nol di depan', () => {
		expect(nolDiDepan(new Uint8Array([0, 0, 255]))).toBe(16);
		expect(nolDiDepan(new Uint8Array([0, 1, 255]))).toBe(15);
		expect(nolDiDepan(new Uint8Array([128]))).toBe(0);
		expect(nolDiDepan(new Uint8Array([15]))).toBe(4);
	});

	it('jawaban benar diterima sekali, ditolak saat diulang', () => {
		const t = buatTantangan();
		expect(t.bits).toBe(CAPTCHA_BITS);
		const nonce = pecahkan(t.salt, t.bits);
		expect(() => verifikasiCaptcha({ ...t, nonce }, '')).not.toThrow();
		expect(() => verifikasiCaptcha({ ...t, nonce }, '')).toThrow(/sudah dipakai/);
	});

	it('nonce salah, tanda tangan palsu, dan tantangan kedaluwarsa ditolak', () => {
		const t = buatTantangan();
		const nonce = pecahkan(t.salt, t.bits);
		expect(() => verifikasiCaptcha({ ...t, nonce: nonce + 1 }, '')).toThrow();
		expect(() => verifikasiCaptcha({ ...t, sig: 'a'.repeat(64), nonce }, '')).toThrow();
		expect(() => verifikasiCaptcha({ ...t, exp: 1, nonce }, '')).toThrow(/kedaluwarsa|tidak valid/);
		expect(() => verifikasiCaptcha({ ...t, bits: 4, nonce }, '')).toThrow();
	});

	it('honeypot terisi langsung ditolak, jawaban kosong ditolak', () => {
		const t = buatTantangan();
		const nonce = pecahkan(t.salt, t.bits);
		expect(() => verifikasiCaptcha({ ...t, nonce }, 'https://spam.example')).toThrow(/tidak valid/);
		expect(() => verifikasiCaptcha(undefined, '')).toThrow(/belum selesai/);
	});
});
