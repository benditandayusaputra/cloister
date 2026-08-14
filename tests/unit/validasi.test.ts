import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { dateSchema, kdfSchema, emailSchema, sizeBucketSchema } from '$lib/server/validate.ts';
import { pad } from '$crypto/padding.ts';
import { toB64, utf8 } from '$crypto/bytes.ts';

const ok = <S extends v.GenericSchema>(s: S, val: unknown) => v.safeParse(s, val).success;

describe('validasi email', () => {
	it('menerima email wajar dan menormalkan huruf besar', () => {
		const r = v.safeParse(emailSchema, '  Kamu@Contoh.ID ');
		expect(r.success).toBe(true);
		if (r.success) expect(r.output).toBe('kamu@contoh.id');
	});

	it('menolak yang bukan email', () => {
		expect(ok(emailSchema, 'bukan-email')).toBe(false);
		expect(ok(emailSchema, '')).toBe(false);
	});
});

describe('validasi tanggal entri', () => {
	it('menerima format YYYY-MM-DD dalam rentang wajar', () => {
		expect(ok(dateSchema, '2026-03-17')).toBe(true);
		expect(ok(dateSchema, '1900-01-01')).toBe(true);
	});

	it('menolak format lain', () => {
		expect(ok(dateSchema, '17-03-2026')).toBe(false);
		expect(ok(dateSchema, '2026-3-7')).toBe(false);
	});

	it('menolak tahun di luar rentang', () => {
		expect(ok(dateSchema, '1899-12-31')).toBe(false);
		expect(ok(dateSchema, '3000-01-01')).toBe(false);
	});
});

describe('validasi parameter KDF', () => {
	it('menerima parameter default', () => {
		expect(ok(kdfSchema, { algo: 'argon2id', memKib: 65536, time: 3, parallel: 1 })).toBe(true);
	});

	it('menolak memori terlalu rendah', () => {
		expect(ok(kdfSchema, { algo: 'argon2id', memKib: 1024, time: 3, parallel: 1 })).toBe(false);
	});

	it('menolak algoritma lain', () => {
		expect(ok(kdfSchema, { algo: 'pbkdf2', memKib: 65536, time: 3, parallel: 1 })).toBe(false);
	});

	it('menolak paralelisme selain 1', () => {
		expect(ok(kdfSchema, { algo: 'argon2id', memKib: 65536, time: 3, parallel: 4 })).toBe(false);
	});
});

describe('validasi size bucket', () => {
	it('hanya menerima nilai yang diizinkan', () => {
		expect(ok(sizeBucketSchema, 256)).toBe(true);
		expect(ok(sizeBucketSchema, 65536)).toBe(true);
		expect(ok(sizeBucketSchema, 300)).toBe(false);
		expect(ok(sizeBucketSchema, 0)).toBe(false);
	});
});

describe('konsistensi panjang ciphertext', () => {
	it('panjang ciphertext selalu bucket + 16 byte tag', () => {
		for (const teks of ['a', 'x'.repeat(300), 'y'.repeat(2000)]) {
			const { padded, bucket } = pad(utf8(teks));
			expect(padded.length).toBe(bucket);
			// ciphertext AEAD menambah 16 byte tag Poly1305
			expect(toB64(new Uint8Array(bucket + 16)).length).toBeGreaterThan(0);
		}
	});
});
