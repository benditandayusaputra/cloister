import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import * as v from 'valibot';
import { CFG } from './env.ts';
import { hmac, randomToken } from './crypto.ts';
import { bad } from './problem.ts';

export const CAPTCHA_BITS = Math.min(24, Math.max(8, Number(env.CAPTCHA_BITS ?? 15)));
export const CAPTCHA_TTL_DETIK = 10 * 60;
const NONAKTIF = env.CAPTCHA_DISABLED === '1' && !import.meta.env.PROD;

export interface Tantangan {
	salt: string;
	bits: number;
	exp: number;
	sig: string;
}

export const jawabanSchema = v.object({
	salt: v.pipe(v.string(), v.minLength(16), v.maxLength(64), v.regex(/^[A-Za-z0-9_-]+$/)),
	bits: v.pipe(v.number(), v.integer(), v.minValue(8), v.maxValue(24)),
	exp: v.pipe(v.number(), v.integer()),
	sig: v.pipe(v.string(), v.length(64), v.regex(/^[a-f0-9]+$/)),
	nonce: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(2 ** 40))
});
export type JawabanCaptcha = v.InferOutput<typeof jawabanSchema>;

function tandaTangan(salt: string, bits: number, exp: number): string {
	return hmac(CFG.jwtSecret, `captcha|${salt}|${bits}|${exp}`).toString('hex');
}

export function buatTantangan(): Tantangan {
	const salt = randomToken(18);
	const exp = Math.floor(Date.now() / 1000) + CAPTCHA_TTL_DETIK;
	return { salt, bits: CAPTCHA_BITS, exp, sig: tandaTangan(salt, CAPTCHA_BITS, exp) };
}

export function nolDiDepan(digest: Uint8Array): number {
	let n = 0;
	for (const b of digest) {
		if (b === 0) {
			n += 8;
			continue;
		}
		n += Math.clz32(b) - 24;
		break;
	}
	return n;
}

const terpakai = new Map<string, number>();

function bersihkanTerpakai() {
	const kini = Math.floor(Date.now() / 1000);
	for (const [k, exp] of terpakai) if (exp < kini) terpakai.delete(k);
}

export function verifikasiCaptcha(jawaban: unknown, honeypot: unknown): void {
	if (typeof honeypot === 'string' && honeypot.trim().length > 0) throw bad('Permintaan tidak valid');
	if (NONAKTIF) return;
	const cek = v.safeParse(jawabanSchema, jawaban);
	if (!cek.success) throw bad('Verifikasi bukan-robot belum selesai. Coba lagi.');
	const j = cek.output;
	const kini = Math.floor(Date.now() / 1000);
	if (j.exp < kini) throw bad('Verifikasi bukan-robot kedaluwarsa. Muat ulang halaman.');
	if (j.bits < CAPTCHA_BITS) throw bad('Verifikasi bukan-robot tidak valid.');
	const sigBenar = Buffer.from(tandaTangan(j.salt, j.bits, j.exp), 'hex');
	const sigKirim = Buffer.from(j.sig, 'hex');
	if (sigBenar.length !== sigKirim.length || !timingSafeEqual(sigBenar, sigKirim)) {
		throw bad('Verifikasi bukan-robot tidak valid.');
	}
	const digest = createHash('sha256').update(`${j.salt}:${j.nonce}`).digest();
	if (nolDiDepan(digest) < j.bits) throw bad('Verifikasi bukan-robot tidak valid.');
	bersihkanTerpakai();
	if (terpakai.has(j.salt)) throw bad('Verifikasi bukan-robot sudah dipakai. Muat ulang halaman.');
	terpakai.set(j.salt, j.exp);
}
