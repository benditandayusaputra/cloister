import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, users, sessions, devices } from '$lib/db/server/index.ts';
import { handler, unauthorized, forbidden } from '$lib/server/problem.ts';
import { parseBody, emailSchema, kdfSchema, b64Exact } from '$lib/server/validate.ts';
import { hashAuthKey, verifyAuthKey } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';
import { issueSession, setRefreshCookie, audit, assertSameOrigin } from '$lib/server/auth.ts';
import { mail } from '$lib/server/email.ts';
import { fromB64 } from '$crypto/bytes.ts';

const schema = v.object({
	email: emailSchema,
	recoveryAuthKey: b64Exact(32, 'recoveryAuthKey'),
	authKeyNew: b64Exact(32, 'authKeyNew'),
	saltUserNew: b64Exact(16, 'saltUserNew'),
	kdfNew: kdfSchema,
	wrappedMk: b64Exact(48, 'wrappedMk'),
	mkNonce: b64Exact(24, 'mkNonce'),
	deviceName: v.pipe(v.string(), v.maxLength(120)),
	platform: v.optional(v.pipe(v.string(), v.maxLength(80)), '')
});

/**
 * Reset sandi dengan bukti kepemilikan 24 kata.
 * Server hanya memverifikasi hash recoveryAuthKey; frasanya sendiri tidak pernah dikirim.
 */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('recover', ip, LIMITS.recover);

		const b = await parseBody(event.request, schema);
		const [user] = await db.select().from(users).where(eq(users.email, b.email)).limit(1);
		if (!user || !user.recoveryAuthHash || !verifyAuthKey(b.recoveryAuthKey, user.recoveryAuthHash))
			throw unauthorized('Frasa pemulihan tidak cocok');
		if (user.status !== 'active') throw forbidden('Akun tidak aktif');

		await db
			.update(users)
			.set({
				authHash: hashAuthKey(b.authKeyNew),
				saltUser: fromB64(b.saltUserNew),
				kdfAlgo: b.kdfNew.algo,
				kdfMemKib: b.kdfNew.memKib,
				kdfTime: b.kdfNew.time,
				kdfParallel: b.kdfNew.parallel,
				wrappedMasterKey: user.hardenedMode ? null : fromB64(b.wrappedMk),
				wrappedMkNonce: user.hardenedMode ? null : fromB64(b.mkNonce),
				recoveryUsedAt: new Date(),
				deletedAt: null,
				updatedAt: new Date()
			})
			.where(eq(users.id, user.id));

		await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, user.id));

		const deviceId = uuidv7();
		await db.insert(devices).values({
			id: deviceId,
			userId: user.id,
			name: b.deviceName || 'Perangkat pemulihan',
			platform: b.platform || null,
			registeredVia: 'recovery',
			lastSeenAt: new Date()
		});

		const s = await issueSession({
			userId: user.id,
			deviceId,
			role: user.role,
			ip,
			userAgent: event.request.headers.get('user-agent') ?? ''
		});
		setRefreshCookie(event.cookies, s.refreshToken);

		await audit(user.id, 'recovery_used', ip, {}, deviceId);
		await mail.recoveryUsed(user.email);

		return json({ userId: user.id, deviceId, accessToken: s.accessToken, syncRev: user.syncRev });
	});
