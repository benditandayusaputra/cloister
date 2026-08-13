import { type RequestHandler, json } from '@sveltejs/kit';
import { eq, and, isNull, desc } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users, emailTokens } from '$lib/db/server/index.ts';
import { handler, bad } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { sha256, randomToken, sixDigitCode } from '$lib/server/crypto.ts';
import { mail } from '$lib/server/email.ts';

const schema = v.object({ code: v.pipe(v.string(), v.regex(/^\d{6}$/, 'Kode harus 6 angka')) });

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const { code } = await parseBody(event.request, schema);

		const [token] = await db
			.select()
			.from(emailTokens)
			.where(and(eq(emailTokens.userId, ctx.userId), eq(emailTokens.purpose, 'verify'), isNull(emailTokens.usedAt)))
			.orderBy(desc(emailTokens.expiresAt))
			.limit(1);

		if (!token || token.expiresAt.getTime() < Date.now()) throw bad('Kode kedaluwarsa, minta kode baru');
		if (token.code !== code) throw bad('Kode tidak cocok');

		await db.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.tokenHash, token.tokenHash));
		await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, ctx.userId));
		await audit(ctx.userId, 'email_verified', ctx.ip);

		return new Response(null, { status: 204 });
	});

/** Kirim ulang kode verifikasi. */
export const PUT: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user) throw bad('Akun tidak ada');
		if (user.emailVerifiedAt) return json({ alreadyVerified: true });

		const code = sixDigitCode();
		await db.insert(emailTokens).values({
			tokenHash: sha256(randomToken(16)),
			userId: ctx.userId,
			purpose: 'verify',
			code,
			expiresAt: new Date(Date.now() + 600_000)
		});
		await mail.verify(user.email, code);
		return json({ sent: true });
	});
