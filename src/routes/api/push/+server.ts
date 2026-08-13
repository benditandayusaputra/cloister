import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import * as v from 'valibot';
import { db, pushSubscriptions, profiles } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';
import { pushAktif, vapidPublicKey, kirimKe } from '$lib/server/push.ts';

const daftarSchema = v.object({
	endpoint: v.pipe(v.string(), v.url(), v.maxLength(600)),
	p256dh: v.pipe(v.string(), v.maxLength(200)),
	auth: v.pipe(v.string(), v.maxLength(100)),
	jam: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(23)), 21),
	offsetMenit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(-840), v.maxValue(840)), 0)
});

/** Kunci publik VAPID untuk klien; tidak rahasia. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const [p] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId)).limit(1);
		const langganan = await db
			.select({ endpoint: pushSubscriptions.endpoint })
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.userId, ctx.userId));

		return json({
			tersedia: pushAktif(),
			publicKey: vapidPublicKey(),
			aktif: p?.pengingatAktif ?? false,
			jam: p?.pengingatJam ?? 21,
			jumlahPerangkat: langganan.length
		});
	});

/**
 * Muatan notifikasi tidak pernah berisi isi jurnal — server tidak punya isinya
 * untuk dikirim. Yang dikirim hanya ajakan generik.
 */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, daftarSchema);

		await db
			.insert(pushSubscriptions)
			.values({ endpoint: b.endpoint, userId: ctx.userId, p256dh: b.p256dh, auth: b.auth })
			.onConflictDoUpdate({
				target: pushSubscriptions.endpoint,
				set: { userId: ctx.userId, p256dh: b.p256dh, auth: b.auth }
			});

		await db
			.insert(profiles)
			.values({
				userId: ctx.userId,
				pengingatAktif: true,
				pengingatJam: b.jam,
				pengingatOffset: b.offsetMenit
			})
			.onConflictDoUpdate({
				target: profiles.userId,
				set: { pengingatAktif: true, pengingatJam: b.jam, pengingatOffset: b.offsetMenit }
			});

		return json({ subscribed: true }, { status: 201 });
	});

/** Kirim satu notifikasi uji ke perangkat pengguna sendiri. */
export const PUT: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const terkirim = await kirimKe(ctx.userId, {
			judul: 'Cloister',
			isi: 'Notifikasi uji. Isi catatan tidak pernah ikut di sini.'
		});
		return json({ terkirim });
	});

export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const endpoint = event.url.searchParams.get('endpoint');

		if (endpoint) {
			await db
				.delete(pushSubscriptions)
				.where(
					and(eq(pushSubscriptions.userId, ctx.userId), eq(pushSubscriptions.endpoint, endpoint))
				);
		} else {
			await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, ctx.userId));
		}

		await db
			.update(profiles)
			.set({ pengingatAktif: false })
			.where(eq(profiles.userId, ctx.userId));

		return new Response(null, { status: 204 });
	});
