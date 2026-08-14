/// <reference lib="webworker" />
import { sodium } from './sodium.ts';
import { argon2id, benchmarkKdf, randomBytes, type KdfParams } from './kdf.ts';
import { toB64, fromB64, toB32, fromB32 } from './bytes.ts';
import { seal, open } from './aead.ts';
import {
	createVault,
	deriveFromPassword,
	unwrapMasterKey,
	unwrapWithPhrase,
	rewrapForNewPassword,
	rewrapForNewPhrase,
	deriveRecoveryAuth,
	encryptEntry,
	decryptEntry,
	encryptFile,
	decryptFile,
	exportEntryDek,
	tagTokens,
	keyFingerprint,
	cobaKunciSalah,
	AAD_MK
} from './envelope.ts';
import { createTransferOffer, acceptTransfer, manualCode } from './transfer.ts';
import { bungkusSesi, bukaSesi } from './sesi-brankas.ts';
import type { CryptoRequest } from './protocol.ts';

const AAD_VAULT = 'cloister:vault:v1';
const VAULT_KDF: KdfParams = { algo: 'argon2id', memKib: 65536, time: 3, parallel: 1 };

// Kunci hanya hidup di sini. Thread utama tidak pernah menerimanya.
let masterKey: Uint8Array | null = null;
let kek: Uint8Array | null = null;

/**
 * Selama rotasi, MK lama dipertahankan untuk membuka entri lama sementara
 * MK baru dipakai membungkus ulang. Keduanya hidup berdampingan sampai
 * rotasi diselesaikan atau dibatalkan.
 */
let mkLama: Uint8Array | null = null;

/** Kunci arsip "mulai dari nol", hidup terpisah dari kunci aktif. */
let mkArsip: Uint8Array | null = null;

function requireMk(): Uint8Array {
	if (!masterKey) throw new Error('brankas terkunci');
	return masterKey;
}

function wipeAll() {
	masterKey?.fill(0);
	kek?.fill(0);
	mkLama?.fill(0);
	mkArsip?.fill(0);
	masterKey = null;
	kek = null;
	mkLama = null;
	mkArsip = null;
}

async function handle(req: CryptoRequest): Promise<unknown> {
	switch (req.op) {
		case 'benchmark':
			return benchmarkKdf();

		case 'status':
			return {
				ready: true,
				unlocked: masterKey !== null,
				hasKek: kek !== null,
				sedangRotasi: mkLama !== null,
				arsipTerbuka: mkArsip !== null
			};

		case 'register': {
			const v = await createVault(req.password, req.kdf);
			masterKey = v.masterKey;
			return {
				phrase: v.phrase,
				saltUser: toB64(v.saltUser),
				authKey: toB64(v.authKey),
				wrappedMk: toB64(v.wrappedMk),
				mkNonce: toB64(v.mkNonce),
				recoveryWrappedMk: toB64(v.recoveryWrappedMk),
				recoveryNonce: toB64(v.recoveryNonce),
				recoverySalt: toB64(v.recoverySalt),
				recoveryAuthKey: toB64(v.recoveryAuthKey)
			};
		}

		case 'derive': {
			const d = await deriveFromPassword(req.password, fromB64(req.saltUser), req.kdf);
			kek?.fill(0);
			kek = d.kek;
			return { authKey: toB64(d.authKey) };
		}

		case 'unlockWithKek': {
			if (!kek) throw new Error('turunkan sandi dulu');
			masterKey = await unwrapMasterKey(kek, fromB64(req.wrappedMk), fromB64(req.mkNonce));
			return { unlocked: true };
		}

		case 'unlockWithPhrase': {
			masterKey = await unwrapWithPhrase(
				req.phrase,
				fromB64(req.recoverySalt),
				fromB64(req.ct),
				fromB64(req.nonce),
				req.kdf
			);
			return { unlocked: true };
		}

		case 'adoptMasterKey': {
			masterKey = fromB64(req.masterKey);
			return { unlocked: true };
		}

		case 'lock':
			wipeAll();
			return { unlocked: false };

		case 'persistSession':
			return bungkusSesi(requireMk());

		case 'restoreSession': {
			masterKey = await bukaSesi(req.rekaman);
			return { unlocked: true };
		}

		case 'encryptEntry': {
			const e = await encryptEntry(requireMk(), req.entryId, req.payload);
			return {
				ciphertext: toB64(e.ciphertext),
				nonce: toB64(e.nonce),
				wrappedDek: toB64(e.wrappedDek),
				dekNonce: toB64(e.dekNonce),
				sizeBucket: e.sizeBucket
			};
		}

		case 'decryptEntry':
			return decryptEntry(requireMk(), req.entryId, {
				ciphertext: fromB64(req.parts.ciphertext),
				nonce: fromB64(req.parts.nonce),
				wrappedDek: fromB64(req.parts.wrappedDek),
				dekNonce: fromB64(req.parts.dekNonce)
			});

		case 'bukaKunciSalah': {
			// Tidak menyentuh masterKey sama sekali: seluruh percobaan memakai kunci
			// acak, jadi menjalankannya tidak pernah membuka apa pun.
			const r = await cobaKunciSalah(req.entryId, {
				ciphertext: fromB64(req.parts.ciphertext),
				nonce: fromB64(req.parts.nonce),
				wrappedDek: fromB64(req.parts.wrappedDek),
				dekNonce: fromB64(req.parts.dekNonce)
			});
			return {
				kunciAcak: toB64(r.kunciAcak),
				berhasil: r.berhasil,
				error: r.error,
				langkah: r.langkah
			};
		}

		case 'tagTokens':
			return tagTokens(requireMk(), req.tags);

		case 'fingerprint':
			return keyFingerprint(requireMk());

		case 'rewrapPassword': {
			const r = await rewrapForNewPassword(requireMk(), req.password, req.kdf);
			return {
				saltUser: toB64(r.saltUser),
				authKey: toB64(r.authKey),
				wrappedMk: toB64(r.wrappedMk),
				mkNonce: toB64(r.mkNonce)
			};
		}

		case 'rewrapPhrase': {
			const r = await rewrapForNewPhrase(requireMk(), req.kdf);
			return {
				phrase: r.phrase,
				recoverySalt: toB64(r.recoverySalt),
				recoveryWrappedMk: toB64(r.ct),
				recoveryNonce: toB64(r.nonce),
				recoveryAuthKey: toB64(r.recoveryAuthKey)
			};
		}

		case 'mulaiRotasiMk': {
			// MK lama disimpan sementara, MK baru dibuat beserta sandi dan frasa barunya.
			const lama = requireMk();
			const baru = await randomBytes(32);

			const saltUser = await randomBytes(16);
			const turunan = await deriveFromPassword(req.password, saltUser, req.kdf);
			const wrapped = await seal(turunan.kek, baru, AAD_MK);

			const rp = await rewrapForNewPhrase(baru, req.kdf);

			mkLama = lama;
			masterKey = baru;
			kek?.fill(0);
			kek = turunan.kek;

			return {
				saltUser: toB64(saltUser),
				authKey: toB64(turunan.authKey),
				wrappedMk: toB64(wrapped.ct),
				mkNonce: toB64(wrapped.nonce),
				phrase: rp.phrase,
				recoverySalt: toB64(rp.recoverySalt),
				recoveryWrappedMk: toB64(rp.ct),
				recoveryNonce: toB64(rp.nonce),
				recoveryAuthKey: toB64(rp.recoveryAuthKey)
			};
		}

		case 'selesaikanRotasiMk':
			mkLama?.fill(0);
			mkLama = null;
			return { selesai: true };

		case 'batalkanRotasiMk': {
			// Kembalikan MK lama supaya arsip tetap terbuka kalau rotasi gagal di tengah.
			if (!mkLama) return { dibatalkan: false };
			masterKey?.fill(0);
			masterKey = mkLama;
			mkLama = null;
			kek?.fill(0);
			kek = null;
			return { dibatalkan: true };
		}

		case 'bukaArsip': {
			mkArsip = await unwrapWithPhrase(
				req.phrase,
				fromB64(req.recoverySalt),
				fromB64(req.ct),
				fromB64(req.nonce),
				req.kdf
			);
			return { terbuka: true };
		}

		case 'pindahkanArsip': {
			// Dibuka dengan kunci arsip, ditutup lagi dengan kunci aktif.
			if (!mkArsip) throw new Error('arsip belum dibuka');
			const payload = await decryptEntry(mkArsip, req.entryId, {
				ciphertext: fromB64(req.parts.ciphertext),
				nonce: fromB64(req.parts.nonce),
				wrappedDek: fromB64(req.parts.wrappedDek),
				dekNonce: fromB64(req.parts.dekNonce)
			});
			const e = await encryptEntry(requireMk(), req.entryId, payload);
			return {
				payload,
				parts: {
					ciphertext: toB64(e.ciphertext),
					nonce: toB64(e.nonce),
					wrappedDek: toB64(e.wrappedDek),
					dekNonce: toB64(e.dekNonce),
					sizeBucket: e.sizeBucket
				}
			};
		}

		case 'tutupArsip':
			mkArsip?.fill(0);
			mkArsip = null;
			return { terbuka: false };

		case 'recoveryAuth':
			return toB64(
				await deriveRecoveryAuth(req.phrase, fromB64(req.recoverySalt), req.kdf)
			);

		case 'exportDek': {
			const dek = await exportEntryDek(
				requireMk(),
				req.entryId,
				fromB64(req.wrappedDek),
				fromB64(req.dekNonce)
			);
			const out = toB64(dek);
			dek.fill(0);
			return out;
		}

		case 'encryptFile': {
			const f = await encryptFile(requireMk(), req.attachmentId, new Uint8Array(req.bytes));
			return {
				ciphertext: f.ciphertext.buffer,
				nonce: toB64(f.nonce),
				wrappedFileKey: toB64(f.wrappedFileKey),
				fileKeyNonce: toB64(f.fileKeyNonce)
			};
		}

		case 'decryptFile': {
			const bytes = await decryptFile(requireMk(), req.attachmentId, {
				ciphertext: new Uint8Array(req.ciphertext),
				nonce: fromB64(req.nonce),
				wrappedFileKey: fromB64(req.wrappedFileKey),
				fileKeyNonce: fromB64(req.fileKeyNonce)
			});
			return bytes.buffer;
		}

		case 'createTransfer': {
			const o = await createTransferOffer(requireMk());
			return {
				pin: o.pin,
				secret: toB32(o.secret),
				blob: toB64(o.blob),
				nonce: toB64(o.nonce),
				manual: manualCode(o.secret)
			};
		}

		case 'acceptTransfer': {
			masterKey = await acceptTransfer(
				req.pin,
				fromB32(req.secret),
				fromB64(req.blob),
				fromB64(req.nonce)
			);
			return { unlocked: true, masterKey: toB64(masterKey) };
		}

		case 'sealVault': {
			const salt = await randomBytes(16);
			const key = await argon2id(req.pin, salt, VAULT_KDF);
			const sealed = await seal(key, requireMk(), AAD_VAULT);
			key.fill(0);
			return { salt: toB64(salt), ct: toB64(sealed.ct), nonce: toB64(sealed.nonce) };
		}

		case 'openVault': {
			const key = await argon2id(req.pin, fromB64(req.salt), VAULT_KDF);
			masterKey = await open(key, fromB64(req.ct), fromB64(req.nonce), AAD_VAULT);
			key.fill(0);
			return { unlocked: true };
		}
	}
}

self.onmessage = async (ev: MessageEvent<{ id: number; req: CryptoRequest }>) => {
	const { id, req } = ev.data;
	try {
		await sodium();
		const result = await handle(req);
		const transfer: Transferable[] = [];
		if (result instanceof ArrayBuffer) transfer.push(result);
		else if (result && typeof result === 'object' && 'ciphertext' in result) {
			const ct = (result as { ciphertext: unknown }).ciphertext;
			if (ct instanceof ArrayBuffer) transfer.push(ct);
		}
		self.postMessage({ id, ok: true, result }, transfer);
	} catch (err) {
		self.postMessage({ id, ok: false, error: (err as Error).message ?? 'gagal' });
	}
};
