import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, users, profiles, devices, emailTokens } from '$lib/db/server/index.ts';
import { handler, bad } from '$lib/server/problem.ts';
import { parseBody, emailSchema, kdfSchema, b64, b64Exact } from '$lib/server/validate.ts';
import { hashAuthKey, sha256, randomToken, sixDigitCode } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';
import { issueSession, setRefreshCookie, audit, assertSameOrigin } from '$lib/server/auth.ts';
import { mail } from '$lib/server/email.ts';
import { verifikasiCaptcha } from '$lib/server/captcha.ts';
import { fromB64 } from '$crypto/bytes.ts';

const schema = v.object({
	email: emailSchema,
	authKey: b64Exact(32, 'authKey'),
	saltUser: b64Exact(16, 'saltUser'),
	kdf: kdfSchema,
	wrappedMk: b64Exact(48, 'wrappedMk'),
	mkNonce: b64Exact(24, 'mkNonce'),
	recoveryWrappedMk: b64Exact(48, 'recoveryWrappedMk'),
	recoveryNonce: b64Exact(24, 'recoveryNonce'),
	recoverySalt: b64Exact(16, 'recoverySalt'),
	recoveryAuthKey: b64Exact(32, 'recoveryAuthKey'),
	deviceName: v.pipe(v.string(), v.maxLength(120)),
	platform: v.optional(v.pipe(v.string(), v.maxLength(80)), ''),
	locale: v.optional(v.picklist(['id', 'en']), 'id'),
	captcha: v.optional(v.unknown()),
	situs: v.optional(v.pipe(v.string(), v.maxLength(200)), '')
});

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('register', ip, LIMITS.register);

		const b = await parseBody(event.request, schema);
		verifikasiCaptcha(b.captcha, b.situs);

		const [existing] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, b.email))
			.limit(1);
		if (existing) throw bad('Email sudah terdaftar');

		const userId = uuidv7();
		const deviceId = uuidv7();

		await db.insert(users).values({
			id: userId,
			email: b.email,
			authHash: hashAuthKey(b.authKey),
			saltUser: fromB64(b.saltUser),
			kdfAlgo: b.kdf.algo,
			kdfMemKib: b.kdf.memKib,
			kdfTime: b.kdf.time,
			kdfParallel: b.kdf.parallel,
			wrappedMasterKey: fromB64(b.wrappedMk),
			wrappedMkNonce: fromB64(b.mkNonce),
			recoveryWrappedMk: fromB64(b.recoveryWrappedMk),
			recoveryMkNonce: fromB64(b.recoveryNonce),
			recoverySalt: fromB64(b.recoverySalt),
			recoveryAuthHash: hashAuthKey(b.recoveryAuthKey)
		});

		await db.insert(profiles).values({ userId, locale: b.locale });
		await db.insert(devices).values({
			id: deviceId,
			userId,
			name: b.deviceName || 'Perangkat pertama',
			platform: b.platform || null,
			registeredVia: 'initial',
			lastSeenAt: new Date()
		});

		const code = sixDigitCode();
		await db.insert(emailTokens).values({
			tokenHash: sha256(randomToken(16)),
			userId,
			purpose: 'verify',
			code,
			expiresAt: new Date(Date.now() + 600_000)
		});
		await mail.verify(b.email, code);

		const s = await issueSession({
			userId,
			deviceId,
			role: 'user',
			ip,
			userAgent: event.request.headers.get('user-agent') ?? ''
		});
		setRefreshCookie(event.cookies, s.refreshToken);
		await audit(userId, 'register', ip, { deviceName: b.deviceName }, deviceId);

		return json(
			{ userId, deviceId, accessToken: s.accessToken, emailVerified: false },
			{ status: 201 }
		);
	});
