import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import * as v from 'valibot';
import { db, publicEntries, publicTags } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { sanitizeMarkdown, excerptOf } from '$lib/server/sanitize.ts';

const schema = v.object({
	title: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160))),
	bodyMd: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(1_500_000))),
	tags: v.optional(v.pipe(v.array(v.pipe(v.string(), v.maxLength(32))), v.maxLength(8))),
	visibility: v.optional(v.picklist(['public', 'unlisted']))
});

export const PATCH: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = event.params.id as string;
		const b = await parseBody(event.request, schema);

		const [row] = await db
			.select()
			.from(publicEntries)
			.where(and(eq(publicEntries.id, id), eq(publicEntries.userId, ctx.userId)))
			.limit(1);
		if (!row) throw notFound('Catatan publik tidak ada');

		const bodyMd = b.bodyMd ? sanitizeMarkdown(b.bodyMd) : row.bodyMd;
		await db
			.update(publicEntries)
			.set({
				title: b.title ?? row.title,
				bodyMd,
				excerpt: excerptOf(bodyMd),
				visibility: b.visibility ?? row.visibility,
				updatedAt: new Date()
			})
			.where(eq(publicEntries.id, id));

		if (b.tags) {
			await db.delete(publicTags).where(eq(publicTags.publicEntryId, id));
			if (b.tags.length) {
				await db
					.insert(publicTags)
					.values(b.tags.map((tag) => ({ publicEntryId: id, tag: tag.toLowerCase() })))
					.onConflictDoNothing();
			}
		}

		await audit(ctx.userId, 'publish_update', ctx.ip, { id });
		return json({ id, updated: true });
	});

/** Unpublish = hard delete di server. */
export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = event.params.id as string;

		const [row] = await db
			.select({ id: publicEntries.id })
			.from(publicEntries)
			.where(and(eq(publicEntries.id, id), eq(publicEntries.userId, ctx.userId)))
			.limit(1);
		if (!row) throw notFound('Catatan publik tidak ada');

		await db.delete(publicEntries).where(eq(publicEntries.id, id));
		await audit(ctx.userId, 'unpublish', ctx.ip, { id });
		return new Response(null, { status: 204 });
	});
