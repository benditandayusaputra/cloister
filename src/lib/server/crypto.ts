import { createHmac, createHash, randomBytes, timingSafeEqual, scryptSync } from 'node:crypto';
import { CFG } from './env.ts';

export const sha256 = (s: string | Uint8Array): string =>
	createHash('sha256').update(s).digest('hex');

export const hmac = (secret: string, msg: string): Buffer =>
	createHmac('sha256', secret).update(msg).digest();

export const hashIp = (ip: string): string => hmac(CFG.ipHmac, ip).toString('hex').slice(0, 32);

export const actorHash = (ip: string, ua: string): string =>
	hmac(CFG.ipHmac, `${ip}|${ua}`).toString('hex').slice(0, 32);

export const randomToken = (n = 32): string => randomBytes(n).toString('base64url');

/**
 * Hash authKey lagi di server supaya bocornya DB tidak langsung memberi kredensial.
 * scrypt dipakai karena tersedia di runtime Node tanpa dependensi native tambahan.
 */
export function hashAuthKey(authKey: string): string {
	const salt = randomBytes(16);
	const derived = scryptSync(authKey + CFG.authPepper, salt, 32, { N: 16384, r: 8, p: 1 });
	return `scrypt$16384$8$1$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export function verifyAuthKey(authKey: string, stored: string): boolean {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
	const salt = Buffer.from(saltB64, 'base64');
	const expected = Buffer.from(hashB64, 'base64');
	const derived = scryptSync(authKey + CFG.authPepper, salt, expected.length, {
		N: Number(n),
		r: Number(r),
		p: Number(p)
	});
	return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Salt palsu deterministik supaya email tak terdaftar tidak bisa dibedakan. */
export function decoySalt(email: string): Uint8Array {
	return new Uint8Array(hmac(CFG.saltHmac, `salt:${email.toLowerCase()}`).subarray(0, 16));
}

export function decoyBlob(email: string, label: string, len: number): Uint8Array {
	const out = Buffer.alloc(len);
	let off = 0;
	let i = 0;
	while (off < len) {
		const chunk = hmac(CFG.saltHmac, `${label}:${email.toLowerCase()}:${i++}`);
		chunk.copy(out, off);
		off += chunk.length;
	}
	return new Uint8Array(out);
}

export function sixDigitCode(): string {
	return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}
