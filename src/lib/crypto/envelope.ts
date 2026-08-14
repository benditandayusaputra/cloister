import { argon2id, hkdf, randomBytes, blake2b, type KdfParams } from './kdf.ts';
import { seal, open } from './aead.ts';
import { toB64, utf8 } from './bytes.ts';
import { pad, unpad, type Bucket } from './padding.ts';
import { entropyToMnemonic, mnemonicToEntropy, phraseToString } from './recovery.ts';

export const AAD_MK = 'cloister:mk:v1';
export const AAD_RMK = 'cloister:rmk:v1';
export const INFO_AUTH = 'cloister:auth:v1';
export const INFO_KEK = 'cloister:kek:v1';
export const INFO_INDEX = 'cloister:index:v1';
export const INFO_TRANSFER = 'cloister:transfer:v1';
export const INFO_RECOVERY_AUTH = 'cloister:recovery-auth:v1';

/** Kunci bukti kepemilikan 24 kata; dipakai server untuk mengizinkan reset sandi. */
export async function deriveRecoveryAuth(
	phrase: string[],
	recoverySalt: Uint8Array,
	kdf: KdfParams
): Promise<Uint8Array> {
	const recoveryKey = await argon2id(phraseToString(phrase), recoverySalt, kdf);
	const authKey = await hkdf(recoveryKey, INFO_RECOVERY_AUTH);
	recoveryKey.fill(0);
	return authKey;
}

export interface DerivedLogin {
	authKey: Uint8Array;
	kek: Uint8Array;
}

export async function deriveFromPassword(
	password: string,
	saltUser: Uint8Array,
	kdf: KdfParams
): Promise<DerivedLogin> {
	const stretched = await argon2id(password, saltUser, kdf);
	const authKey = await hkdf(stretched, INFO_AUTH);
	const kek = await hkdf(stretched, INFO_KEK);
	stretched.fill(0);
	return { authKey, kek };
}

export interface RegistrationVault {
	masterKey: Uint8Array;
	phrase: string[];
	saltUser: Uint8Array;
	authKey: Uint8Array;
	wrappedMk: Uint8Array;
	mkNonce: Uint8Array;
	recoveryWrappedMk: Uint8Array;
	recoveryNonce: Uint8Array;
	recoverySalt: Uint8Array;
	recoveryAuthKey: Uint8Array;
}

export async function createVault(password: string, kdf: KdfParams): Promise<RegistrationVault> {
	const saltUser = await randomBytes(16);
	const { authKey, kek } = await deriveFromPassword(password, saltUser, kdf);

	const masterKey = await randomBytes(32);
	const wrapped = await seal(kek, masterKey, AAD_MK);

	const entropy = await randomBytes(32);
	const phrase = await entropyToMnemonic(entropy);
	const recoverySalt = await randomBytes(16);
	const recoveryKey = await argon2id(phraseToString(phrase), recoverySalt, kdf);
	const recoveryWrapped = await seal(recoveryKey, masterKey, AAD_RMK);
	const recoveryAuthKey = await hkdf(recoveryKey, INFO_RECOVERY_AUTH);
	recoveryKey.fill(0);
	kek.fill(0);

	return {
		masterKey,
		phrase,
		saltUser,
		authKey,
		wrappedMk: wrapped.ct,
		mkNonce: wrapped.nonce,
		recoveryWrappedMk: recoveryWrapped.ct,
		recoveryNonce: recoveryWrapped.nonce,
		recoverySalt,
		recoveryAuthKey
	};
}

export async function unwrapMasterKey(
	kek: Uint8Array,
	wrappedMk: Uint8Array,
	mkNonce: Uint8Array
): Promise<Uint8Array> {
	return open(kek, wrappedMk, mkNonce, AAD_MK);
}

export async function unwrapWithPhrase(
	phrase: string[],
	recoverySalt: Uint8Array,
	recoveryWrappedMk: Uint8Array,
	recoveryNonce: Uint8Array,
	kdf: KdfParams
): Promise<Uint8Array> {
	await mnemonicToEntropy(phrase);
	const recoveryKey = await argon2id(phraseToString(phrase), recoverySalt, kdf);
	const mk = await open(recoveryKey, recoveryWrappedMk, recoveryNonce, AAD_RMK);
	recoveryKey.fill(0);
	return mk;
}

export interface RewrapResult {
	saltUser: Uint8Array;
	authKey: Uint8Array;
	wrappedMk: Uint8Array;
	mkNonce: Uint8Array;
}

/** Ganti sandi: bungkus ulang MK dengan KEK baru, entri tidak disentuh. */
export async function rewrapForNewPassword(
	masterKey: Uint8Array,
	newPassword: string,
	kdf: KdfParams
): Promise<RewrapResult> {
	const saltUser = await randomBytes(16);
	const { authKey, kek } = await deriveFromPassword(newPassword, saltUser, kdf);
	const wrapped = await seal(kek, masterKey, AAD_MK);
	kek.fill(0);
	return { saltUser, authKey, wrappedMk: wrapped.ct, mkNonce: wrapped.nonce };
}

export async function rewrapForNewPhrase(
	masterKey: Uint8Array,
	kdf: KdfParams
): Promise<{
	phrase: string[];
	recoverySalt: Uint8Array;
	ct: Uint8Array;
	nonce: Uint8Array;
	recoveryAuthKey: Uint8Array;
}> {
	const phrase = await entropyToMnemonic(await randomBytes(32));
	const recoverySalt = await randomBytes(16);
	const recoveryKey = await argon2id(phraseToString(phrase), recoverySalt, kdf);
	const sealed = await seal(recoveryKey, masterKey, AAD_RMK);
	const recoveryAuthKey = await hkdf(recoveryKey, INFO_RECOVERY_AUTH);
	recoveryKey.fill(0);
	return { phrase, recoverySalt, ct: sealed.ct, nonce: sealed.nonce, recoveryAuthKey };
}

// ---------------------------------------------------------------- entri

export interface EncryptedEntry {
	ciphertext: Uint8Array;
	nonce: Uint8Array;
	wrappedDek: Uint8Array;
	dekNonce: Uint8Array;
	sizeBucket: Bucket;
}

export async function encryptEntry(
	masterKey: Uint8Array,
	entryId: string,
	payload: unknown
): Promise<EncryptedEntry> {
	const dek = await randomBytes(32);
	const { padded, bucket } = pad(utf8(JSON.stringify(payload)));
	const body = await seal(dek, padded, entryId);
	const wrapped = await seal(masterKey, dek, entryId);
	dek.fill(0);
	padded.fill(0);
	return {
		ciphertext: body.ct,
		nonce: body.nonce,
		wrappedDek: wrapped.ct,
		dekNonce: wrapped.nonce,
		sizeBucket: bucket
	};
}

export async function decryptEntry<T>(
	masterKey: Uint8Array,
	entryId: string,
	e: Pick<EncryptedEntry, 'ciphertext' | 'nonce' | 'wrappedDek' | 'dekNonce'>
): Promise<T> {
	const dek = await open(masterKey, e.wrappedDek, e.dekNonce, entryId);
	const padded = await open(dek, e.ciphertext, e.nonce, entryId);
	dek.fill(0);
	return JSON.parse(new TextDecoder().decode(unpad(padded))) as T;
}

/**
 * Coba buka sebuah catatan dengan kunci utama acak.
 *
 * Bukan simulasi: ia benar-benar memanggil `crypto_aead_xchacha20poly1305_ietf_decrypt`
 * dengan kunci 32 byte yang baru diacak, lalu mengembalikan kegagalan verifikasi
 * tag Poly1305 apa adanya, termasuk pesan error dari libsodium. Kalau fungsi ini
 * suatu hari berhasil, ada yang jauh lebih salah daripada halaman Bukti.
 */
export async function cobaKunciSalah(
	entryId: string,
	e: Pick<EncryptedEntry, 'ciphertext' | 'nonce' | 'wrappedDek' | 'dekNonce'>
): Promise<{ kunciAcak: Uint8Array; berhasil: boolean; error: string; langkah: string }> {
	const kunciAcak = await randomBytes(32);
	try {
		const dek = await open(kunciAcak, e.wrappedDek, e.dekNonce, entryId);
		// Praktis tidak akan tercapai; disimpan supaya jalur suksesnya tetap jujur.
		const padded = await open(dek, e.ciphertext, e.nonce, entryId);
		dek.fill(0);
		padded.fill(0);
		return { kunciAcak, berhasil: true, error: '', langkah: 'ciphertext catatan' };
	} catch (err) {
		return {
			kunciAcak,
			berhasil: false,
			error: (err as Error).message || String(err),
			langkah: 'membuka wrapped_dek dengan kunci utama'
		};
	}
}

/** DEK telanjang untuk tautan rahasia; MK tidak pernah ikut. */
export async function exportEntryDek(
	masterKey: Uint8Array,
	entryId: string,
	wrappedDek: Uint8Array,
	dekNonce: Uint8Array
): Promise<Uint8Array> {
	return open(masterKey, wrappedDek, dekNonce, entryId);
}

// ---------------------------------------------------------------- lampiran

export interface EncryptedFile {
	ciphertext: Uint8Array;
	nonce: Uint8Array;
	wrappedFileKey: Uint8Array;
	fileKeyNonce: Uint8Array;
}

export async function encryptFile(
	masterKey: Uint8Array,
	attachmentId: string,
	bytes: Uint8Array
): Promise<EncryptedFile> {
	const fileKey = await randomBytes(32);
	const body = await seal(fileKey, bytes, attachmentId);
	const wrapped = await seal(masterKey, fileKey, attachmentId);
	fileKey.fill(0);
	return {
		ciphertext: body.ct,
		nonce: body.nonce,
		wrappedFileKey: wrapped.ct,
		fileKeyNonce: wrapped.nonce
	};
}

export async function decryptFile(
	masterKey: Uint8Array,
	attachmentId: string,
	f: EncryptedFile
): Promise<Uint8Array> {
	const fileKey = await open(masterKey, f.wrappedFileKey, f.fileKeyNonce, attachmentId);
	const bytes = await open(fileKey, f.ciphertext, f.nonce, attachmentId);
	fileKey.fill(0);
	return bytes;
}

// ---------------------------------------------------------------- blind index

export function normalizeTag(tag: string): string {
	return tag.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function tagToken(masterKey: Uint8Array, tag: string): Promise<string> {
	const indexKey = await hkdf(masterKey, INFO_INDEX);
	const token = await blake2b(utf8(normalizeTag(tag)), indexKey, 16);
	indexKey.fill(0);
	return toB64(token);
}

export async function tagTokens(masterKey: Uint8Array, tags: string[]): Promise<string[]> {
	const indexKey = await hkdf(masterKey, INFO_INDEX);
	const out: string[] = [];
	for (const t of tags) out.push(toB64(await blake2b(utf8(normalizeTag(t)), indexKey, 16)));
	indexKey.fill(0);
	return out;
}

/** Sidik jari kunci akun yang ditampilkan di /settings/security. */
export async function keyFingerprint(masterKey: Uint8Array): Promise<string> {
	const h = await blake2b(masterKey, null, 8);
	const hex = [...h].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
	return (hex.match(/.{4}/g) ?? []).join(' · ');
}
