import type { RequestHandler } from '@sveltejs/kit';
import { eq, and, ne } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users, sessions } from '$lib/db/server/index.ts';
import { handler, unauthorized } from '$lib/server/problem.ts';
import { parseBody, kdfSchema, b64Exact } from '$lib/server/validate.ts';
import { hashAuthKey, verifyAuthKey, sha256 } from '$lib/server/crypto.ts';
import { requireAuth, assertSameOrigin, audit, REFRESH_COOKIE } from '$lib/server/auth.ts';
import { mail } from '$lib/server/email.ts';
import { fromB64 } from '$crypto/bytes.ts';

const schema = v.object({
	authKeyOld: b64Exact(32, 'authKeyOld'),
	authKeyNew: b64Exact(32, 'authKeyNew'),
	saltUserNew: b64Exact(16, 'saltUserNew'),
	kdfNew: kdfSchema,
	wrappedMk: b64Exact(48, 'wrappedMk'),
	mkNonce: b64Exact(24, 'mkNonce')
});

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, schema);

		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user || !verifyAuthKey(b.authKeyOld, user.authHash)) throw unauthorized('Sandi lama salah');

		await db
			.update(users)
			.set({
				authHash: hashAuthKey(b.authKeyNew),
				saltUser: fromB64(b.saltUserNew),
				kdfAlgo: b.kdfNew.algo,
				kdfMemKib: b.kdfNew.memKib,
				kdfTime: b.kdfNew.time,
				kdfParallel: b.kdfNew.parallel,
				wrappedMasterKey: user.hardenedMode ? null : fromB64(b.wrappedMk),
				wrappedMkNonce: user.hardenedMode ? null : fromB64(b.mkNonce),
				updatedAt: new Date()
			})
			.where(eq(users.id, user.id));

		// Cabut semua sesi kecuali yang sedang dipakai.
		const current = event.cookies.get(REFRESH_COOKIE);
		await db
			.update(sessions)
			.set({ revokedAt: new Date() })
			.where(
				current
					? and(eq(sessions.userId, user.id), ne(sessions.refreshTokenHash, sha256(current)))
					: eq(sessions.userId, user.id)
			);

		await audit(user.id, 'password_change', ctx.ip);
		await mail.passwordChanged(user.email);
		return new Response(null, { status: 204 });
	});
