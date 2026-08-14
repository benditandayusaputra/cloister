import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db, devices } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { requireAuth } from '$lib/server/auth.ts';

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const rows = await db
			.select()
			.from(devices)
			.where(and(eq(devices.userId, ctx.userId), isNull(devices.revokedAt)))
			.orderBy(desc(devices.lastSeenAt));

		return json({
			devices: rows.map((d) => ({
				id: d.id,
				name: d.name,
				platform: d.platform,
				registeredVia: d.registeredVia,
				lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
				lastSyncedRev: d.lastSyncedRev,
				isCurrent: d.id === ctx.deviceId
			}))
		});
	});
