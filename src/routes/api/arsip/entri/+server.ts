import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, gt, asc, isNotNull } from 'drizzle-orm';
import * as v from 'valibot';
import { db, entries, users, entryTags } from '$lib/db/server/index.ts';
import { handler, unauthorized } from '$lib/server/problem.ts';
import { parseQuery, parseBody, entryPushSchema, type EntryPush } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { QUOTA } from '$lib/server/env.ts';
import { toB64, fromB64 } from '$crypto/bytes.ts';

const querySchema = v.object({
	since: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(0)), '0'),
	limit: v.optional(
		v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(QUOTA.pullLimit)),
		'100'
	)
});

/** Ciphertext entri terarsip. Server tidak bisa membukanya, klien yang punya kunci lama bisa. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const q = parseQuery(event.url, querySchema);

		const rows = await db
			.select()
			.from(entries)
			.where(
				and(eq(entries.userId, ctx.userId), isNotNull(entries.archivedAt), gt(entries.rev, q.since))
			)
			.orderBy(asc(entries.rev))
			.limit(q.limit);

		return json({
			entries: rows.map((r) => ({
				id: r.id,
				entryDate: r.entryDate,
				ciphertext: toB64(r.ciphertext),
				nonce: toB64(r.nonce),
				wrappedDek: toB64(r.wrappedDek),
				dekNonce: toB64(r.dekNonce),
				sizeBucket: r.sizeBucket,
				rev: r.rev,
				clientUpdatedAt: r.clientUpdatedAt.toISOString()
			})),
			hasMore: rows.length === q.limit
		});
	});

const pulihSchema = v.object({
	entries: v.pipe(v.array(entryPushSchema), v.maxLength(QUOTA.pushBatch))
});

/**
 * Terima entri arsip yang sudah dibungkus ulang dengan kunci aktif, lalu
 * kembalikan ke arsip utama supaya ikut tersinkronisasi lagi.
 */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, pulihSchema);
		if (b.entries.length === 0) return json({ dipulihkan: 0 });

		const [user] = await db
			.select({ keyVersion: users.keyVersion })
			.from(users)
			.where(eq(users.id, ctx.userId))
			.limit(1);
		if (!user) throw unauthorized('Akun tidak ada');

		let dipulihkan = 0;

		await db.transaction(async (tx) => {
			const [u] = await tx
				.select({ syncRev: users.syncRev })
				.from(users)
				.where(eq(users.id, ctx.userId))
				.for('update')
				.limit(1);
			let rev = u?.syncRev ?? 0;

			for (const e of b.entries as EntryPush[]) {
				const [ada] = await tx
					.select({ id: entries.id })
					.from(entries)
					.where(
						and(
							eq(entries.id, e.id),
							eq(entries.userId, ctx.userId),
							isNotNull(entries.archivedAt)
						)
					)
					.limit(1);
				if (!ada) continue;

				rev += 1;
				await tx
					.update(entries)
					.set({
						ciphertext: fromB64(e.ciphertext),
						nonce: fromB64(e.nonce),
						wrappedDek: fromB64(e.wrappedDek),
						dekNonce: fromB64(e.dekNonce),
						sizeBucket: e.sizeBucket,
						keyVersion: user.keyVersion,
						archivedAt: null,
						rev,
						updatedAt: new Date()
					})
					.where(eq(entries.id, e.id));

				await tx.delete(entryTags).where(eq(entryTags.entryId, e.id));
				if (e.tagTokens.length) {
					await tx
						.insert(entryTags)
						.values(e.tagTokens.map((tagToken) => ({ entryId: e.id, tagToken })))
						.onConflictDoNothing();
				}
				dipulihkan++;
			}

			await tx.update(users).set({ syncRev: rev }).where(eq(users.id, ctx.userId));
		});

		await audit(ctx.userId, 'archive_restored', ctx.ip, { dipulihkan });
		return json({ dipulihkan });
	});
