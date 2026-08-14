import { browser } from '$app/environment';
import { polos } from '$lib/utils/polos.ts';
import type { KdfParams } from './kdf.ts';
import { KDF_DEFAULT } from './kdf.ts';
import type {
	CryptoRequest,
	CryptoStatus,
	EntryPayload,
	RegisterResult,
	SealedParts,
	SessionRecord,
	RotasiMkResult,
	PercobaanKunciSalah
} from './protocol.ts';

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function ensureWorker(): Worker {
	if (!browser) throw new Error('kripto hanya berjalan di browser');
	if (worker) return worker;
	worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	worker.onmessage = (ev: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
		const p = pending.get(ev.data.id);
		if (!p) return;
		pending.delete(ev.data.id);
		if (ev.data.ok) p.resolve(ev.data.result);
		else p.reject(new Error(ev.data.error ?? 'operasi kripto gagal'));
	};
	worker.onerror = (e) => {
		for (const p of pending.values()) p.reject(new Error(e.message || 'worker kripto mati'));
		pending.clear();
	};
	return worker;
}

function call<T>(req: CryptoRequest, transfer: Transferable[] = []): Promise<T> {
	const w = ensureWorker();
	const id = ++seq;
	return new Promise<T>((resolve, reject) => {
		pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
		try {
			w.postMessage({ id, req: polos(req) }, transfer);
		} catch (err) {
			pending.delete(id);
			reject(err as Error);
		}
	});
}

export const crypto = {
	benchmark: () => call<KdfParams>({ op: 'benchmark' }),
	status: () => call<CryptoStatus>({ op: 'status' }),

	register: (password: string, kdf: KdfParams = KDF_DEFAULT) =>
		call<RegisterResult>({ op: 'register', password, kdf }),

	derive: (password: string, saltUser: string, kdf: KdfParams) =>
		call<{ authKey: string }>({ op: 'derive', password, saltUser, kdf }),

	unlockWithKek: (wrappedMk: string, mkNonce: string) =>
		call<{ unlocked: true }>({ op: 'unlockWithKek', wrappedMk, mkNonce }),

	unlockWithPhrase: (
		phrase: string[],
		recoverySalt: string,
		ct: string,
		nonce: string,
		kdf: KdfParams
	) => call<{ unlocked: true }>({ op: 'unlockWithPhrase', phrase, recoverySalt, ct, nonce, kdf }),

	adoptMasterKey: (masterKey: string) =>
		call<{ unlocked: true }>({ op: 'adoptMasterKey', masterKey }),

	lock: () => call<{ unlocked: false }>({ op: 'lock' }),

	persistSession: () => call<SessionRecord>({ op: 'persistSession' }),

	restoreSession: (rekaman: SessionRecord) =>
		call<{ unlocked: true }>({ op: 'restoreSession', rekaman }),

	encryptEntry: (entryId: string, payload: EntryPayload) =>
		call<SealedParts>({ op: 'encryptEntry', entryId, payload }),

	decryptEntry: (entryId: string, parts: SealedParts) =>
		call<EntryPayload>({ op: 'decryptEntry', entryId, parts }),

	/** Demonstrasi untuk halaman /bukti. Tidak menyentuh kunci utama. */
	bukaKunciSalah: (entryId: string, parts: SealedParts) =>
		call<PercobaanKunciSalah>({ op: 'bukaKunciSalah', entryId, parts }),

	tagTokens: (tags: string[]) => call<string[]>({ op: 'tagTokens', tags }),

	fingerprint: () => call<string>({ op: 'fingerprint' }),

	rewrapPassword: (password: string, kdf: KdfParams) =>
		call<{ saltUser: string; authKey: string; wrappedMk: string; mkNonce: string }>({
			op: 'rewrapPassword',
			password,
			kdf
		}),

	rewrapPhrase: (kdf: KdfParams) =>
		call<{
			phrase: string[];
			recoverySalt: string;
			recoveryWrappedMk: string;
			recoveryNonce: string;
			recoveryAuthKey: string;
		}>({ op: 'rewrapPhrase', kdf }),

	recoveryAuth: (phrase: string[], recoverySalt: string, kdf: KdfParams) =>
		call<string>({ op: 'recoveryAuth', phrase, recoverySalt, kdf }),

	mulaiRotasiMk: (password: string, kdf: KdfParams) =>
		call<Omit<RotasiMkResult, 'keyVersion'>>({ op: 'mulaiRotasiMk', password, kdf }),

	selesaikanRotasiMk: () => call<{ selesai: true }>({ op: 'selesaikanRotasiMk' }),

	bukaArsip: (phrase: string[], recoverySalt: string, ct: string, nonce: string, kdf: KdfParams) =>
		call<{ terbuka: true }>({ op: 'bukaArsip', phrase, recoverySalt, ct, nonce, kdf }),

	pindahkanArsip: (entryId: string, parts: SealedParts) =>
		call<{ payload: EntryPayload; parts: SealedParts }>({ op: 'pindahkanArsip', entryId, parts }),

	tutupArsip: () => call<{ terbuka: false }>({ op: 'tutupArsip' }),

	batalkanRotasiMk: () => call<{ dibatalkan: boolean }>({ op: 'batalkanRotasiMk' }),

	exportDek: (entryId: string, wrappedDek: string, dekNonce: string) =>
		call<string>({ op: 'exportDek', entryId, wrappedDek, dekNonce }),

	encryptFile: (attachmentId: string, bytes: ArrayBuffer) =>
		call<{ ciphertext: ArrayBuffer; nonce: string; wrappedFileKey: string; fileKeyNonce: string }>(
			{ op: 'encryptFile', attachmentId, bytes },
			[bytes]
		),

	decryptFile: (
		attachmentId: string,
		ciphertext: ArrayBuffer,
		nonce: string,
		wrappedFileKey: string,
		fileKeyNonce: string
	) =>
		call<ArrayBuffer>({ op: 'decryptFile', attachmentId, ciphertext, nonce, wrappedFileKey, fileKeyNonce }, [
			ciphertext
		]),

	createTransfer: () =>
		call<{ pin: string; secret: string; blob: string; nonce: string; manual: string }>({
			op: 'createTransfer'
		}),

	acceptTransfer: (pin: string, secret: string, blob: string, nonce: string) =>
		call<{ unlocked: true; masterKey: string }>({ op: 'acceptTransfer', pin, secret, blob, nonce }),

	sealVault: (pin: string) =>
		call<{ salt: string; ct: string; nonce: string }>({ op: 'sealVault', pin }),

	openVault: (pin: string, salt: string, ct: string, nonce: string) =>
		call<{ unlocked: true }>({ op: 'openVault', pin, salt, ct, nonce })
};

export function terminateCrypto() {
	worker?.terminate();
	worker = null;
	pending.clear();
}
