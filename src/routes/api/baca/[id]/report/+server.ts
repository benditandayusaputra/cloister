import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, publicEntries, reports } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { actorHash } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';

const REASONS = ['spam', 'harassment', 'selfharm', 'illegal', 'other'] as const;
const AUTO_HIDE_THRESHOLD = 3;

const schema = v.object({
	reason: v.picklist(REASONS),
	note: v.optional(v.pipe(v.string(), v.maxLength(500)), '')
});

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('report', ip, LIMITS.report);

		const id = event.params.id as string;
		const b = await parseBody(event.request, schema);

		const [entry] = await db.select().from(publicEntries).where(eq(publicEntries.id, id)).limit(1);
		if (!entry) throw notFound('Catatan publik tidak ada');

		await db.insert(reports).values({
			id: uuidv7(),
			publicEntryId: id,
			reporterHash: actorHash(ip, event.request.headers.get('user-agent') ?? ''),
			reason: b.reason,
			note: b.note || null
		});

		const nextCount = entry.reportCount + 1;
		await db
			.update(publicEntries)
			.set({
				reportCount: sql`${publicEntries.reportCount} + 1`,
				moderationState:
					nextCount >= AUTO_HIDE_THRESHOLD && entry.moderationState === 'ok'
						? 'hidden'
						: entry.moderationState
			})
			.where(eq(publicEntries.id, id));

		return json({ received: true }, { status: 201 });
	});
