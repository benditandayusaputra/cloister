import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import * as v from 'valibot';
import { CFG } from './env.ts';
import { hmac, randomToken } from './crypto.ts';
import { bad } from './problem.ts';
import { buatKode, gambarKode, PANJANG_KODE } from './captcha-gambar.ts';

export const CAPTCHA_TTL_DETIK = 10 * 60;
export { PANJANG_KODE };
const NONAKTIF = env.CAPTCHA_DISABLED === '1' && !import.meta.env.PROD;

export interface Tantangan {
	token: string;
	gambar: string;
	exp: number;
	panjang: number;
}

export const jawabanSchema = v.object({
	token: v.pipe(v.string(), v.minLength(24), v.maxLength(160), v.regex(/^[A-Za-z0-9_-]+\.\d+\.[a-f0-9]+$/)),
	teks: v.pipe(v.string(), v.minLength(1), v.maxLength(24))
});
export type JawabanCaptcha = v.InferOutput<typeof jawabanSchema>;

function tandaTangan(kode: string, nonce: string, exp: number): string {
	return hmac(CFG.jwtSecret, `captcha|${kode}|${nonce}|${exp}`).toString('hex').slice(0, 32);
}

function normalkan(teks: string): string {
	return teks.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buatTantangan(): Tantangan {
	return buatTantanganUntuk(buatKode());
}

export function buatTantanganUntuk(kode: string): Tantangan {
	const nonce = randomToken(12);
	const exp = Math.floor(Date.now() / 1000) + CAPTCHA_TTL_DETIK;
	return {
		token: `${nonce}.${exp}.${tandaTangan(kode, nonce, exp)}`,
		gambar: gambarKode(kode),
		exp,
		panjang: PANJANG_KODE
	};
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
	if (!cek.success) throw bad('Kode gambar belum diisi.');

	const bagian = cek.output.token.split('.');
	const nonce = bagian[0]!;
	const exp = Number(bagian[1]);
	const sig = bagian[2]!;
	const kini = Math.floor(Date.now() / 1000);
	if (!Number.isFinite(exp) || exp < kini) throw bad('Kode gambar kedaluwarsa. Ambil kode baru.');

	bersihkanTerpakai();
	if (terpakai.has(nonce)) throw bad('Kode gambar sudah dipakai. Ambil kode baru.');
	terpakai.set(nonce, exp);

	const harap = Buffer.from(tandaTangan(normalkan(cek.output.teks), nonce, exp), 'hex');
	const kirim = Buffer.from(sig, 'hex');
	if (harap.length !== kirim.length || !timingSafeEqual(harap, kirim)) {
		throw bad('Kode gambar salah. Coba kode baru.');
	}
}
