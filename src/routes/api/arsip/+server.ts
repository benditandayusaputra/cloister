import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db, keyArchives } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { requireAuth } from '$lib/server/auth.ts';
import { toB64 } from '$crypto/bytes.ts';

/**
 * Brankas arsip milik pengguna yang sedang masuk.
 *
 * Blob-nya tetap terenkripsi dan hanya bisa dibuka dengan 24 kata lama, jadi
 * mengembalikannya ke klien tidak memberi server maupun penyerang apa pun.
 */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);

		const rows = await db
			.select()
			.from(keyArchives)
			.where(and(eq(keyArchives.userId, ctx.userId), sql`${keyArchives.purgeAfter} > now()`))
			.orderBy(desc(keyArchives.createdAt));

		return json({
			arsip: rows.map((a) => ({
				id: a.id,
				keyVersion: a.keyVersion,
				jumlahEntri: a.jumlahEntri,
				createdAt: a.createdAt.toISOString(),
				purgeAfter: a.purgeAfter.toISOString(),
				recoveryWrappedMk: toB64(a.recoveryWrappedMk),
				recoveryNonce: toB64(a.recoveryMkNonce),
				recoverySalt: toB64(a.recoverySalt),
				kdf: {
					algo: a.kdfAlgo,
					memKib: a.kdfMemKib,
					time: a.kdfTime,
					parallel: a.kdfParallel
				}
			}))
		});
	});
