import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import {
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	type AuthenticationResponseJSON,
	type AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { db, webauthnCredentials, users } from '$lib/db/server/index.ts';
import { handler, bad, unauthorized } from '$lib/server/problem.ts';
import { parseBody, parseQuery, emailSchema } from '$lib/server/validate.ts';
import { assertSameOrigin, audit } from '$lib/server/auth.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';
import {
	simpanTantangan,
	ambilTantangan,
	rpDari,
	terbitkanTiket,
	TIKET_TTL_DETIK
} from '$lib/server/webauthn.ts';

const querySchema = v.object({ email: emailSchema });

/**
 * Langkah 1: opsi tantangan. Selalu mengembalikan tantangan meski email tidak
 * terdaftar atau tidak punya passkey, supaya tidak bisa dipakai enumerasi akun.
 */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('passkey', ip, LIMITS.login);

		const { email } = parseQuery(event.url, querySchema);
		const { rpID } = rpDari(event.url);

		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		const kredensial = user
			? await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.userId, user.id))
			: [];

		const opsi = await generateAuthenticationOptions({
			rpID,
			allowCredentials: kredensial.map((c) => ({
				id: c.id,
				transports: (c.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined
			})),
			userVerification: 'preferred'
		});

		simpanTantangan(`auth:${email}`, opsi.challenge);
		return json({ ...opsi, terdaftar: kredensial.length > 0 });
	});

const verifikasiSchema = v.object({
	email: emailSchema,
	respons: v.any()
});

/**
 * Langkah 2: verifikasi. Ini faktor kedua, bukan pengganti sandi — hasilnya
 * berupa tiket berumur pendek yang dipakai POST /api/auth/login.
 */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('passkey', ip, LIMITS.login);

		const b = await parseBody(event.request, verifikasiSchema);
		const challenge = ambilTantangan(`auth:${b.email}`);
		if (!challenge) throw bad('Tantangan kedaluwarsa, ulangi dari awal');

		const [user] = await db.select().from(users).where(eq(users.email, b.email)).limit(1);
		if (!user) throw unauthorized('Passkey tidak cocok');

		const respons = b.respons as AuthenticationResponseJSON;
		const [kredensial] = await db
			.select()
			.from(webauthnCredentials)
			.where(eq(webauthnCredentials.id, respons.id))
			.limit(1);
		if (!kredensial || kredensial.userId !== user.id) throw unauthorized('Passkey tidak cocok');

		const { rpID, origin } = rpDari(event.url);
		const hasil = await verifyAuthenticationResponse({
			response: respons,
			expectedChallenge: challenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			credential: {
				id: kredensial.id,
				publicKey: new Uint8Array(kredensial.publicKey) as Uint8Array<ArrayBuffer>,
				counter: kredensial.counter,
				transports: (kredensial.transports ?? undefined) as
					| AuthenticatorTransportFuture[]
					| undefined
			},
			requireUserVerification: false
		});

		if (!hasil.verified) throw unauthorized('Passkey tidak cocok');

		await db
			.update(webauthnCredentials)
			.set({ counter: hasil.authenticationInfo.newCounter, lastUsedAt: new Date() })
			.where(eq(webauthnCredentials.id, kredensial.id));

		const tiket = terbitkanTiket(user.id);
		await audit(user.id, 'passkey_verified', ip);

		return json({ tiket, berlakuDetik: TIKET_TTL_DETIK });
	});
