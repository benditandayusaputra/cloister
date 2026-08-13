import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users, sessions } from '$lib/db/server/index.ts';
import { handler, unauthorized } from '$lib/server/problem.ts';
import { parseBody, b64Exact } from '$lib/server/validate.ts';
import { verifyAuthKey } from '$lib/server/crypto.ts';
import { requireAuth, assertSameOrigin, audit, clearRefreshCookie } from '$lib/server/auth.ts';
import { mail } from '$lib/server/email.ts';

const schema = v.object({ authKey: b64Exact(32, 'authKey') });

/** Jadwalkan hapus akun; purge fisik dilakukan cron setelah 7 hari. */
export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, schema);

		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user || !verifyAuthKey(b.authKey, user.authHash)) throw unauthorized('Sandi salah');

		await db
			.update(users)
			.set({ deletedAt: new Date(), status: 'active' })
			.where(eq(users.id, user.id));
		await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, user.id));
		clearRefreshCookie(event.cookies);

		await audit(user.id, 'account_delete', ctx.ip);
		await mail.accountDeleted(user.email);

		return json({ scheduledAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
	});
