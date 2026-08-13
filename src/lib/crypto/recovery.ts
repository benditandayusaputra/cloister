import { WORDLIST } from './wordlist.ts';
import { sodium } from './sodium.ts';
import { randomBytes } from './kdf.ts';

const INDEX = new Map(WORDLIST.map((w, i) => [w, i]));

async function sha256(b: Uint8Array): Promise<Uint8Array> {
	const s = await sodium();
	return s.crypto_hash_sha256(b);
}

/** 256 bit entropi -> 24 kata BIP-39. */
export async function entropyToMnemonic(entropy: Uint8Array): Promise<string[]> {
	if (entropy.length !== 32) throw new Error('entropi harus 32 byte');
	const checksum = (await sha256(entropy))[0] as number;
	const bits: number[] = [];
	for (const byte of entropy) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
	for (let i = 7; i >= 0; i--) bits.push((checksum >> i) & 1);
	const words: string[] = [];
	for (let i = 0; i < bits.length; i += 11) {
		let n = 0;
		for (let j = 0; j < 11; j++) n = (n << 1) | (bits[i + j] as number);
		words.push(WORDLIST[n] as string);
	}
	return words;
}

export async function mnemonicToEntropy(words: string[]): Promise<Uint8Array> {
	if (words.length !== 24) throw new Error('butuh tepat 24 kata');
	const bits: number[] = [];
	for (const raw of words) {
		const idx = INDEX.get(raw.trim().toLowerCase());
		if (idx === undefined) throw new Error(`kata tidak dikenal: ${raw}`);
		for (let i = 10; i >= 0; i--) bits.push((idx >> i) & 1);
	}
	const entropy = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		let byte = 0;
		for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i * 8 + j] as number);
		entropy[i] = byte;
	}
	const expected = (await sha256(entropy))[0] as number;
	let got = 0;
	for (let i = 0; i < 8; i++) got = (got << 1) | (bits[256 + i] as number);
	if (got !== expected) throw new Error('checksum 24 kata tidak cocok');
	return entropy;
}

export async function generateMnemonic(): Promise<string[]> {
	return entropyToMnemonic(await randomBytes(32));
}

export function isWord(w: string): boolean {
	return INDEX.has(w.trim().toLowerCase());
}

/** Saran kata untuk autocomplete saat pemulihan. */
export function suggest(prefix: string, limit = 5): string[] {
	const p = prefix.trim().toLowerCase();
	if (p.length < 2) return [];
	const out: string[] = [];
	for (const w of WORDLIST) {
		if (w.startsWith(p)) out.push(w);
		if (out.length >= limit) break;
	}
	return out;
}

export const phraseToString = (words: string[]): string => words.join(' ');

export function parsePhrase(text: string): string[] {
	return text
		.trim()
		.toLowerCase()
		.split(/[\s,\n\r\t]+/)
		.filter(Boolean);
}
