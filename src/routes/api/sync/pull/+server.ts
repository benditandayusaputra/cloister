import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, gt, gte, asc, inArray, or, isNotNull, isNull } from 'drizzle-orm';
import * as v from 'valibot';
import { db, entries, entryTags, users, devices } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { parseQuery } from '$lib/server/validate.ts';
import { requireAuth } from '$lib/server/auth.ts';
import { QUOTA } from '$lib/server/env.ts';
import { toB64 } from '$crypto/bytes.ts';

const schema = v.object({
	since: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(0)), '0'),
	limit: v.optional(
		v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(QUOTA.pullLimit)),
		String(QUOTA.pullLimit)
	),
	/** Sync selektif: hanya entri sejak tanggal ini. Tombstone tetap ikut. */
	sejakTanggal: v.optional(
		v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'))
	)
});

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const q = parseQuery(event.url, schema);

		const batas = q.sejakTanggal
			? or(gte(entries.entryDate, q.sejakTanggal), isNotNull(entries.deletedAt))
			: undefined;

		const rows = await db
			.select()
			.from(entries)
			.where(
				and(
					eq(entries.userId, ctx.userId),
					gt(entries.rev, q.since),
					// Entri dari brankas lama tidak ikut: perangkat ini tidak punya kuncinya.
					isNull(entries.archivedAt),
					batas
				)
			)
			.orderBy(asc(entries.rev))
			.limit(q.limit);

		const ids = rows.map((r) => r.id);
		const tags = ids.length
			? await db.select().from(entryTags).where(inArray(entryTags.entryId, ids))
			: [];
		const byEntry = new Map<string, string[]>();
		for (const t of tags) {
			const list = byEntry.get(t.entryId) ?? [];
			list.push(t.tagToken);
			byEntry.set(t.entryId, list);
		}

		const [user] = await db
			.select({ syncRev: users.syncRev })
			.from(users)
			.where(eq(users.id, ctx.userId))
			.limit(1);

		const maxRev = rows.length ? (rows[rows.length - 1] as (typeof rows)[number]).rev : q.since;
		if (ctx.deviceId) {
			await db.update(devices).set({ lastSyncedRev: maxRev }).where(eq(devices.id, ctx.deviceId));
		}

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
				clientUpdatedAt: r.clientUpdatedAt.toISOString(),
				deletedAt: r.deletedAt?.toISOString() ?? null,
				tagTokens: byEntry.get(r.id) ?? []
			})),
			serverRev: user?.syncRev ?? maxRev,
			hasMore: rows.length === q.limit
		});
	});
