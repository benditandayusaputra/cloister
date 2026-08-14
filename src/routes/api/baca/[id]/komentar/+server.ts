import { json, type RequestHandler } from '@sveltejs/kit';
import { and, asc, eq, isNull, inArray } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, comments, publicEntries, profiles } from '$lib/db/server/index.ts';
import { handler, bad, notFound } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';
import { rateLimit, LIMITS } from '$lib/server/ratelimit.ts';

const idSchema = v.pipe(v.string(), v.uuid());

const kirimSchema = v.object({
	body: v.pipe(v.string(), v.trim(), v.minLength(1, 'Komentar kosong'), v.maxLength(1000)),
	parentId: v.optional(v.nullable(v.pipe(v.string(), v.uuid())))
});

async function entriPublik(id: string) {
	const [row] = await db
		.select({
			id: publicEntries.id,
			userId: publicEntries.userId,
			isAnonymous: publicEntries.isAnonymous,
			moderationState: publicEntries.moderationState
		})
		.from(publicEntries)
		.where(eq(publicEntries.id, id))
		.limit(1);
	if (!row || row.moderationState === 'removed') throw notFound('Catatan publik tidak ada');
	return row;
}

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const id = v.parse(idSchema, event.params.id);
		const entri = await entriPublik(id);

		const rows = await db
			.select({
				id: comments.id,
				userId: comments.userId,
				parentId: comments.parentId,
				body: comments.body,
				createdAt: comments.createdAt,
				penName: profiles.penName
			})
			.from(comments)
			.leftJoin(profiles, eq(profiles.userId, comments.userId))
			.where(and(eq(comments.publicEntryId, id), isNull(comments.deletedAt)))
			.orderBy(asc(comments.createdAt))
			.limit(300);

		const daftar = rows.map((r) => {
			const penulis = r.userId === entri.userId;
			return {
				id: r.id,
				parentId: r.parentId,
				body: r.body,
				createdAt: r.createdAt.toISOString(),
				penulis,
				penName: penulis && entri.isAnonymous ? null : (r.penName ?? null)
			};
		});

		return json({ komentar: daftar });
	});

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		await rateLimit('komentar', ctx.userId, LIMITS.komentar);

		const id = v.parse(idSchema, event.params.id);
		const entri = await entriPublik(id);
		const b = await parseBody(event.request, kirimSchema);

		let parentId: string | null = null;
		if (b.parentId) {
			const [induk] = await db
				.select({ id: comments.id, parentId: comments.parentId, publicEntryId: comments.publicEntryId })
				.from(comments)
				.where(eq(comments.id, b.parentId))
				.limit(1);
			if (!induk || induk.publicEntryId !== id) throw bad('Komentar induk tidak ada');
			parentId = induk.parentId ?? induk.id;
		}

		const komentarId = uuidv7();
		await db.insert(comments).values({
			id: komentarId,
			publicEntryId: id,
			userId: ctx.userId,
			parentId,
			body: b.body
		});

		const [profil] = await db
			.select({ penName: profiles.penName })
			.from(profiles)
			.where(eq(profiles.userId, ctx.userId))
			.limit(1);

		const penulis = ctx.userId === entri.userId;
		return json(
			{
				komentar: {
					id: komentarId,
					parentId,
					body: b.body,
					createdAt: new Date().toISOString(),
					penulis,
					penName: penulis && entri.isAnonymous ? null : (profil?.penName ?? null)
				}
			},
			{ status: 201 }
		);
	});

export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = v.parse(idSchema, event.params.id);
		const komentarId = v.parse(idSchema, event.url.searchParams.get('komentarId') ?? '');

		const [row] = await db
			.select({ id: comments.id, userId: comments.userId, publicEntryId: comments.publicEntryId })
			.from(comments)
			.where(eq(comments.id, komentarId))
			.limit(1);
		if (!row || row.publicEntryId !== id) throw notFound('Komentar tidak ada');

		const entri = await entriPublik(id);
		const boleh = row.userId === ctx.userId || entri.userId === ctx.userId;
		if (!boleh) throw bad('Hanya penulis komentar atau pemilik catatan yang bisa menghapus');

		const anak = await db
			.select({ id: comments.id })
			.from(comments)
			.where(eq(comments.parentId, komentarId));
		const semua = [komentarId, ...anak.map((a) => a.id)];
		await db.update(comments).set({ deletedAt: new Date() }).where(inArray(comments.id, semua));

		return json({ dihapus: semua.length });
	});
