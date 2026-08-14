import { env } from '$env/dynamic/private';
import { db, webauthnCredentials } from '$lib/db/server/index.ts';
import { eq } from 'drizzle-orm';

/**
 * Tantangan WebAuthn bertenggat. Disimpan di memori proses; kalau nanti
 * dijalankan multi-instans, pindahkan ke Redis dengan TTL yang sama.
 */
const CHALLENGE_TTL_MS = 120_000;
const tantangan = new Map<string, { value: string; expiresAt: number }>();

export function simpanTantangan(kunci: string, value: string) {
	tantangan.set(kunci, { value, expiresAt: Date.now() + CHALLENGE_TTL_MS });
	if (tantangan.size > 5000) {
		for (const [k, v] of tantangan) if (v.expiresAt < Date.now()) tantangan.delete(k);
	}
}

export function ambilTantangan(kunci: string): string | null {
	const t = tantangan.get(kunci);
	tantangan.delete(kunci);
	if (!t || t.expiresAt < Date.now()) return null;
	return t.value;
}

export function rpDari(url: URL): { rpID: string; origin: string } {
	const rpID = env.WEBAUTHN_RP_ID?.trim() || url.hostname;
	const origin = env.WEBAUTHN_ORIGIN?.trim() || url.origin;
	return { rpID, origin };
}

export const RP_NAME = 'Cloister';

export async function kredensialPengguna(userId: string) {
	return db.select().from(webauthnCredentials).where(eq(webauthnCredentials.userId, userId));
}

// ---------------------------------------------------------- tiket faktor kedua

const TIKET_TTL_MS = 180_000;
const tiketAktif = new Map<string, { userId: string; expiresAt: number }>();

export const TIKET_TTL_DETIK = TIKET_TTL_MS / 1000;

/** Bukti bahwa passkey sudah diverifikasi, berumur pendek dan sekali pakai. */
export function terbitkanTiket(userId: string): string {
	const t = crypto.randomUUID();
	tiketAktif.set(t, { userId, expiresAt: Date.now() + TIKET_TTL_MS });
	if (tiketAktif.size > 5000) {
		for (const [k, val] of tiketAktif) if (val.expiresAt < Date.now()) tiketAktif.delete(k);
	}
	return t;
}

export function pakaiTiket(tiket: string, userId: string): boolean {
	const t = tiketAktif.get(tiket);
	if (!t) return false;
	tiketAktif.delete(tiket);
	return t.userId === userId && t.expiresAt > Date.now();
}
