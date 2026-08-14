import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, transferSessions } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { parseBody, b64Exact } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { fromB64 } from '$crypto/bytes.ts';

const TRANSFER_TTL_SEC = 180;

const schema = v.object({
	blob: b64Exact(48, 'blob'),
	nonce: b64Exact(24, 'nonce')
});

/** Perangkat lama menaruh MK terbungkus; hidup 180 detik, 5 percobaan. */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, schema);

		await db.delete(transferSessions).where(lt(transferSessions.expiresAt, new Date()));
		await db
			.delete(transferSessions)
			.where(and(eq(transferSessions.userId, ctx.userId), isNull(transferSessions.consumedAt)));

		const id = uuidv7();
		const expiresAt = new Date(Date.now() + TRANSFER_TTL_SEC * 1000);
		await db.insert(transferSessions).values({
			id,
			userId: ctx.userId,
			blob: fromB64(b.blob),
			nonce: fromB64(b.nonce),
			expiresAt
		});
		await audit(ctx.userId, 'transfer_created', ctx.ip, {}, ctx.deviceId);

		return json({ sessionId: id, expiresAt: expiresAt.toISOString(), ttlSec: TRANSFER_TTL_SEC });
	});
