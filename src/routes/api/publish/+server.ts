import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, gte, count } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, publicEntries, publicTags, profiles, users } from '$lib/db/server/index.ts';
import { handler, bad, forbidden } from '$lib/server/problem.ts';
import { parseBody, dateSchema } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';
import { rateLimit, LIMITS } from '$lib/server/ratelimit.ts';
import { sanitizeMarkdown, excerptOf } from '$lib/server/sanitize.ts';
import { makeSlug } from '$lib/server/slug.ts';

const schema = v.object({
	sourceEntryId: v.optional(v.pipe(v.string(), v.uuid())),
	title: v.pipe(v.string(), v.trim(), v.minLength(1, 'Judul wajib'), v.maxLength(160)),
	bodyMd: v.pipe(v.string(), v.minLength(1, 'Isi wajib'), v.maxLength(1_500_000)),
	entryDate: dateSchema,
	mood: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5)))),
	tags: v.optional(v.pipe(v.array(v.pipe(v.string(), v.maxLength(32))), v.maxLength(8)), []),
	theme: v.optional(v.pipe(v.string(), v.maxLength(24)), 'flanel'),
	isAnonymous: v.optional(v.boolean(), false),
	visibility: v.optional(v.picklist(['public', 'unlisted']), 'public'),
	// Jejak Penyaring Identitas. Dikirim klien apa adanya; server tidak pernah
	// memindai ulang karena ia tidak punya catatan privatnya.
	redactionApplied: v.optional(v.boolean(), false),
	exposureScore: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(999)))),
	consent: v.literal(true, 'Persetujuan keluar dari enkripsi wajib dicentang')
});

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		await rateLimit('publish-hour', ctx.userId, LIMITS.publishHour);
		await rateLimit('publish-day', ctx.userId, LIMITS.publishDay);

		const b = await parseBody(event.request, schema);

		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user) throw forbidden('Akun tidak ada');
		if (!user.emailVerifiedAt) throw forbidden('Verifikasi email dulu sebelum menerbitkan');

		const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId)).limit(1);
		if (!b.isAnonymous && !profile?.penName) throw bad('Isi nama pena dulu di Pengaturan');

		// Akun berumur < 24 jam masuk antrean tinjau sebelum tampil di feed.
		const muda = Date.now() - user.createdAt.getTime() < 86_400_000;

		const [{ n }] = (await db
			.select({ n: count() })
			.from(publicEntries)
			.where(
				and(eq(publicEntries.userId, ctx.userId), gte(publicEntries.publishedAt, new Date(Date.now() - 86_400_000)))
			)) as [{ n: number }];
		if (n >= LIMITS.publishDay.limit) throw forbidden('Batas terbit harian tercapai');

		const id = uuidv7();
		const bodyMd = sanitizeMarkdown(b.bodyMd);
		const slug = makeSlug(b.title, id);

		await db.insert(publicEntries).values({
			id,
			userId: ctx.userId,
			sourceEntryId: b.sourceEntryId ?? null,
			slug,
			title: b.title,
			bodyMd,
			excerpt: excerptOf(bodyMd),
			entryDate: b.entryDate,
			mood: b.mood ?? null,
			theme: b.theme,
			penName: b.isAnonymous ? null : (profile?.penName ?? null),
			isAnonymous: b.isAnonymous,
			visibility: b.visibility,
			redactionApplied: b.redactionApplied,
			exposureScore: b.exposureScore ?? null,
			moderationState: muda ? 'pending' : 'ok'
		});

		if (b.tags.length) {
			await db
				.insert(publicTags)
				.values(b.tags.map((tag) => ({ publicEntryId: id, tag: tag.toLowerCase() })))
				.onConflictDoNothing();
		}

		await audit(ctx.userId, 'publish', ctx.ip, { id, slug });

		return json(
			{
				id,
				slug,
				penName: b.isAnonymous ? null : (profile?.penName ?? null),
				url: b.isAnonymous ? `/baca/entri/${id}` : `/baca/@${profile?.penName}/${slug}`,
				moderationState: muda ? 'pending' : 'ok'
			},
			{ status: 201 }
		);
	});

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const rows = await db
			.select()
			.from(publicEntries)
			.where(eq(publicEntries.userId, ctx.userId))
			.orderBy(publicEntries.publishedAt);

		return json({
			entries: rows.map((r) => ({
				id: r.id,
				slug: r.slug,
				title: r.title,
				entryDate: r.entryDate,
				penName: r.penName,
				isAnonymous: r.isAnonymous,
				visibility: r.visibility,
				moderationState: r.moderationState,
				viewCount: r.viewCount,
				reactionCount: r.reactionCount,
				sourceEntryId: r.sourceEntryId,
				publishedAt: r.publishedAt.toISOString()
			}))
		});
	});
