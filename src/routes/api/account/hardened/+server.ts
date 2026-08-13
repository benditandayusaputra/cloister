import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users } from '$lib/db/server/index.ts';
import { handler, bad } from '$lib/server/problem.ts';
import { parseBody } from '$lib/server/validate.ts';
import { requireAuth, assertSameOrigin, audit } from '$lib/server/auth.ts';

const schema = v.object({ confirm: v.literal('DIPERKUAT', 'Ketik DIPERKUAT untuk mengaktifkan') });

/** Mode Diperkuat: server membuang wrappedMK, jalur masuk hanya transfer atau 24 kata. */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		await parseBody(event.request, schema);

		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user) throw bad('Akun tidak ada');
		if (user.hardenedMode) return json({ hardenedMode: true });

		await db
			.update(users)
			.set({ hardenedMode: true, wrappedMasterKey: null, wrappedMkNonce: null, updatedAt: new Date() })
			.where(eq(users.id, ctx.userId));

		await audit(ctx.userId, 'hardened_enabled', ctx.ip);
		return json({ hardenedMode: true });
	});
