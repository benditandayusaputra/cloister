import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db, entries } from '$lib/db/server/index.ts';
import { handler, bad, notFound } from '$lib/server/problem.ts';
import { requireAuth } from '$lib/server/auth.ts';
import { rateLimit, LIMITS } from '$lib/server/ratelimit.ts';
import { bentukBarisBukti } from '$lib/server/bukti.ts';

const idSchema = v.pipe(v.string(), v.uuid());

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		await rateLimit('bukti', ctx.userId, LIMITS.bukti);

		const entryId = event.url.searchParams.get('entryId') ?? '';
		const cek = v.safeParse(idSchema, entryId);
		if (!cek.success) throw bad('entryId wajib berupa UUID');

		const [row] = await db
			.select()
			.from(entries)
			.where(and(eq(entries.id, cek.output), eq(entries.userId, ctx.userId)))
			.limit(1);

		if (!row) throw notFound('Catatan itu belum pernah sampai ke server');

		return json(await bentukBarisBukti(row));
	});
