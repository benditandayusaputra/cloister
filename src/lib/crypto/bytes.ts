const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function toB64(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i += 3) {
		const a = bytes[i] as number;
		const b = bytes[i + 1];
		const c = bytes[i + 2];
		out += B64_ALPHABET[a >> 2];
		out += B64_ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
		out += b === undefined ? '=' : B64_ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
		out += c === undefined ? '=' : B64_ALPHABET[c & 63];
	}
	return out;
}

export function fromB64(s: string): Uint8Array {
	const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
	const out = new Uint8Array((clean.length * 3) >> 2);
	let bits = 0;
	let acc = 0;
	let n = 0;
	for (const ch of clean) {
		acc = (acc << 6) | B64_ALPHABET.indexOf(ch);
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			out[n++] = (acc >> bits) & 0xff;
		}
	}
	return out.subarray(0, n);
}

export const toB64Url = (b: Uint8Array): string =>
	toB64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const fromB64Url = (s: string): Uint8Array =>
	fromB64(s.replace(/-/g, '+').replace(/_/g, '/'));

export function toB32(bytes: Uint8Array): string {
	let out = '';
	let acc = 0;
	let bits = 0;
	for (const byte of bytes) {
		acc = (acc << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			out += B32_ALPHABET[(acc >> bits) & 31];
		}
	}
	if (bits > 0) out += B32_ALPHABET[(acc << (5 - bits)) & 31];
	return out;
}

export function fromB32(s: string): Uint8Array {
	const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
	const out = new Uint8Array(Math.floor((clean.length * 5) / 8));
	let acc = 0;
	let bits = 0;
	let n = 0;
	for (const ch of clean) {
		acc = (acc << 5) | B32_ALPHABET.indexOf(ch);
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			out[n++] = (acc >> bits) & 0xff;
		}
	}
	return out.subarray(0, n);
}

export const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
export const fromUtf8 = (b: Uint8Array): string => new TextDecoder().decode(b);

export function concat(...parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((n, p) => n + p.length, 0);
	const out = new Uint8Array(total);
	let off = 0;
	for (const p of parts) {
		out.set(p, off);
		off += p.length;
	}
	return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= (a[i] as number) ^ (b[i] as number);
	return diff === 0;
}

export function wipe(b: Uint8Array): void {
	b.fill(0);
}
