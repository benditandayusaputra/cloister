import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, transferSessions, devices, users } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit, signAccessToken } from '$lib/server/auth.ts';
import { mail } from '$lib/server/email.ts';

const schema = v.object({
	deviceName: v.pipe(v.string(), v.maxLength(120)),
	platform: v.optional(v.pipe(v.string(), v.maxLength(80)), '')
});

/** Blob dihapus, perangkat didaftarkan, pemilik akun diberi tahu. */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = event.params.id as string;
		const b = await parseBody(event.request, schema);

		const [s] = await db
			.select()
			.from(transferSessions)
			.where(and(eq(transferSessions.id, id), eq(transferSessions.userId, ctx.userId)))
			.limit(1);
		if (!s || s.consumedAt) throw notFound('Sesi transfer tidak ada');

		await db.delete(transferSessions).where(eq(transferSessions.id, id));

		const deviceId = uuidv7();
		await db.insert(devices).values({
			id: deviceId,
			userId: ctx.userId,
			name: b.deviceName || 'Perangkat baru',
			platform: b.platform || null,
			registeredVia: 'transfer',
			lastSeenAt: new Date()
		});

		await audit(ctx.userId, 'device_added', ctx.ip, { via: 'transfer' }, deviceId);
		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (user) await mail.deviceAdded(user.email, b.deviceName);

		const accessToken = await signAccessToken({
			sub: ctx.userId,
			did: deviceId,
			role: user?.role ?? 'user'
		});

		return json({ deviceId, accessToken });
	});
