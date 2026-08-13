import { sodium } from './sodium.ts';
import { concat, utf8 } from './bytes.ts';

export interface KdfParams {
	algo: 'argon2id';
	memKib: number;
	time: number;
	parallel: number;
}

export const KDF_DEFAULT: KdfParams = { algo: 'argon2id', memKib: 65536, time: 3, parallel: 1 };
export const KDF_LEMAH: KdfParams = { algo: 'argon2id', memKib: 32768, time: 3, parallel: 1 };

export const KDF_MIN_MEM_KIB = 8192;
export const KDF_MAX_MEM_KIB = 262144;

export function kdfValid(p: KdfParams): boolean {
	return (
		p.algo === 'argon2id' &&
		Number.isInteger(p.memKib) &&
		p.memKib >= KDF_MIN_MEM_KIB &&
		p.memKib <= KDF_MAX_MEM_KIB &&
		Number.isInteger(p.time) &&
		p.time >= 1 &&
		p.time <= 10 &&
		p.parallel === 1
	);
}

export async function argon2id(
	password: string | Uint8Array,
	salt: Uint8Array,
	params: KdfParams = KDF_DEFAULT,
	len = 32
): Promise<Uint8Array> {
	const s = await sodium();
	if (salt.length !== s.crypto_pwhash_SALTBYTES) throw new Error('salt harus 16 byte');
	return s.crypto_pwhash(
		len,
		password,
		salt,
		params.time,
		params.memKib * 1024,
		s.crypto_pwhash_ALG_ARGON2ID13
	);
}

const HMAC_BLOK = 64;

/** HMAC-SHA256 dengan kunci panjang bebas (libsodium hanya menerima kunci 32 byte). */
async function hmacSha256(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
	const s = await sodium();
	let k = key;
	if (k.length > HMAC_BLOK) k = new Uint8Array(s.crypto_hash_sha256(k));
	const blok = new Uint8Array(HMAC_BLOK);
	blok.set(k);

	const ipad = new Uint8Array(HMAC_BLOK);
	const opad = new Uint8Array(HMAC_BLOK);
	for (let i = 0; i < HMAC_BLOK; i++) {
		ipad[i] = (blok[i] as number) ^ 0x36;
		opad[i] = (blok[i] as number) ^ 0x5c;
	}

	const dalam = new Uint8Array(s.crypto_hash_sha256(concat(ipad, msg)));
	return new Uint8Array(s.crypto_hash_sha256(concat(opad, dalam)));
}

/** HKDF-SHA256 sesuai RFC 5869. */
export async function hkdf(
	ikm: Uint8Array,
	info: string | Uint8Array,
	len = 32,
	salt?: Uint8Array
): Promise<Uint8Array> {
	const prk = await hmacSha256(salt ?? new Uint8Array(32), ikm);
	const infoBytes = typeof info === 'string' ? utf8(info) : info;
	const out = new Uint8Array(len);
	let prev: Uint8Array = new Uint8Array(0);
	let off = 0;
	for (let i = 1; off < len; i++) {
		prev = await hmacSha256(prk, concat(prev, infoBytes, new Uint8Array([i])));
		const take = Math.min(prev.length, len - off);
		out.set(prev.subarray(0, take), off);
		off += take;
	}
	return out;
}

export async function blake2b(
	msg: Uint8Array,
	key: Uint8Array | null = null,
	len = 32
): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_generichash(len, msg, key);
}

export async function randomBytes(n: number): Promise<Uint8Array> {
	const s = await sodium();
	return s.randombytes_buf(n);
}

/** Ukur waktu Argon2id lalu pilih parameter yang tidak menyakiti perangkat lemah. */
export async function benchmarkKdf(): Promise<KdfParams> {
	const salt = await randomBytes(16);
	const mulai = performance.now();
	await argon2id('cloister-benchmark', salt, KDF_LEMAH);
	const durasi = performance.now() - mulai;
	return durasi > 900 ? KDF_LEMAH : KDF_DEFAULT;
}
