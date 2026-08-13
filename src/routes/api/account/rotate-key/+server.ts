import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, sql, count } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users, entries, entryTags, sessions } from '$lib/db/server/index.ts';
import { handler, unauthorized, conflict } from '$lib/server/problem.ts';
import { parseBody, kdfSchema, b64Exact, entryPushSchema, type EntryPush } from '$lib/server/validate.ts';
import { hashAuthKey, verifyAuthKey, sha256 } from '$lib/server/crypto.ts';
import { requireAuth, assertSameOrigin, audit, REFRESH_COOKIE } from '$lib/server/auth.ts';
import { mail } from '$lib/server/email.ts';
import { QUOTA } from '$lib/server/env.ts';
import { fromB64 } from '$crypto/bytes.ts';

const mulaiSchema = v.object({
	authKeyLama: b64Exact(32, 'authKeyLama'),
	authKey: b64Exact(32, 'authKey'),
	saltUser: b64Exact(16, 'saltUser'),
	kdf: kdfSchema,
	wrappedMk: b64Exact(48, 'wrappedMk'),
	mkNonce: b64Exact(24, 'mkNonce'),
	recoveryWrappedMk: b64Exact(48, 'recoveryWrappedMk'),
	recoveryNonce: b64Exact(24, 'recoveryNonce'),
	recoverySalt: b64Exact(16, 'recoverySalt'),
	recoveryAuthKey: b64Exact(32, 'recoveryAuthKey')
});

/**
 * Ganti kunci master. Klien sudah membungkus ulang seluruh entri dengan MK baru;
 * server hanya menukar brankas kunci dan menaikkan key_version.
 */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, mulaiSchema);

		const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
		if (!user || !verifyAuthKey(b.authKeyLama, user.authHash)) throw unauthorized('Sandi salah');

		const versiBaru = user.keyVersion + 1;

		await db
			.update(users)
			.set({
				authHash: hashAuthKey(b.authKey),
				saltUser: fromB64(b.saltUser),
				kdfAlgo: b.kdf.algo,
				kdfMemKib: b.kdf.memKib,
				kdfTime: b.kdf.time,
				kdfParallel: b.kdf.parallel,
				wrappedMasterKey: user.hardenedMode ? null : fromB64(b.wrappedMk),
				wrappedMkNonce: user.hardenedMode ? null : fromB64(b.mkNonce),
				recoveryWrappedMk: fromB64(b.recoveryWrappedMk),
				recoveryMkNonce: fromB64(b.recoveryNonce),
				recoverySalt: fromB64(b.recoverySalt),
				recoveryAuthHash: hashAuthKey(b.recoveryAuthKey),
				keyVersion: versiBaru,
				updatedAt: new Date()
			})
			.where(eq(users.id, ctx.userId));

		// Semua perangkat lain harus masuk ulang: kunci mereka sudah tidak berlaku.
		const current = event.cookies.get(REFRESH_COOKIE);
		await db
			.update(sessions)
			.set({ revokedAt: new Date() })
			.where(
				current
					? and(
							eq(sessions.userId, ctx.userId),
							sql`${sessions.refreshTokenHash} <> ${sha256(current)}`
						)
					: eq(sessions.userId, ctx.userId)
			);

		await audit(ctx.userId, 'master_key_rotated', ctx.ip, { keyVersion: versiBaru });
		await mail.passwordChanged(user.email);

		return json({ keyVersion: versiBaru });
	});

const batchSchema = v.object({
	keyVersion: v.pipe(v.number(), v.integer(), v.minValue(1)),
	entries: v.pipe(v.array(entryPushSchema), v.maxLength(QUOTA.pushBatch))
});

/**
 * Unggah batch entri yang sudah dibungkus ulang. Rev dinaikkan seperti push biasa,
 * tapi baseRev diabaikan karena isinya tidak berubah, hanya kuncinya.
 */
export const PUT: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		const b = await parseBody(event.request, batchSchema);
		if (b.entries.length === 0) return json({ diperbarui: 0 });

		const [user] = await db
			.select({ keyVersion: users.keyVersion })
			.from(users)
			.where(eq(users.id, ctx.userId))
			.limit(1);
		if (!user) throw unauthorized('Akun tidak ada');
		if (user.keyVersion !== b.keyVersion)
			throw conflict('Versi kunci tidak cocok, mulai rotasi dari awal');

		let diperbarui = 0;

		await db.transaction(async (tx) => {
			const [u] = await tx
				.select({ syncRev: users.syncRev })
				.from(users)
				.where(eq(users.id, ctx.userId))
				.for('update')
				.limit(1);
			let rev = u?.syncRev ?? 0;

			for (const e of b.entries as EntryPush[]) {
				const [ada] = await tx
					.select({ id: entries.id })
					.from(entries)
					.where(and(eq(entries.id, e.id), eq(entries.userId, ctx.userId)))
					.limit(1);
				if (!ada) continue;

				rev += 1;
				await tx
					.update(entries)
					.set({
						ciphertext: fromB64(e.ciphertext),
						nonce: fromB64(e.nonce),
						wrappedDek: fromB64(e.wrappedDek),
						dekNonce: fromB64(e.dekNonce),
						sizeBucket: e.sizeBucket,
						keyVersion: b.keyVersion,
						rev,
						updatedAt: new Date()
					})
					.where(eq(entries.id, e.id));

				// Blind index tag ikut berubah karena index key diturunkan dari MK.
				await tx.delete(entryTags).where(eq(entryTags.entryId, e.id));
				if (e.tagTokens.length) {
					await tx
						.insert(entryTags)
						.values(e.tagTokens.map((tagToken) => ({ entryId: e.id, tagToken })))
						.onConflictDoNothing();
				}
				diperbarui++;
			}

			await tx.update(users).set({ syncRev: rev }).where(eq(users.id, ctx.userId));
		});

		return json({ diperbarui });
	});

/** Berapa entri yang masih memakai kunci lama. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		const [user] = await db
			.select({ keyVersion: users.keyVersion })
			.from(users)
			.where(eq(users.id, ctx.userId))
			.limit(1);
		if (!user) throw unauthorized('Akun tidak ada');

		const [{ n }] = (await db
			.select({ n: count() })
			.from(entries)
			.where(and(eq(entries.userId, ctx.userId), sql`${entries.keyVersion} <> ${user.keyVersion}`))) as [
			{ n: number }
		];

		return json({ keyVersion: user.keyVersion, tertinggal: n });
	});
