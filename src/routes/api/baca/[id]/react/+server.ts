import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, sql, and } from 'drizzle-orm';
import * as v from 'valibot';
import { db, publicEntries, reactions } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { actorHash } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';

const KINDS = ['heart', 'hug', 'relate'] as const;
const schema = v.object({ kind: v.picklist(KINDS) });

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('react', ip, LIMITS.react);

		const id = event.params.id as string;
		const { kind } = await parseBody(event.request, schema);
		const actor = actorHash(ip, event.request.headers.get('user-agent') ?? '');

		const [entry] = await db
			.select({ id: publicEntries.id })
			.from(publicEntries)
			.where(eq(publicEntries.id, id))
			.limit(1);
		if (!entry) throw notFound('Catatan publik tidak ada');

		const [existing] = await db
			.select()
			.from(reactions)
			.where(
				and(eq(reactions.publicEntryId, id), eq(reactions.actorHash, actor), eq(reactions.kind, kind))
			)
			.limit(1);

		if (existing) {
			await db
				.delete(reactions)
				.where(
					and(eq(reactions.publicEntryId, id), eq(reactions.actorHash, actor), eq(reactions.kind, kind))
				);
			await db
				.update(publicEntries)
				.set({ reactionCount: sql`greatest(${publicEntries.reactionCount} - 1, 0)` })
				.where(eq(publicEntries.id, id));
		} else {
			await db.insert(reactions).values({ publicEntryId: id, actorHash: actor, kind });
			await db
				.update(publicEntries)
				.set({ reactionCount: sql`${publicEntries.reactionCount} + 1` })
				.where(eq(publicEntries.id, id));
		}

		const counts = await db
			.select({ kind: reactions.kind, n: sql<number>`count(*)::int` })
			.from(reactions)
			.where(eq(reactions.publicEntryId, id))
			.groupBy(reactions.kind);

		return json({ toggled: existing ? 'off' : 'on', counts });
	});

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const id = event.params.id as string;
		const counts = await db
			.select({ kind: reactions.kind, n: sql<number>`count(*)::int` })
			.from(reactions)
			.where(eq(reactions.publicEntryId, id))
			.groupBy(reactions.kind);
		return json({ counts });
	});
