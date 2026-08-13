import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, users, devices, webauthnCredentials } from '$lib/db/server/index.ts';
import { handler, unauthorized, forbidden } from '$lib/server/problem.ts';
import { parseBody, emailSchema, b64Exact } from '$lib/server/validate.ts';
import { verifyAuthKey } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';
import { issueSession, setRefreshCookie, audit, assertSameOrigin } from '$lib/server/auth.ts';
import { pakaiTiket } from '$lib/server/webauthn.ts';
import { toB64 } from '$crypto/bytes.ts';

const schema = v.object({
	email: emailSchema,
	authKey: b64Exact(32, 'authKey'),
	deviceId: v.optional(v.pipe(v.string(), v.uuid())),
	deviceName: v.optional(v.pipe(v.string(), v.maxLength(120)), 'Perangkat'),
	platform: v.optional(v.pipe(v.string(), v.maxLength(80)), ''),
	/** Tiket dari verifikasi passkey, wajib kalau akun punya passkey terdaftar. */
	tiketPasskey: v.optional(v.pipe(v.string(), v.maxLength(64)))
});

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('login', ip, LIMITS.login);

		const b = await parseBody(event.request, schema);
		await rateLimit('login-email', b.email, LIMITS.loginEmail);

		const [user] = await db.select().from(users).where(eq(users.email, b.email)).limit(1);
		if (!user || user.status === 'deleted' || !verifyAuthKey(b.authKey, user.authHash)) {
			await audit(user?.id ?? null, 'login_failed', ip, { email: b.email });
			throw unauthorized('Email atau sandi salah');
		}
		if (user.status === 'suspended') throw unauthorized('Akun ditangguhkan');

		// Passkey sebagai faktor kedua: sandi benar saja tidak cukup kalau sudah didaftarkan.
		const passkey = await db
			.select({ id: webauthnCredentials.id })
			.from(webauthnCredentials)
			.where(eq(webauthnCredentials.userId, user.id))
			.limit(1);

		if (passkey.length > 0 && !(b.tiketPasskey && pakaiTiket(b.tiketPasskey, user.id))) {
			await audit(user.id, 'login_needs_passkey', ip);
			throw forbidden('Akun ini butuh passkey sebagai faktor kedua');
		}

		// Batal jadwal hapus akun kalau pengguna masuk lagi dalam masa tenggang.
		if (user.deletedAt) await db.update(users).set({ deletedAt: null }).where(eq(users.id, user.id));

		let device = null;
		if (b.deviceId) {
			const [d] = await db
				.select()
				.from(devices)
				.where(and(eq(devices.id, b.deviceId), eq(devices.userId, user.id), isNull(devices.revokedAt)))
				.limit(1);
			device = d ?? null;
		}

		// Perangkat baru tidak langsung dapat wrappedMK meski sandi benar.
		let deviceRegistered = device !== null;
		let deviceId = device?.id ?? null;

		const [firstDevice] = await db
			.select({ id: devices.id })
			.from(devices)
			.where(and(eq(devices.userId, user.id), isNull(devices.revokedAt)))
			.limit(1);

		if (!device && !firstDevice) {
			deviceId = uuidv7();
			await db.insert(devices).values({
				id: deviceId,
				userId: user.id,
				name: b.deviceName,
				platform: b.platform || null,
				registeredVia: 'initial',
				lastSeenAt: new Date()
			});
			deviceRegistered = true;
		}

		const s = await issueSession({
			userId: user.id,
			deviceId,
			role: user.role,
			ip,
			userAgent: event.request.headers.get('user-agent') ?? ''
		});
		setRefreshCookie(event.cookies, s.refreshToken);
		await audit(user.id, 'login', ip, { deviceRegistered }, deviceId);

		const sendVault = deviceRegistered && !user.hardenedMode && user.wrappedMasterKey;

		return json({
			userId: user.id,
			accessToken: s.accessToken,
			deviceId,
			deviceRegistered,
			hardenedMode: user.hardenedMode,
			emailVerified: user.emailVerifiedAt !== null,
			syncRev: user.syncRev,
			...(sendVault
				? {
						wrappedMk: toB64(user.wrappedMasterKey as Uint8Array),
						mkNonce: toB64(user.wrappedMkNonce as Uint8Array)
					}
				: {})
		});
	});
