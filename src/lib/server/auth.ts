import { SignJWT, jwtVerify } from 'jose';
import { eq, and, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { db, users, sessions, devices, auditLogs } from '$lib/db/server/index.ts';
import { CFG } from './env.ts';
import { sha256, randomToken, hashIp } from './crypto.ts';
import { unauthorized, forbidden } from './problem.ts';
import { clientIp } from './ratelimit.ts';

const ACCESS_TTL_SEC = 900;
const REFRESH_TTL_DAYS = 30;
export const REFRESH_COOKIE = 'cloister_rt';

const secret = () => new TextEncoder().encode(CFG.jwtSecret);

export interface AccessClaims {
	sub: string;
	did: string | null;
	role: string;
}

export async function signAccessToken(c: AccessClaims): Promise<string> {
	return new SignJWT({ did: c.did, role: c.role })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(c.sub)
		.setIssuedAt()
		.setIssuer('Cloister')
		.setExpirationTime(`${ACCESS_TTL_SEC}s`)
		.sign(secret());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
	try {
		const { payload } = await jwtVerify(token, secret(), { issuer: 'Cloister' });
		return {
			sub: payload.sub as string,
			did: (payload.did as string | null) ?? null,
			role: (payload.role as string) ?? 'user'
		};
	} catch {
		throw unauthorized('Token akses kedaluwarsa');
	}
}

export interface IssuedSession {
	accessToken: string;
	refreshToken: string;
	sessionId: string;
}

export async function issueSession(opts: {
	userId: string;
	deviceId: string | null;
	role: string;
	familyId?: string;
	ip: string;
	userAgent: string;
}): Promise<IssuedSession> {
	const refreshToken = randomToken(32);
	const id = uuidv7();
	await db.insert(sessions).values({
		id,
		userId: opts.userId,
		deviceId: opts.deviceId,
		refreshTokenHash: sha256(refreshToken),
		familyId: opts.familyId ?? uuidv7(),
		ipHash: hashIp(opts.ip),
		userAgent: opts.userAgent.slice(0, 300),
		expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000)
	});
	const accessToken = await signAccessToken({
		sub: opts.userId,
		did: opts.deviceId,
		role: opts.role
	});
	return { accessToken, refreshToken, sessionId: id };
}

export function setRefreshCookie(cookies: Cookies, token: string) {
	cookies.set(REFRESH_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: 'strict',
		maxAge: REFRESH_TTL_DAYS * 86400
	});
}

export function clearRefreshCookie(cookies: Cookies) {
	cookies.delete(REFRESH_COOKIE, { path: '/' });
}

/**
 * Masa tenggang rotasi. Kalau pengguna berpindah halaman saat permintaan refresh
 * masih di jalan, responsnya hilang dan peramban masih memegang token lama.
 * Tanpa tenggang ini, kejadian biasa itu salah dibaca sebagai token dicuri.
 */
const ROTATION_GRACE_MS = 30_000;

/** Rotasi refresh token; pemakaian ulang di luar masa tenggang mencabut seluruh family. */
export async function rotateRefresh(token: string, ip: string, userAgent: string) {
	const hash = sha256(token);
	const [row] = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, hash)).limit(1);
	if (!row) throw unauthorized('Refresh token tidak dikenal');

	const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
	if (!user || user.status !== 'active') throw unauthorized('Akun tidak aktif');

	if (row.revokedAt) {
		const baruSajaDirotasi =
			row.rotatedAt !== null && Date.now() - row.rotatedAt.getTime() < ROTATION_GRACE_MS;

		if (!baruSajaDirotasi) {
			await db
				.update(sessions)
				.set({ revokedAt: new Date() })
				.where(eq(sessions.familyId, row.familyId));
			await db.insert(auditLogs).values({
				userId: row.userId,
				action: 'refresh_reuse',
				ipHash: hashIp(ip)
			});
			throw unauthorized('Token dipakai ulang, semua sesi dicabut');
		}
		// Dalam masa tenggang: terbitkan lagi dalam family yang sama.
		return issueSession({
			userId: row.userId,
			deviceId: row.deviceId,
			role: user.role,
			familyId: row.familyId,
			ip,
			userAgent
		});
	}

	if (row.expiresAt.getTime() < Date.now()) throw unauthorized('Sesi kedaluwarsa');

	const now = new Date();
	await db.update(sessions).set({ revokedAt: now, rotatedAt: now }).where(eq(sessions.id, row.id));
	return issueSession({
		userId: row.userId,
		deviceId: row.deviceId,
		role: user.role,
		familyId: row.familyId,
		ip,
		userAgent
	});
}

export async function revokeFamilyOfSession(sessionId: string) {
	const [row] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
	if (row) await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.familyId, row.familyId));
}

export interface AuthContext {
	userId: string;
	deviceId: string | null;
	role: string;
	ip: string;
	userAgent: string;
}

export async function requireAuth(event: RequestEvent): Promise<AuthContext> {
	const header = event.request.headers.get('authorization');
	if (!header?.startsWith('Bearer ')) throw unauthorized('Header Authorization hilang');
	const claims = await verifyAccessToken(header.slice(7));

	if (claims.did) {
		const [d] = await db
			.select({ id: devices.id })
			.from(devices)
			.where(and(eq(devices.id, claims.did), isNull(devices.revokedAt)))
			.limit(1);
		if (!d) throw unauthorized('Perangkat sudah dicabut');
		await db.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.id, claims.did));
	}

	return {
		userId: claims.sub,
		deviceId: claims.did,
		role: claims.role,
		ip: clientIp(event.request, event.getClientAddress()),
		userAgent: event.request.headers.get('user-agent') ?? ''
	};
}

export async function requireRole(event: RequestEvent, roles: string[]): Promise<AuthContext> {
	const ctx = await requireAuth(event);
	if (!roles.includes(ctx.role)) throw forbidden('Butuh hak moderator');
	return ctx;
}

/** CSRF: semua mutasi wajib punya Origin yang sama dengan host. */
export function assertSameOrigin(event: RequestEvent) {
	const origin = event.request.headers.get('origin');
	if (!origin) return;
	if (new URL(origin).host !== event.url.host) throw forbidden('Origin tidak cocok');
}

export async function audit(
	userId: string | null,
	action: string,
	ip: string,
	metadata?: Record<string, unknown>,
	deviceId?: string | null
) {
	await db.insert(auditLogs).values({
		userId,
		action,
		deviceId: deviceId ?? null,
		ipHash: hashIp(ip),
		metadata: metadata ?? null
	});
}
