import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, shareLinks } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { parseBody, b64, b64Exact, sizeBucketSchema } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { QUOTA } from '$lib/server/env.ts';
import { fromB64 } from '$crypto/bytes.ts';

const schema = v.object({
	entryId: v.pipe(v.string(), v.uuid()),
	ciphertext: b64(QUOTA.maxCiphertextBytes, 'ciphertext'),
	nonce: b64Exact(24, 'nonce'),
	sizeBucket: sizeBucketSchema,
	label: v.optional(v.pipe(v.string(), v.maxLength(120)), ''),
	hariBerlaku: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(365)), 30)
});

/** Server menerima ciphertext saja; DEK tetap di fragment URL milik pengguna. */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, schema);

		const id = uuidv7();
		await db.insert(shareLinks).values({
			id,
			userId: ctx.userId,
			entryId: b.entryId,
			ciphertext: fromB64(b.ciphertext),
			nonce: fromB64(b.nonce),
			sizeBucket: b.sizeBucket,
			label: b.label || null,
			expiresAt: new Date(Date.now() + b.hariBerlaku * 86_400_000)
		});

		await audit(ctx.userId, 'share_created', ctx.ip, { id });
		return json({ id, path: `/s/${id}` }, { status: 201 });
	});

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const rows = await db
			.select({
				id: shareLinks.id,
				entryId: shareLinks.entryId,
				label: shareLinks.label,
				viewCount: shareLinks.viewCount,
				expiresAt: shareLinks.expiresAt,
				revokedAt: shareLinks.revokedAt,
				createdAt: shareLinks.createdAt
			})
			.from(shareLinks)
			.where(eq(shareLinks.userId, ctx.userId))
			.orderBy(desc(shareLinks.createdAt));
		return json({ links: rows });
	});
