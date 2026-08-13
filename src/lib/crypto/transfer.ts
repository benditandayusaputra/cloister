import { argon2id, hkdf, blake2b, randomBytes, type KdfParams } from './kdf.ts';
import { seal, open } from './aead.ts';
import { concat, toB32, fromB32 } from './bytes.ts';
import { INFO_TRANSFER } from './envelope.ts';

export const AAD_TRANSFER = 'cloister:transfer-blob:v1';
const PIN_KDF: KdfParams = { algo: 'argon2id', memKib: 65536, time: 4, parallel: 1 };

async function transferKey(pin: string, secret: Uint8Array): Promise<Uint8Array> {
	const salt = await blake2b(secret, null, 16);
	const pinKey = await argon2id(pin, salt, PIN_KDF);
	const key = await hkdf(concat(pinKey, secret), INFO_TRANSFER);
	pinKey.fill(0);
	return key;
}

export interface TransferOffer {
	secret: Uint8Array;
	pin: string;
	blob: Uint8Array;
	nonce: Uint8Array;
}

/** Perangkat lama: bungkus MK dengan kunci turunan PIN + rahasia QR. */
export async function createTransferOffer(masterKey: Uint8Array): Promise<TransferOffer> {
	const secret = await randomBytes(32);
	const digits = await randomBytes(6);
	const pin = [...digits].map((d) => (d % 10).toString()).join('');
	const key = await transferKey(pin, secret);
	const sealed = await seal(key, masterKey, AAD_TRANSFER);
	key.fill(0);
	return { secret, pin, blob: sealed.ct, nonce: sealed.nonce };
}

/** Perangkat baru: buka blob dengan PIN + rahasia dari QR/kode manual. */
export async function acceptTransfer(
	pin: string,
	secret: Uint8Array,
	blob: Uint8Array,
	nonce: Uint8Array
): Promise<Uint8Array> {
	const key = await transferKey(pin, secret);
	const mk = await open(key, blob, nonce, AAD_TRANSFER);
	key.fill(0);
	return mk;
}

export function transferUrl(sessionId: string, secret: Uint8Array): string {
	return `cloister://sambung?s=${sessionId}&k=${manualCode(secret)}`;
}

/** Kode manual 20 karakter base32 dari 100 bit pertama rahasia. */
export function manualCode(secret: Uint8Array): string {
	const code = toB32(secret.subarray(0, 13)).slice(0, 20);
	return (code.match(/.{1,4}/g) ?? []).join('-');
}

export function secretFromManual(code: string, full: Uint8Array): Uint8Array {
	const raw = fromB32(code);
	const out = new Uint8Array(32);
	out.set(raw.subarray(0, 13));
	out.set(full.subarray(13), 13);
	return out;
}

export interface TransferPayload {
	sessionId: string;
	secret: string;
}

export function encodeQr(sessionId: string, secret: Uint8Array): string {
	return `cloister://sambung?s=${sessionId}&k=${toB32(secret)}`;
}

export function decodeQr(text: string): TransferPayload | null {
	const m = /^cloister:\/\/sambung\?s=([0-9a-f-]{36})&k=([A-Z2-7]+)$/i.exec(text.trim());
	if (!m || !m[1] || !m[2]) return null;
	return { sessionId: m[1], secret: m[2] };
}

export const secretFromB32 = (s: string): Uint8Array => fromB32(s);
