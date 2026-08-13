import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db, entries, entryTags, users } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';

/** Tombstone; baris fisik dibuang cron setelah 30 hari. */
export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = event.params.id as string;

		return db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(entries)
				.where(and(eq(entries.id, id), eq(entries.userId, ctx.userId)))
				.limit(1);
			if (!existing) throw notFound('Entri tidak ada');

			const [user] = await tx
				.select({ syncRev: users.syncRev })
				.from(users)
				.where(eq(users.id, ctx.userId))
				.for('update')
				.limit(1);
			const rev = (user?.syncRev ?? 0) + 1;

			await tx
				.update(entries)
				.set({ deletedAt: new Date(), rev, updatedAt: new Date() })
				.where(eq(entries.id, id));
			await tx.delete(entryTags).where(eq(entryTags.entryId, id));
			await tx.update(users).set({ syncRev: rev }).where(eq(users.id, ctx.userId));

			return json({ id, rev });
		});
	});
