import { describe, it, expect } from 'vitest';
import { randomBytes } from '$crypto/kdf.ts';
import { toB64, equalBytes } from '$crypto/bytes.ts';
import {
	createVault,
	deriveFromPassword,
	unwrapMasterKey,
	unwrapWithPhrase,
	deriveRecoveryAuth,
	encryptEntry,
	decryptEntry,
	tagToken
} from '$crypto/envelope.ts';

const KDF = { algo: 'argon2id' as const, memKib: 8192, time: 1, parallel: 1 as const };

const payload = {
	v: 1 as const,
	title: 'Sebelum rotasi',
	body: 'Isi yang harus tetap sama setelah kunci diganti.',
	mood: 4,
	tags: ['rumah', 'tenang'],
	createdAt: '2026-03-17T21:04:11.221Z',
	updatedAt: '2026-03-17T21:39:02.980Z'
};

/**
 * Rotasi kunci master di produksi dilakukan di dalam worker. Di sini alurnya
 * disusun ulang dari primitif yang sama untuk memastikan tidak ada isi yang
 * hilang dan kunci lama benar-benar berhenti berlaku.
 */
describe('rotasi kunci master', () => {
	it('entri tetap terbaca setelah dibungkus ulang dengan MK baru', async () => {
		const lama = await createVault('sandi-lama-panjang', KDF);
		const id = 'entri-1';

		const sebelum = await encryptEntry(lama.masterKey, id, payload);
		expect(await decryptEntry(lama.masterKey, id, sebelum)).toEqual(payload);

		// Rotasi: MK baru acak, entri dienkripsi ulang dari plaintext lokal.
		const mkBaru = await randomBytes(32);
		const sesudah = await encryptEntry(mkBaru, id, payload);

		expect(await decryptEntry(mkBaru, id, sesudah)).toEqual(payload);
	});

	it('MK lama tidak bisa lagi membuka entri yang sudah dirotasi', async () => {
		const lama = await createVault('sandi-lama-panjang', KDF);
		const mkBaru = await randomBytes(32);
		const sesudah = await encryptEntry(mkBaru, 'entri-2', payload);

		await expect(decryptEntry(lama.masterKey, 'entri-2', sesudah)).rejects.toThrow();
	});

	it('ciphertext berubah total meski isinya sama', async () => {
		const a = await randomBytes(32);
		const b = await randomBytes(32);
		const satu = await encryptEntry(a, 'entri-3', payload);
		const dua = await encryptEntry(b, 'entri-3', payload);

		expect(toB64(satu.ciphertext)).not.toBe(toB64(dua.ciphertext));
		expect(toB64(satu.wrappedDek)).not.toBe(toB64(dua.wrappedDek));
	});

	it('blind index tag ikut berubah karena index key turun dari MK', async () => {
		const a = await randomBytes(32);
		const b = await randomBytes(32);
		expect(await tagToken(a, 'rumah')).not.toBe(await tagToken(b, 'rumah'));
	});

	it('sandi baru membuka MK baru, sandi lama tidak', async () => {
		const mkBaru = await randomBytes(32);
		const saltBaru = await randomBytes(16);
		const turunan = await deriveFromPassword('sandi-baru-panjang', saltBaru, KDF);

		const { seal } = await import('$crypto/aead.ts');
		const dibungkus = await seal(turunan.kek, mkBaru, 'cloister:mk:v1');

		const buka = await deriveFromPassword('sandi-baru-panjang', saltBaru, KDF);
		expect(equalBytes(await unwrapMasterKey(buka.kek, dibungkus.ct, dibungkus.nonce), mkBaru)).toBe(
			true
		);

		const salah = await deriveFromPassword('sandi-lama-panjang', saltBaru, KDF);
		await expect(unwrapMasterKey(salah.kek, dibungkus.ct, dibungkus.nonce)).rejects.toThrow();
	});

	it('frasa pemulihan baru membuka MK baru, frasa lama tidak', async () => {
		const lama = await createVault('sandi-panjang-sekali', KDF);
		const { rewrapForNewPhrase } = await import('$crypto/envelope.ts');

		const mkBaru = await randomBytes(32);
		const rp = await rewrapForNewPhrase(mkBaru, KDF);

		const dibuka = await unwrapWithPhrase(rp.phrase, rp.recoverySalt, rp.ct, rp.nonce, KDF);
		expect(equalBytes(dibuka, mkBaru)).toBe(true);

		await expect(
			unwrapWithPhrase(lama.phrase, rp.recoverySalt, rp.ct, rp.nonce, KDF)
		).rejects.toThrow();
	});

	it('recoveryAuthKey ikut berganti setelah rotasi', async () => {
		const { rewrapForNewPhrase } = await import('$crypto/envelope.ts');
		const lama = await createVault('sandi-panjang-sekali', KDF);
		const rp = await rewrapForNewPhrase(await randomBytes(32), KDF);

		const authBaru = await deriveRecoveryAuth(rp.phrase, rp.recoverySalt, KDF);
		expect(toB64(authBaru)).toBe(toB64(rp.recoveryAuthKey));
		expect(toB64(authBaru)).not.toBe(toB64(lama.recoveryAuthKey));
	});

	it('rotasi 50 entri berturut-turut tidak kehilangan satu pun', async () => {
		const mkBaru = await randomBytes(32);
		for (let i = 0; i < 50; i++) {
			const isi = { ...payload, body: `catatan ke-${i}`, mood: (i % 5) + 1 };
			const id = `entri-massal-${i}`;
			const e = await encryptEntry(mkBaru, id, isi);
			expect(await decryptEntry(mkBaru, id, e)).toEqual(isi);
		}
	});
});
