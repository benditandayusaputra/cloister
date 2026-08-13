import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import * as v from 'valibot';
import { db, reports, publicEntries } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireRole, assertSameOrigin, audit } from '$lib/server/auth.ts';

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		await requireRole(event, ['moderator', 'admin']);
		const state = event.url.searchParams.get('state') ?? 'open';

		const rows = await db
			.select({
				id: reports.id,
				reason: reports.reason,
				note: reports.note,
				state: reports.state,
				createdAt: reports.createdAt,
				entryId: publicEntries.id,
				title: publicEntries.title,
				penName: publicEntries.penName,
				isAnonymous: publicEntries.isAnonymous,
				reportCount: publicEntries.reportCount,
				moderationState: publicEntries.moderationState
			})
			.from(reports)
			.innerJoin(publicEntries, eq(reports.publicEntryId, publicEntries.id))
			.where(state === 'semua' ? undefined : eq(reports.state, state))
			.orderBy(desc(reports.createdAt))
			.limit(100);

		return json({ reports: rows });
	});

const actionSchema = v.object({
	reportId: v.pipe(v.string(), v.uuid()),
	action: v.picklist(['biarkan', 'tarik'])
});

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireRole(event, ['moderator', 'admin']);
		const b = await parseBody(event.request, actionSchema);

		const [r] = await db.select().from(reports).where(eq(reports.id, b.reportId)).limit(1);
		if (!r) throw notFound('Laporan tidak ada');

		await db
			.update(reports)
			.set({
				state: b.action === 'tarik' ? 'valid' : 'invalid',
				handledBy: ctx.userId,
				handledAt: new Date()
			})
			.where(eq(reports.id, b.reportId));

		await db
			.update(publicEntries)
			.set({ moderationState: b.action === 'tarik' ? 'removed' : 'ok' })
			.where(eq(publicEntries.id, r.publicEntryId));

		await audit(ctx.userId, `moderate_${b.action}`, ctx.ip, { reportId: b.reportId });
		return json({ ok: true });
	});
