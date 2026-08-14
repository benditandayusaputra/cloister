import type { RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { parseBody, b64Exact } from '$lib/server/validate.ts';
import { hashAuthKey } from '$lib/server/crypto.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { fromB64 } from '$crypto/bytes.ts';

const schema = v.object({
	recoveryWrappedMk: b64Exact(48, 'recoveryWrappedMk'),
	recoveryNonce: b64Exact(24, 'recoveryNonce'),
	recoverySalt: b64Exact(16, 'recoverySalt'),
	recoveryAuthKey: b64Exact(32, 'recoveryAuthKey')
});

/** Ganti frasa pemulihan. Frasa lama langsung berhenti berlaku. */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, schema);

		await db
			.update(users)
			.set({
				recoveryWrappedMk: fromB64(b.recoveryWrappedMk),
				recoveryMkNonce: fromB64(b.recoveryNonce),
				recoverySalt: fromB64(b.recoverySalt),
				recoveryAuthHash: hashAuthKey(b.recoveryAuthKey),
				recoveryUsedAt: null,
				updatedAt: new Date()
			})
			.where(eq(users.id, ctx.userId));

		await audit(ctx.userId, 'recovery_phrase_rotated', ctx.ip);
		return new Response(null, { status: 204 });
	});
