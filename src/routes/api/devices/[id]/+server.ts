import type { RequestHandler } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db, devices, sessions } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';

export const DELETE: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const id = event.params.id as string;

		const [d] = await db
			.select()
			.from(devices)
			.where(and(eq(devices.id, id), eq(devices.userId, ctx.userId)))
			.limit(1);
		if (!d) throw notFound('Perangkat tidak ada');

		await db.update(devices).set({ revokedAt: new Date() }).where(eq(devices.id, id));
		await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.deviceId, id));
		await audit(ctx.userId, 'device_revoked', ctx.ip, { name: d.name }, id);

		return new Response(null, { status: 204 });
	});
