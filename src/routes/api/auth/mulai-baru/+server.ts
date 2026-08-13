import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, isNull, desc, count, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import * as v from 'valibot';
import { db, users, entries, devices, sessions, emailTokens, keyArchives } from '$lib/db/server/index.ts';
import { handler, unauthorized, bad, forbidden } from '$lib/server/problem.ts';
import { parseBody, emailSchema, kdfSchema, b64Exact } from '$lib/server/validate.ts';
import { hashAuthKey, verifyAuthKey, sha256, randomToken, sixDigitCode } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';
import { issueSession, setRefreshCookie, audit, assertSameOrigin } from '$lib/server/auth.ts';
import { mail } from '$lib/server/email.ts';
import { TENGGANG_HARI } from '$lib/server/arsip.ts';
import { fromB64 } from '$crypto/bytes.ts';

const langkah1 = v.object({
	email: emailSchema,
	authKey: b64Exact(32, 'authKey')
});

/**
 * Langkah 1: minta kode lewat email, kalau emailnya memang sudah terverifikasi.
 *
 * Pada akun terverifikasi, kode itu menuntut penyerang juga menguasai kotak
 * masuk, bukan cuma tahu sandi. Kalau email belum pernah diverifikasi tidak ada
 * kotak masuk yang terbukti bisa dihubungi, jadi memaksakan kode hanya akan
 * mengunci pemiliknya sendiri; sandi dan konfirmasi ketikan yang jadi penjaga.
 */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('mulai-baru', ip, LIMITS.recover);

		const b = await parseBody(event.request, langkah1);
		await rateLimit('mulai-baru-email', b.email, LIMITS.recover);

		const [user] = await db.select().from(users).where(eq(users.email, b.email)).limit(1);
		if (!user || !verifyAuthKey(b.authKey, user.authHash)) throw unauthorized('Email atau sandi salah');
		if (user.status !== 'active') throw forbidden('Akun tidak aktif');

		const [{ n }] = (await db
			.select({ n: count() })
			.from(entries)
			.where(and(eq(entries.userId, user.id), isNull(entries.deletedAt), isNull(entries.archivedAt)))) as [
			{ n: number }
		];

		const perluKode = user.emailVerifiedAt !== null;
		if (perluKode) {
			const code = sixDigitCode();
			await db.insert(emailTokens).values({
				tokenHash: sha256(randomToken(16)),
				userId: user.id,
				purpose: 'start_over',
				code,
				expiresAt: new Date(Date.now() + 600_000)
			});
			await mail.mulaiBaru(user.email, code, n);
		}
		await audit(user.id, 'start_over_requested', ip, { jumlahEntri: n, perluKode });

		return json({ terkirim: perluKode, perluKode, jumlahEntri: n, tenggangHari: TENGGANG_HARI });
	});

const langkah2 = v.object({
	email: emailSchema,
	authKey: b64Exact(32, 'authKey'),
	// Hanya wajib untuk akun yang emailnya sudah terverifikasi.
	code: v.optional(v.pipe(v.string(), v.regex(/^\d{6}$/, 'Kode harus 6 angka'))),
	// Brankas baru dibuat di perangkat, persis seperti saat mendaftar.
	authKeyBaru: b64Exact(32, 'authKeyBaru'),
	saltUser: b64Exact(16, 'saltUser'),
	kdf: kdfSchema,
	wrappedMk: b64Exact(48, 'wrappedMk'),
	mkNonce: b64Exact(24, 'mkNonce'),
	recoveryWrappedMk: b64Exact(48, 'recoveryWrappedMk'),
	recoveryNonce: b64Exact(24, 'recoveryNonce'),
	recoverySalt: b64Exact(16, 'recoverySalt'),
	recoveryAuthKey: b64Exact(32, 'recoveryAuthKey'),
	deviceName: v.pipe(v.string(), v.maxLength(120)),
	platform: v.optional(v.pipe(v.string(), v.maxLength(80)), '')
});

/**
 * Langkah 2: pasang brankas baru.
 *
 * Kunci lama diarsipkan, bukan dihapus. Selama masa tenggang, pemilik yang
 * menemukan 24 kata lamanya masih bisa mengambil kembali seluruh tulisan.
 */
export const PUT: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('mulai-baru', ip, LIMITS.recover);

		const b = await parseBody(event.request, langkah2);
		const [user] = await db.select().from(users).where(eq(users.email, b.email)).limit(1);
		if (!user || !verifyAuthKey(b.authKey, user.authHash)) throw unauthorized('Email atau sandi salah');
		if (user.status !== 'active') throw forbidden('Akun tidak aktif');

		const perluKode = user.emailVerifiedAt !== null;
		let token: typeof emailTokens.$inferSelect | undefined;

		if (perluKode) {
			[token] = await db
				.select()
				.from(emailTokens)
				.where(
					and(
						eq(emailTokens.userId, user.id),
						eq(emailTokens.purpose, 'start_over'),
						isNull(emailTokens.usedAt)
					)
				)
				.orderBy(desc(emailTokens.expiresAt))
				.limit(1);

			if (!token || token.expiresAt.getTime() < Date.now()) throw bad('Kode kedaluwarsa, minta lagi');
			if (token.code !== b.code) throw bad('Kode tidak cocok');
		}

		const sekarang = new Date();
		const purgeAfter = new Date(Date.now() + TENGGANG_HARI * 86_400_000);
		const versiBaru = user.keyVersion + 1;
		const deviceId = uuidv7();

		await db.transaction(async (tx) => {
			if (token) {
				await tx
					.update(emailTokens)
					.set({ usedAt: sekarang })
					.where(eq(emailTokens.tokenHash, token.tokenHash));
			}

			const [{ n }] = (await tx
				.select({ n: count() })
				.from(entries)
				.where(and(eq(entries.userId, user.id), isNull(entries.archivedAt)))) as [{ n: number }];

			// Simpan brankas lama supaya masih bisa dipulihkan dalam masa tenggang.
			await tx.insert(keyArchives).values({
				id: uuidv7(),
				userId: user.id,
				keyVersion: user.keyVersion,
				recoveryWrappedMk: user.recoveryWrappedMk,
				recoveryMkNonce: user.recoveryMkNonce,
				recoverySalt: user.recoverySalt,
				recoveryAuthHash: user.recoveryAuthHash,
				kdfAlgo: user.kdfAlgo,
				kdfMemKib: user.kdfMemKib,
				kdfTime: user.kdfTime,
				kdfParallel: user.kdfParallel,
				jumlahEntri: n,
				purgeAfter
			});

			await tx
				.update(entries)
				.set({ archivedAt: sekarang })
				.where(and(eq(entries.userId, user.id), isNull(entries.archivedAt)));

			await tx
				.update(users)
				.set({
					authHash: hashAuthKey(b.authKeyBaru),
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
					recoveryAuthHash: hashAuthKey(b.recoveryAuthKey),
					recoveryUsedAt: null,
					keyVersion: versiBaru,
					// Mode diperkuat dimatikan: pengguna baru saja kehilangan jalur pemulihan.
					hardenedMode: false,
					deletedAt: null,
					updatedAt: sekarang
				})
				.where(eq(users.id, user.id));

			// Perangkat lama memegang kunci lama, jadi tidak berguna lagi.
			await tx
				.update(devices)
				.set({ revokedAt: sekarang })
				.where(and(eq(devices.userId, user.id), isNull(devices.revokedAt)));
			await tx.update(sessions).set({ revokedAt: sekarang }).where(eq(sessions.userId, user.id));

			await tx.insert(devices).values({
				id: deviceId,
				userId: user.id,
				name: b.deviceName || 'Perangkat baru',
				platform: b.platform || null,
				registeredVia: 'start_over',
				lastSeenAt: sekarang
			});
		});

		const s = await issueSession({
			userId: user.id,
			deviceId,
			role: user.role,
			ip,
			userAgent: event.request.headers.get('user-agent') ?? ''
		});
		setRefreshCookie(event.cookies, s.refreshToken);

		await audit(user.id, 'start_over', ip, { keyVersion: versiBaru }, deviceId);
		await mail.mulaiBaruSelesai(user.email, TENGGANG_HARI);

		return json({
			userId: user.id,
			deviceId,
			accessToken: s.accessToken,
			keyVersion: versiBaru,
			tenggangHari: TENGGANG_HARI,
			arsipPurgeAt: purgeAfter.toISOString()
		});
	});

/** Ringkasan arsip yang masih bisa dipulihkan. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const email = event.url.searchParams.get('email') ?? '';
		if (!email) throw bad('email wajib');

		const [user] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email.toLowerCase()))
			.limit(1);
		if (!user) return json({ arsip: [] });

		const rows = await db
			.select({
				keyVersion: keyArchives.keyVersion,
				jumlahEntri: keyArchives.jumlahEntri,
				createdAt: keyArchives.createdAt,
				purgeAfter: keyArchives.purgeAfter
			})
			.from(keyArchives)
			.where(and(eq(keyArchives.userId, user.id), sql`${keyArchives.purgeAfter} > now()`))
			.orderBy(desc(keyArchives.createdAt));

		return json({ arsip: rows });
	});
