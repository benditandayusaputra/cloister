import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq, or, ilike, desc } from 'drizzle-orm';
import { db, publicEntries } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const q = (event.url.searchParams.get('q') ?? '').trim().slice(0, 120);
		if (q.length < 2) return json({ items: [] });

		const rows = await db
			.select()
			.from(publicEntries)
			.where(
				and(
					eq(publicEntries.visibility, 'public'),
					eq(publicEntries.moderationState, 'ok'),
					or(ilike(publicEntries.title, `%${q}%`), ilike(publicEntries.bodyMd, `%${q}%`))
				)
			)
			.orderBy(desc(publicEntries.publishedAt))
			.limit(30);

		return json({
			items: rows.map((r) => ({
				id: r.id,
				slug: r.slug,
				title: r.title,
				excerpt: r.excerpt,
				penName: r.penName,
				isAnonymous: r.isAnonymous,
				entryDate: r.entryDate
			}))
		});
	});
