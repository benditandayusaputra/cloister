import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db, transferSessions } from '$lib/db/server/index.ts';
import { handler, notFound, forbidden } from '$lib/server/problem.ts';
import { requireAuth, audit } from '$lib/server/auth.ts';
import { toB64 } from '$crypto/bytes.ts';

/** Perangkat baru mengambil blob. Percobaan dihitung di DB, bukan Redis. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const id = event.params.id as string;

		const [s] = await db
			.select()
			.from(transferSessions)
			.where(and(eq(transferSessions.id, id), eq(transferSessions.userId, ctx.userId)))
			.limit(1);

		if (!s || s.consumedAt) throw notFound('Sesi transfer tidak ada atau sudah dipakai');
		if (s.expiresAt.getTime() < Date.now()) {
			await db.delete(transferSessions).where(eq(transferSessions.id, id));
			throw notFound('Sesi transfer kedaluwarsa');
		}
		if (s.attempts >= s.maxAttempts) {
			await db.delete(transferSessions).where(eq(transferSessions.id, id));
			await audit(ctx.userId, 'transfer_locked', ctx.ip);
			throw forbidden('Percobaan habis, buat kode baru dari perangkat lama');
		}

		const attempts = s.attempts + 1;
		await db.update(transferSessions).set({ attempts }).where(eq(transferSessions.id, id));

		return json({
			blob: toB64(s.blob),
			nonce: toB64(s.nonce),
			attemptsLeft: s.maxAttempts - attempts,
			expiresAt: s.expiresAt.toISOString()
		});
	});
