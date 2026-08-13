import { sodium } from './sodium.ts';
import { utf8 } from './bytes.ts';

export const NONCE_BYTES = 24;
export const KEY_BYTES = 32;
export const TAG_BYTES = 16;

export interface Sealed {
	ct: Uint8Array;
	nonce: Uint8Array;
}

export async function seal(
	key: Uint8Array,
	msg: Uint8Array,
	aad: string,
	nonce?: Uint8Array
): Promise<Sealed> {
	const s = await sodium();
	const n = nonce ?? s.randombytes_buf(NONCE_BYTES);
	const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(msg, utf8(aad), null, n, key);
	return { ct, nonce: n };
}

export async function open(
	key: Uint8Array,
	ct: Uint8Array,
	nonce: Uint8Array,
	aad: string
): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, utf8(aad), nonce, key);
}
