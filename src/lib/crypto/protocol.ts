import type { KdfParams } from './kdf.ts';
import type { Bucket } from './padding.ts';

export interface EntryPayload {
	v: 1;
	title: string;
	body: string;
	mood: number | null;
	tags: string[];
	weather?: { code: number; tempC: number } | null;
	location?: { lat: number; lon: number; label: string } | null;
	attachments?: AttachmentMeta[];
	pinned?: boolean;
	publicId?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AttachmentMeta {
	id: string;
	kind: 'image' | 'audio' | 'other';
	name: string;
	mime: string;
	size: number;
	w?: number;
	h?: number;
	alt?: string;
}

export interface SealedParts {
	ciphertext: string;
	nonce: string;
	wrappedDek: string;
	dekNonce: string;
	sizeBucket: Bucket;
}

export type CryptoRequest =
	| { op: 'benchmark' }
	| { op: 'status' }
	| { op: 'register'; password: string; kdf: KdfParams }
	| { op: 'derive'; password: string; saltUser: string; kdf: KdfParams }
	| { op: 'unlockWithKek'; wrappedMk: string; mkNonce: string }
	| {
			op: 'unlockWithPhrase';
			phrase: string[];
			recoverySalt: string;
			ct: string;
			nonce: string;
			kdf: KdfParams;
	  }
	| { op: 'adoptMasterKey'; masterKey: string }
	| { op: 'lock' }
	| { op: 'persistSession' }
	| { op: 'restoreSession'; rekaman: SessionRecord }
	| { op: 'encryptEntry'; entryId: string; payload: EntryPayload }
	| { op: 'decryptEntry'; entryId: string; parts: SealedParts }
	| { op: 'bukaKunciSalah'; entryId: string; parts: SealedParts }
	| { op: 'tagTokens'; tags: string[] }
	| { op: 'fingerprint' }
	| { op: 'rewrapPassword'; password: string; kdf: KdfParams }
	| { op: 'rewrapPhrase'; kdf: KdfParams }
	| { op: 'recoveryAuth'; phrase: string[]; recoverySalt: string; kdf: KdfParams }
	| { op: 'mulaiRotasiMk'; password: string; kdf: KdfParams }
	| { op: 'selesaikanRotasiMk' }
	| {
			op: 'bukaArsip';
			phrase: string[];
			recoverySalt: string;
			ct: string;
			nonce: string;
			kdf: KdfParams;
	  }
	| { op: 'pindahkanArsip'; entryId: string; parts: SealedParts }
	| { op: 'tutupArsip' }
	| { op: 'batalkanRotasiMk' }
	| { op: 'exportDek'; entryId: string; wrappedDek: string; dekNonce: string }
	| { op: 'encryptFile'; attachmentId: string; bytes: ArrayBuffer }
	| {
			op: 'decryptFile';
			attachmentId: string;
			ciphertext: ArrayBuffer;
			nonce: string;
			wrappedFileKey: string;
			fileKeyNonce: string;
	  }
	| { op: 'createTransfer' }
	| { op: 'acceptTransfer'; pin: string; secret: string; blob: string; nonce: string }
	| { op: 'sealVault'; pin: string }
	| { op: 'openVault'; pin: string; salt: string; ct: string; nonce: string };

export interface RegisterResult {
	phrase: string[];
	saltUser: string;
	authKey: string;
	wrappedMk: string;
	mkNonce: string;
	recoveryWrappedMk: string;
	recoveryNonce: string;
	recoverySalt: string;
	recoveryAuthKey: string;
}

export interface SessionRecord {
	key: CryptoKey;
	iv: Uint8Array;
	ct: Uint8Array;
}

/** Hasil percobaan dekripsi dengan kunci acak untuk halaman /bukti. */
export interface PercobaanKunciSalah {
	kunciAcak: string;
	berhasil: boolean;
	error: string;
	langkah: string;
}

export interface CryptoStatus {
	ready: boolean;
	unlocked: boolean;
	hasKek: boolean;
	sedangRotasi: boolean;
	arsipTerbuka: boolean;
}

/** Bahan yang dikirim ke server saat kunci master diganti. */
export interface RotasiMkResult {
	saltUser: string;
	authKey: string;
	wrappedMk: string;
	mkNonce: string;
	phrase: string[];
	recoverySalt: string;
	recoveryWrappedMk: string;
	recoveryNonce: string;
	recoveryAuthKey: string;
	keyVersion: number;
}
