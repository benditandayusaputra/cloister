import { eq, and, sql, desc } from 'drizzle-orm';
import { db, publicEntries, publicTags, reactions, profiles } from '$lib/db/server/index.ts';
import { renderMarkdown } from './sanitize.ts';
import { penulisTerverifikasi } from './feed.ts';
import { notFound } from './problem.ts';

export interface EntriPublikView {
	id: string;
	slug: string;
	title: string;
	html: string;
	excerpt: string;
	entryDate: string;
	mood: number | null;
	penName: string | null;
	terverifikasi: boolean;
	isAnonymous: boolean;
	publishedAt: string;
	viewCount: number;
	tags: string[];
	reaksi: Record<string, number>;
	moderationState: string;
}

export async function ambilEntriPublik(id: string): Promise<EntriPublikView> {
	const [row] = await db.select().from(publicEntries).where(eq(publicEntries.id, id)).limit(1);
	if (!row || row.moderationState === 'removed') throw notFound('Tulisan tidak ada');

	const tags = await db.select().from(publicTags).where(eq(publicTags.publicEntryId, id));
	const counts = await db
		.select({ kind: reactions.kind, n: sql<number>`count(*)::int` })
		.from(reactions)
		.where(eq(reactions.publicEntryId, id))
		.groupBy(reactions.kind);

	void db
		.update(publicEntries)
		.set({ viewCount: sql`${publicEntries.viewCount} + 1` })
		.where(eq(publicEntries.id, id))
		.catch(() => {});

	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		html: renderMarkdown(row.bodyMd),
		excerpt: row.excerpt,
		entryDate: row.entryDate,
		mood: row.mood,
		penName: row.penName,
		terverifikasi: !row.isAnonymous && (await penulisTerverifikasi([row.userId])).has(row.userId),
		isAnonymous: row.isAnonymous,
		publishedAt: row.publishedAt.toISOString(),
		viewCount: row.viewCount,
		tags: tags.map((t) => t.tag),
		reaksi: Object.fromEntries(counts.map((c) => [c.kind, c.n])),
		moderationState: row.moderationState
	};
}

export async function ambilBySlug(penName: string, slug: string): Promise<EntriPublikView> {
	const [row] = await db
		.select({ id: publicEntries.id })
		.from(publicEntries)
		.where(and(eq(publicEntries.penName, penName), eq(publicEntries.slug, slug)))
		.limit(1);
	if (!row) throw notFound('Tulisan tidak ada');
	return ambilEntriPublik(row.id);
}

export interface ProfilPublik {
	penName: string;
	terverifikasi: boolean;
	displayName: string | null;
	bio: string | null;
	sejak: string;
	entri: Array<{
		id: string;
		slug: string;
		title: string;
		excerpt: string;
		entryDate: string;
		mood: number | null;
	}>;
}

export async function ambilProfil(penName: string): Promise<ProfilPublik> {
	const [p] = await db.select().from(profiles).where(eq(profiles.penName, penName)).limit(1);
	if (!p) throw notFound('Penulis tidak ada');

	const rows = await db
		.select()
		.from(publicEntries)
		.where(
			and(
				eq(publicEntries.userId, p.userId),
				eq(publicEntries.visibility, 'public'),
				eq(publicEntries.moderationState, 'ok'),
				eq(publicEntries.isAnonymous, false)
			)
		)
		.orderBy(desc(publicEntries.publishedAt))
		.limit(60);

	return {
		penName,
		terverifikasi: (await penulisTerverifikasi([p.userId])).has(p.userId),
		displayName: p.displayName,
		bio: p.bio,
		sejak: p.createdAt.toISOString(),
		entri: rows.map((r) => ({
			id: r.id,
			slug: r.slug,
			title: r.title,
			excerpt: r.excerpt,
			entryDate: r.entryDate,
			mood: r.mood
		}))
	};
}
