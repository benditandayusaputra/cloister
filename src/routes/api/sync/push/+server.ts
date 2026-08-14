import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, count } from 'drizzle-orm';
import * as v from 'valibot';
import { db, entries, entryTags, users } from '$lib/db/server/index.ts';
import { handler, tooLarge } from '$lib/server/problem.ts';
import { parseBody, entryPushSchema, type EntryPush } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';
import { rateLimit, LIMITS } from '$lib/server/ratelimit.ts';
import { QUOTA } from '$lib/server/env.ts';
import { fromB64, toB64 } from '$crypto/bytes.ts';

const schema = v.object({
	entries: v.pipe(v.array(entryPushSchema), v.maxLength(QUOTA.pushBatch))
});

type PushResult =
	| { id: string; status: 'ok'; rev: number }
	| { id: string; status: 'conflict'; rev: number; server: Record<string, unknown> };

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		await rateLimit('push', ctx.userId, LIMITS.push);

		const body = await parseBody(event.request, schema);
		if (body.entries.length === 0) return json({ results: [], serverRev: 0 });

		const [{ n }] = (await db
			.select({ n: count() })
			.from(entries)
			.where(eq(entries.userId, ctx.userId))) as [{ n: number }];

		const results: PushResult[] = [];
		let serverRev = 0;

		await db.transaction(async (tx) => {
			const [user] = await tx
				.select({ syncRev: users.syncRev })
				.from(users)
				.where(eq(users.id, ctx.userId))
				.for('update')
				.limit(1);
			let rev = user?.syncRev ?? 0;
			let created = 0;

			for (const e of body.entries as EntryPush[]) {
				const [existing] = await tx
					.select()
					.from(entries)
					.where(and(eq(entries.id, e.id), eq(entries.userId, ctx.userId)))
					.limit(1);

				if (existing && existing.rev > e.baseRev) {
					results.push({
						id: e.id,
						status: 'conflict',
						rev: existing.rev,
						server: {
							id: existing.id,
							entryDate: existing.entryDate,
							ciphertext: toB64(existing.ciphertext),
							nonce: toB64(existing.nonce),
							wrappedDek: toB64(existing.wrappedDek),
							dekNonce: toB64(existing.dekNonce),
							sizeBucket: existing.sizeBucket,
							rev: existing.rev,
							clientUpdatedAt: existing.clientUpdatedAt.toISOString(),
							deletedAt: existing.deletedAt?.toISOString() ?? null
						}
					});
					continue;
				}

				if (!existing) {
					created++;
					if (n + created > QUOTA.maxEntries) throw tooLarge('Kuota entri akun tercapai');
				}

				rev += 1;
				const row = {
					id: e.id,
					userId: ctx.userId,
					entryDate: e.entryDate,
					ciphertext: fromB64(e.ciphertext),
					nonce: fromB64(e.nonce),
					wrappedDek: fromB64(e.wrappedDek),
					dekNonce: fromB64(e.dekNonce),
					sizeBucket: e.sizeBucket,
					rev,
					clientUpdatedAt: new Date(e.clientUpdatedAt),
					deletedAt: e.deleted ? new Date() : null,
					updatedAt: new Date()
				};

				if (existing) {
					await tx.update(entries).set(row).where(eq(entries.id, e.id));
				} else {
					await tx.insert(entries).values(row);
				}

				await tx.delete(entryTags).where(eq(entryTags.entryId, e.id));
				if (e.tagTokens.length && !e.deleted) {
					await tx
						.insert(entryTags)
						.values(e.tagTokens.map((tagToken) => ({ entryId: e.id, tagToken })))
						.onConflictDoNothing();
				}

				results.push({ id: e.id, status: 'ok', rev });
			}

			await tx.update(users).set({ syncRev: rev, updatedAt: new Date() }).where(eq(users.id, ctx.userId));
			serverRev = rev;
		});

		const conflicts = results.filter((r) => r.status === 'conflict').length;
		return json({ results, serverRev }, { status: conflicts > 0 ? 409 : 200 });
	});
