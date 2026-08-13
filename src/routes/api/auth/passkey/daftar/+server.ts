import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	type RegistrationResponseJSON,
	type AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { db, webauthnCredentials, users } from '$lib/db/server/index.ts';
import { handler, bad } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import {
	simpanTantangan,
	ambilTantangan,
	rpDari,
	RP_NAME,
	kredensialPengguna
} from '$lib/server/webauthn.ts';

/** Langkah 1: minta opsi pendaftaran passkey. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const { rpID } = rpDari(event.url);

		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user) throw bad('Akun tidak ada');

		const sudahAda = await kredensialPengguna(ctx.userId);

		const opsi = await generateRegistrationOptions({
			rpName: RP_NAME,
			rpID,
			userName: user.email,
			userDisplayName: user.email,
			attestationType: 'none',
			excludeCredentials: sudahAda.map((c) => ({
				id: c.id,
				transports: (c.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined
			})),
			authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }
		});

		simpanTantangan(`reg:${ctx.userId}`, opsi.challenge);
		return json(opsi);
	});

const konfirmasiSchema = v.object({
	respons: v.any(),
	nickname: v.optional(v.pipe(v.string(), v.maxLength(60)), '')
});

/** Langkah 2: verifikasi respons authenticator lalu simpan kredensialnya. */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, konfirmasiSchema);

		const challenge = ambilTantangan(`reg:${ctx.userId}`);
		if (!challenge) throw bad('Tantangan kedaluwarsa, ulangi dari awal');

		const { rpID, origin } = rpDari(event.url);
		const hasil = await verifyRegistrationResponse({
			response: b.respons as RegistrationResponseJSON,
			expectedChallenge: challenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			requireUserVerification: false
		});

		if (!hasil.verified || !hasil.registrationInfo) throw bad('Passkey tidak bisa diverifikasi');

		const { credential } = hasil.registrationInfo;
		await db.insert(webauthnCredentials).values({
			id: credential.id,
			userId: ctx.userId,
			publicKey: credential.publicKey,
			counter: credential.counter,
			transports: credential.transports ?? null,
			nickname: b.nickname || 'Passkey'
		});

		await audit(ctx.userId, 'passkey_added', ctx.ip, { id: credential.id });
		return json({ id: credential.id }, { status: 201 });
	});

/** Daftar passkey milik pengguna. */
export const PUT: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const rows = await kredensialPengguna(ctx.userId);
		return json({
			passkeys: rows.map((c) => ({
				id: c.id,
				nickname: c.nickname,
				createdAt: c.createdAt.toISOString(),
				lastUsedAt: c.lastUsedAt?.toISOString() ?? null
			}))
		});
	});

export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = event.url.searchParams.get('id');
		if (!id) throw bad('id passkey wajib');

		const rows = await kredensialPengguna(ctx.userId);
		if (!rows.some((c) => c.id === id)) throw bad('Passkey tidak ditemukan');

		await db.delete(webauthnCredentials).where(eq(webauthnCredentials.id, id));
		await audit(ctx.userId, 'passkey_removed', ctx.ip, { id });
		return new Response(null, { status: 204 });
	});
