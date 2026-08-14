import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, users, profiles } from '$lib/db/server/index.ts';
import { handler, notFound } from '$lib/server/problem.ts';
import { requireAuth } from '$lib/server/auth.ts';
import { toB64 } from '$crypto/bytes.ts';

/** Ringkasan akun untuk klien yang baru bangun. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user) throw notFound('Akun tidak ada');
		const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId)).limit(1);

		return json({
			userId: user.id,
			email: user.email,
			role: user.role,
			emailVerified: user.emailVerifiedAt !== null,
			hardenedMode: user.hardenedMode,
			syncRev: user.syncRev,
			deviceId: ctx.deviceId,
			deletionScheduledAt: user.deletedAt,
			kdf: {
				algo: user.kdfAlgo,
				memKib: user.kdfMemKib,
				time: user.kdfTime,
				parallel: user.kdfParallel
			},
			profile: {
				penName: profile?.penName ?? null,
				displayName: profile?.displayName ?? null,
				bio: profile?.bio ?? null,
				avatarUrl: profile?.avatarUrl ?? null,
				theme: profile?.theme ?? 'flanel',
				mode: profile?.mode ?? 'malam',
				locale: profile?.locale ?? 'id',
				paranoidTags: profile?.paranoidTags ?? false
			},
			...(user.wrappedMasterKey && user.wrappedMkNonce
				? { wrappedMk: toB64(user.wrappedMasterKey), mkNonce: toB64(user.wrappedMkNonce) }
				: {})
		});
	});
