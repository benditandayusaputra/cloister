import { describe, it, expect } from 'vitest';
import { argon2id, hkdf, blake2b, randomBytes, kdfValid, KDF_DEFAULT } from '$crypto/kdf.ts';
import { seal, open } from '$crypto/aead.ts';
import { toB64, fromB64, toB32, fromB32, utf8, concat, equalBytes } from '$crypto/bytes.ts';
import { pad, unpad, pickBucket, BUCKETS } from '$crypto/padding.ts';
import { entropyToMnemonic, mnemonicToEntropy, isWord, suggest } from '$crypto/recovery.ts';
import {
	createVault,
	deriveFromPassword,
	unwrapMasterKey,
	unwrapWithPhrase,
	rewrapForNewPassword,
	encryptEntry,
	decryptEntry,
	encryptFile,
	decryptFile,
	tagToken,
	normalizeTag,
	deriveRecoveryAuth
} from '$crypto/envelope.ts';
import { createTransferOffer, acceptTransfer, encodeQr, decodeQr } from '$crypto/transfer.ts';

const TES_KDF = { algo: 'argon2id' as const, memKib: 8192, time: 1, parallel: 1 as const };

describe('base64 dan base32', () => {
	it('roundtrip base64 untuk semua panjang 0..64', () => {
		for (let n = 0; n <= 64; n++) {
			const b = new Uint8Array(n).map((_, i) => (i * 37 + n) & 0xff);
			expect(equalBytes(fromB64(toB64(b)), b)).toBe(true);
		}
	});

	it('roundtrip base32 untuk semua panjang 0..40', () => {
		for (let n = 0; n <= 40; n++) {
			const b = new Uint8Array(n).map((_, i) => (i * 13 + 7) & 0xff);
			expect(equalBytes(fromB32(toB32(b)).subarray(0, n), b)).toBe(true);
		}
	});

	it('vektor base64 tetap', () => {
		expect(toB64(utf8('Cloister'))).toBe('Q2xvaXN0ZXI=');
		expect(toB64(utf8('f'))).toBe('Zg==');
		expect(toB64(utf8('fo'))).toBe('Zm8=');
		expect(toB64(utf8('foo'))).toBe('Zm9v');
	});
});

describe('Argon2id', () => {
	it('vektor tetap untuk salt dan sandi tertentu', async () => {
		const salt = new Uint8Array(16).fill(0x42);
		const a = await argon2id('cloister-test-vector', salt, TES_KDF);
		const b = await argon2id('cloister-test-vector', salt, TES_KDF);
		expect(a.length).toBe(32);
		expect(toB64(a)).toBe(toB64(b));
	});

	it('sandi berbeda menghasilkan kunci berbeda', async () => {
		const salt = new Uint8Array(16).fill(1);
		const a = await argon2id('satu', salt, TES_KDF);
		const b = await argon2id('dua', salt, TES_KDF);
		expect(toB64(a)).not.toBe(toB64(b));
	});

	it('menolak salt bukan 16 byte', async () => {
		await expect(argon2id('x', new Uint8Array(8), TES_KDF)).rejects.toThrow();
	});

	it('validasi parameter KDF', () => {
		expect(kdfValid(KDF_DEFAULT)).toBe(true);
		expect(kdfValid({ ...KDF_DEFAULT, memKib: 100 })).toBe(false);
		expect(kdfValid({ ...KDF_DEFAULT, time: 0 })).toBe(false);
	});
});

describe('HKDF-SHA256', () => {
	it('RFC 5869 test case 1', async () => {
		const ikm = new Uint8Array(22).fill(0x0b);
		const salt = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		const info = new Uint8Array([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9]);
		const okm = await hkdf(ikm, info, 42, salt);
		const hex = [...okm].map((b) => b.toString(16).padStart(2, '0')).join('');
		expect(hex).toBe(
			'3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865'
		);
	});

	it('info berbeda menghasilkan sub-kunci berbeda', async () => {
		const ikm = await randomBytes(32);
		const a = await hkdf(ikm, 'cloister:auth:v1');
		const b = await hkdf(ikm, 'cloister:kek:v1');
		expect(toB64(a)).not.toBe(toB64(b));
	});

	it('panjang keluaran bisa lebih dari satu blok', async () => {
		const ikm = new Uint8Array(32).fill(9);
		const okm = await hkdf(ikm, 'cloister:test', 100);
		expect(okm.length).toBe(100);
	});
});

describe('BLAKE2b', () => {
	it('vektor tetap tanpa kunci', async () => {
		const h = await blake2b(utf8('Cloister'), null, 32);
		expect(h.length).toBe(32);
		const ulang = await blake2b(utf8('Cloister'), null, 32);
		expect(toB64(h)).toBe(toB64(ulang));
	});

	it('kunci mengubah keluaran', async () => {
		const key = new Uint8Array(32).fill(7);
		const a = await blake2b(utf8('Cloister'), null, 16);
		const b = await blake2b(utf8('Cloister'), key, 16);
		expect(toB64(a)).not.toBe(toB64(b));
	});
});

describe('XChaCha20-Poly1305', () => {
	it('roundtrip dengan AAD', async () => {
		const key = await randomBytes(32);
		const msg = utf8('Hujan dari sore sampai malam.');
		const s = await seal(key, msg, 'entry-id-123');
		expect(s.nonce.length).toBe(24);
		expect(s.ct.length).toBe(msg.length + 16);
		const kembali = await open(key, s.ct, s.nonce, 'entry-id-123');
		expect(equalBytes(kembali, msg)).toBe(true);
	});

	it('AAD salah menyebabkan gagal', async () => {
		const key = await randomBytes(32);
		const s = await seal(key, utf8('rahasia'), 'aad-benar');
		await expect(open(key, s.ct, s.nonce, 'aad-salah')).rejects.toThrow();
	});

	it('ciphertext dimodifikasi menyebabkan gagal', async () => {
		const key = await randomBytes(32);
		const s = await seal(key, utf8('rahasia'), 'aad');
		s.ct[0] = (s.ct[0] as number) ^ 1;
		await expect(open(key, s.ct, s.nonce, 'aad')).rejects.toThrow();
	});

	it('nonce acak setiap enkripsi', async () => {
		const key = await randomBytes(32);
		const a = await seal(key, utf8('sama'), 'aad');
		const b = await seal(key, utf8('sama'), 'aad');
		expect(toB64(a.nonce)).not.toBe(toB64(b.nonce));
		expect(toB64(a.ct)).not.toBe(toB64(b.ct));
	});
});

describe('padding ISO 7816-4', () => {
	it('roundtrip pada semua bucket', () => {
		for (const b of BUCKETS.slice(0, 5)) {
			const msg = new Uint8Array(b - 1).fill(0x41);
			const { padded, bucket } = pad(msg);
			expect(bucket).toBe(b);
			expect(padded.length).toBe(b);
			expect(equalBytes(unpad(padded), msg)).toBe(true);
		}
	});

	it('memilih bucket terkecil yang cukup', () => {
		expect(pickBucket(1)).toBe(256);
		expect(pickBucket(255)).toBe(256);
		expect(pickBucket(256)).toBe(1024);
		expect(pickBucket(4095)).toBe(4096);
	});

	it('pesan kosong tetap dipadding', () => {
		const { padded } = pad(new Uint8Array(0));
		expect(padded.length).toBe(256);
		expect(unpad(padded).length).toBe(0);
	});

	it('menolak padding rusak', () => {
		expect(() => unpad(new Uint8Array(256))).toThrow();
	});

	it('menolak pesan terlalu besar', () => {
		expect(() => pad(new Uint8Array(200_000))).toThrow();
	});
});

describe('mnemonic BIP-39', () => {
	it('vektor tetap: entropi nol', async () => {
		const kata = await entropyToMnemonic(new Uint8Array(32));
		expect(kata.length).toBe(24);
		expect(kata[0]).toBe('abandon');
		expect(kata[23]).toBe('art');
	});

	it('vektor tetap: entropi 0x7f', async () => {
		const kata = await entropyToMnemonic(new Uint8Array(32).fill(0x7f));
		expect(kata.join(' ').split(' ').length).toBe(24);
		const balik = await mnemonicToEntropy(kata);
		expect(equalBytes(balik, new Uint8Array(32).fill(0x7f))).toBe(true);
	});

	it('roundtrip properti 300 iterasi', async () => {
		for (let i = 0; i < 300; i++) {
			const e = await randomBytes(32);
			const kata = await entropyToMnemonic(e);
			expect(kata.length).toBe(24);
			expect(equalBytes(await mnemonicToEntropy(kata), e)).toBe(true);
		}
	});

	it('checksum salah ditolak', async () => {
		const kata = await entropyToMnemonic(new Uint8Array(32));
		const rusak = [...kata];
		rusak[23] = 'zoo';
		await expect(mnemonicToEntropy(rusak)).rejects.toThrow(/checksum/);
	});

	it('kata tidak dikenal ditolak', async () => {
		const kata = await entropyToMnemonic(new Uint8Array(32));
		const rusak = [...kata];
		rusak[5] = 'bukankata';
		await expect(mnemonicToEntropy(rusak)).rejects.toThrow(/tidak dikenal/);
	});

	it('jumlah kata harus 24', async () => {
		await expect(mnemonicToEntropy(['abandon'])).rejects.toThrow();
	});

	it('validasi dan saran kata', () => {
		expect(isWord('abandon')).toBe(true);
		expect(isWord('ABANDON ')).toBe(true);
		expect(isWord('bukankata')).toBe(false);
		expect(suggest('aban')).toContain('abandon');
	});
});

describe('envelope kunci', () => {
	it('registrasi lalu buka MK dengan sandi', async () => {
		const v = await createVault('sandi-yang-panjang-sekali', TES_KDF);
		expect(v.masterKey.length).toBe(32);
		expect(v.wrappedMk.length).toBe(48);
		expect(v.phrase.length).toBe(24);
		expect(v.recoveryAuthKey.length).toBe(32);

		const d = await deriveFromPassword('sandi-yang-panjang-sekali', v.saltUser, TES_KDF);
		const mk = await unwrapMasterKey(d.kek, v.wrappedMk, v.mkNonce);
		expect(equalBytes(mk, v.masterKey)).toBe(true);
	});

	it('sandi salah tidak bisa membuka MK', async () => {
		const v = await createVault('sandi-benar-panjang', TES_KDF);
		const d = await deriveFromPassword('sandi-salah-panjang', v.saltUser, TES_KDF);
		await expect(unwrapMasterKey(d.kek, v.wrappedMk, v.mkNonce)).rejects.toThrow();
	});

	it('frasa pemulihan membuka MK yang sama', async () => {
		const v = await createVault('sandi-panjang-sekali', TES_KDF);
		const mk = await unwrapWithPhrase(
			v.phrase,
			v.recoverySalt,
			v.recoveryWrappedMk,
			v.recoveryNonce,
			TES_KDF
		);
		expect(equalBytes(mk, v.masterKey)).toBe(true);
	});

	it('frasa salah ditolak', async () => {
		const v = await createVault('sandi-panjang-sekali', TES_KDF);
		const lain = await entropyToMnemonic(await randomBytes(32));
		await expect(
			unwrapWithPhrase(lain, v.recoverySalt, v.recoveryWrappedMk, v.recoveryNonce, TES_KDF)
		).rejects.toThrow();
	});

	it('recoveryAuthKey deterministik dari frasa dan salt', async () => {
		const v = await createVault('sandi-panjang-sekali', TES_KDF);
		const ulang = await deriveRecoveryAuth(v.phrase, v.recoverySalt, TES_KDF);
		expect(toB64(ulang)).toBe(toB64(v.recoveryAuthKey));
	});

	it('ganti sandi tidak mengubah MK', async () => {
		const v = await createVault('sandi-lama-panjang', TES_KDF);
		const r = await rewrapForNewPassword(v.masterKey, 'sandi-baru-panjang', TES_KDF);
		const d = await deriveFromPassword('sandi-baru-panjang', r.saltUser, TES_KDF);
		const mk = await unwrapMasterKey(d.kek, r.wrappedMk, r.mkNonce);
		expect(equalBytes(mk, v.masterKey)).toBe(true);
		expect(toB64(r.authKey)).not.toBe(toB64(v.authKey));
	});

	it('authKey berukuran 32 byte dan wrappedMk 48 byte', async () => {
		const v = await createVault('sandi-panjang-sekali', TES_KDF);
		expect(v.authKey.length).toBe(32);
		expect(v.wrappedMk.length).toBe(48);
		expect(v.mkNonce.length).toBe(24);
		expect(v.recoveryWrappedMk.length).toBe(48);
		expect(v.saltUser.length).toBe(16);
	});
});

describe('enkripsi entri', () => {
	const payload = {
		v: 1 as const,
		title: 'Hari yang panjang',
		body: '# Pagi\n\nBangun kesiangan lagi...',
		mood: 3,
		tags: ['skripsi', 'capek'],
		createdAt: '2026-03-17T21:04:11.221Z',
		updatedAt: '2026-03-17T21:39:02.980Z'
	};

	it('roundtrip entri', async () => {
		const mk = await randomBytes(32);
		const id = '0192abcd-0000-7000-8000-000000000001';
		const e = await encryptEntry(mk, id, payload);
		expect(e.wrappedDek.length).toBe(48);
		expect(e.nonce.length).toBe(24);
		expect(e.dekNonce.length).toBe(24);
		expect(e.ciphertext.length).toBe(e.sizeBucket + 16);

		const balik = await decryptEntry<typeof payload>(mk, id, e);
		expect(balik).toEqual(payload);
	});

	it('entryId sebagai AAD mencegah pertukaran entri', async () => {
		const mk = await randomBytes(32);
		const e = await encryptEntry(mk, 'id-satu', payload);
		await expect(decryptEntry(mk, 'id-dua', e)).rejects.toThrow();
	});

	it('MK berbeda tidak bisa membuka', async () => {
		const mk = await randomBytes(32);
		const lain = await randomBytes(32);
		const e = await encryptEntry(mk, 'id', payload);
		await expect(decryptEntry(lain, 'id', e)).rejects.toThrow();
	});

	it('DEK unik per entri', async () => {
		const mk = await randomBytes(32);
		const a = await encryptEntry(mk, 'id-a', payload);
		const b = await encryptEntry(mk, 'id-b', payload);
		expect(toB64(a.wrappedDek)).not.toBe(toB64(b.wrappedDek));
	});

	it('ciphertext tidak mengandung plaintext', async () => {
		const mk = await randomBytes(32);
		const e = await encryptEntry(mk, 'id', payload);
		const hay = toB64(e.ciphertext);
		const raw = String.fromCharCode(...e.ciphertext);
		expect(raw).not.toContain('Bangun kesiangan');
		expect(raw).not.toContain('skripsi');
		expect(hay).not.toContain(btoa('skripsi').replace(/=+$/, ''));
	});

	it('ukuran ciphertext hanya membocorkan bucket', async () => {
		const mk = await randomBytes(32);
		const pendek = await encryptEntry(mk, 'a', { ...payload, body: 'hai' });
		const agakPanjang = await encryptEntry(mk, 'b', { ...payload, body: 'x'.repeat(20) });
		expect(pendek.sizeBucket).toBe(agakPanjang.sizeBucket);
		expect(pendek.ciphertext.length).toBe(agakPanjang.ciphertext.length);
	});

	it('roundtrip properti 200 iterasi', async () => {
		const mk = await randomBytes(32);
		for (let i = 0; i < 200; i++) {
			const isi = { ...payload, body: 'x'.repeat(i * 3), mood: (i % 5) + 1 };
			const id = `id-${i}`;
			const e = await encryptEntry(mk, id, isi);
			expect(await decryptEntry(mk, id, e)).toEqual(isi);
		}
	});
});

describe('lampiran', () => {
	it('roundtrip berkas', async () => {
		const mk = await randomBytes(32);
		const bytes = await randomBytes(4096);
		const f = await encryptFile(mk, 'att-1', bytes);
		expect(f.wrappedFileKey.length).toBe(48);
		const balik = await decryptFile(mk, 'att-1', f);
		expect(equalBytes(balik, bytes)).toBe(true);
	});

	it('attachmentId sebagai AAD', async () => {
		const mk = await randomBytes(32);
		const f = await encryptFile(mk, 'att-1', await randomBytes(64));
		await expect(decryptFile(mk, 'att-2', f)).rejects.toThrow();
	});
});

describe('blind index tag', () => {
	it('tag sama menghasilkan token sama', async () => {
		const mk = await randomBytes(32);
		expect(await tagToken(mk, 'Skripsi')).toBe(await tagToken(mk, ' skripsi '));
	});

	it('MK berbeda menghasilkan token berbeda', async () => {
		const a = await randomBytes(32);
		const b = await randomBytes(32);
		expect(await tagToken(a, 'skripsi')).not.toBe(await tagToken(b, 'skripsi'));
	});

	it('token tidak membocorkan tag', async () => {
		const mk = await randomBytes(32);
		const t = await tagToken(mk, 'kesehatan-mental');
		expect(t).not.toContain('kesehatan');
		expect(fromB64(t).length).toBe(16);
	});

	it('normalisasi tag', () => {
		expect(normalizeTag('  Skripsi   Akhir ')).toBe('skripsi akhir');
	});
});

describe('protokol transfer perangkat', () => {
	it('perangkat baru membuka MK dengan PIN dan rahasia', async () => {
		const mk = await randomBytes(32);
		const o = await createTransferOffer(mk);
		expect(o.pin).toMatch(/^\d{6}$/);
		expect(o.secret.length).toBe(32);
		expect(o.blob.length).toBe(48);

		const dibuka = await acceptTransfer(o.pin, o.secret, o.blob, o.nonce);
		expect(equalBytes(dibuka, mk)).toBe(true);
	});

	it('PIN salah gagal', async () => {
		const mk = await randomBytes(32);
		const o = await createTransferOffer(mk);
		const salah = o.pin === '000000' ? '111111' : '000000';
		await expect(acceptTransfer(salah, o.secret, o.blob, o.nonce)).rejects.toThrow();
	});

	it('rahasia QR salah gagal meski PIN benar', async () => {
		const mk = await randomBytes(32);
		const o = await createTransferOffer(mk);
		await expect(acceptTransfer(o.pin, await randomBytes(32), o.blob, o.nonce)).rejects.toThrow();
	});

	it('encode dan decode QR', async () => {
		const secret = await randomBytes(32);
		const sid = '0192abcd-0000-7000-8000-000000000001';
		const teks = encodeQr(sid, secret);
		const hasil = decodeQr(teks);
		expect(hasil?.sessionId).toBe(sid);
		expect(equalBytes(fromB32(hasil?.secret ?? '').subarray(0, 32), secret)).toBe(true);
	});

	it('QR bukan milik Papan ditolak', () => {
		expect(decodeQr('https://contoh.id/apa')).toBeNull();
		expect(decodeQr('cloister://sambung?s=bukan-uuid&k=AAAA')).toBeNull();
	});
});

describe('utilitas byte', () => {
	it('concat menggabungkan urut', () => {
		const out = concat(new Uint8Array([1, 2]), new Uint8Array([3]), new Uint8Array([4, 5]));
		expect([...out]).toEqual([1, 2, 3, 4, 5]);
	});

	it('equalBytes waktu tetap secara logis', () => {
		expect(equalBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
		expect(equalBytes(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
		expect(equalBytes(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
	});
});
