import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import { db, shareLinks } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { toB64 } from '$crypto/bytes.ts';

/** Tanpa auth: siapa pun dengan tautan bisa mengambil ciphertext, bukan isinya. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const id = event.params.id as string;
		const [row] = await db.select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);

		if (!row || row.revokedAt) throw notFound('Tautan tidak berlaku');
		if (row.expiresAt && row.expiresAt.getTime() < Date.now()) throw notFound('Tautan kedaluwarsa');

		void db
			.update(shareLinks)
			.set({ viewCount: sql`${shareLinks.viewCount} + 1` })
			.where(eq(shareLinks.id, id))
			.catch(() => {});

		return json(
			{
				ciphertext: toB64(row.ciphertext),
				nonce: toB64(row.nonce),
				sizeBucket: row.sizeBucket,
				entryId: row.entryId,
				label: row.label
			},
			{ headers: { 'x-robots-tag': 'noindex, nofollow' } }
		);
	});

export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = event.params.id as string;

		const [row] = await db
			.select({ id: shareLinks.id })
			.from(shareLinks)
			.where(and(eq(shareLinks.id, id), eq(shareLinks.userId, ctx.userId)))
			.limit(1);
		if (!row) throw notFound('Tautan tidak ada');

		await db.delete(shareLinks).where(eq(shareLinks.id, id));
		await audit(ctx.userId, 'share_revoked', ctx.ip, { id });
		return new Response(null, { status: 204 });
	});
