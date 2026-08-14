import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, ne } from 'drizzle-orm';
import * as v from 'valibot';
import { db, profiles } from '$lib/db/server/index.ts';
import { handler, bad } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';

const schema = v.object({
	penName: v.optional(
		v.nullable(
			v.pipe(
				v.string(),
				v.trim(),
				v.toLowerCase(),
				v.regex(/^[a-z0-9_]{3,24}$/, 'Nama pena: 3-24 huruf kecil, angka, atau garis bawah')
			)
		)
	),
	displayName: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(60)))),
	bio: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(280)))),
	theme: v.optional(
		v.picklist(['flanel', 'buku-tulis', 'polaroid', 'meja', 'batik', 'kamar-gelap', 'senja', 'terminal'])
	),
	mode: v.optional(v.picklist(['malam', 'siang'])),
	locale: v.optional(v.picklist(['id', 'en'])),
	paranoidTags: v.optional(v.boolean())
});

export const PATCH: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, schema);

		if (b.penName) {
			const [taken] = await db
				.select({ userId: profiles.userId })
				.from(profiles)
				.where(and(eq(profiles.penName, b.penName), ne(profiles.userId, ctx.userId)))
				.limit(1);
			if (taken) throw bad('Nama pena sudah dipakai orang lain');
		}

		const patch = Object.fromEntries(
			Object.entries(b).filter(([, val]) => val !== undefined)
		) as Partial<typeof profiles.$inferInsert>;

		await db
			.insert(profiles)
			.values({ userId: ctx.userId, ...patch })
			.onConflictDoUpdate({ target: profiles.userId, set: patch });

		const [row] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId)).limit(1);
		return json({ profile: row });
	});
