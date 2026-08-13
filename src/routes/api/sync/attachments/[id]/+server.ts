import type { RequestHandler } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';
import { db, attachments } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';
import { blob } from '$lib/server/blob.ts';
import { toB64 } from '$crypto/bytes.ts';

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const [row] = await db
			.select()
			.from(attachments)
			.where(
				and(
					eq(attachments.id, event.params.id as string),
					eq(attachments.userId, ctx.userId),
					isNull(attachments.deletedAt)
				)
			)
			.limit(1);
		if (!row) throw notFound('Lampiran tidak ada');

		const bytes = await blob.get(row.blobKey);
		return new Response(bytes as unknown as BodyInit, {
			headers: {
				'content-type': 'application/octet-stream',
				'x-papan-nonce': toB64(row.nonce),
				'x-papan-wrapped-key': toB64(row.wrappedFileKey),
				'x-papan-key-nonce': toB64(row.fileKeyNonce),
				'cache-control': 'private, max-age=604800'
			}
		});
	});

export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const [row] = await db
			.select()
			.from(attachments)
			.where(and(eq(attachments.id, event.params.id as string), eq(attachments.userId, ctx.userId)))
			.limit(1);
		if (!row) throw notFound('Lampiran tidak ada');

		await blob.del(row.blobKey);
		await db.update(attachments).set({ deletedAt: new Date() }).where(eq(attachments.id, row.id));
		return new Response(null, { status: 204 });
	});
