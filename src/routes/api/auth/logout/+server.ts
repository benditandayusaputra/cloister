import { eq } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';
import { db, sessions } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { clearRefreshCookie, REFRESH_COOKIE, assertSameOrigin } from '$lib/server/auth.ts';
import { sha256 } from '$lib/server/crypto.ts';

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const token = event.cookies.get(REFRESH_COOKIE);
		if (token) {
			await db
				.update(sessions)
				.set({ revokedAt: new Date() })
				.where(eq(sessions.refreshTokenHash, sha256(token)));
		}
		clearRefreshCookie(event.cookies);
		return new Response(null, { status: 204 });
	});
