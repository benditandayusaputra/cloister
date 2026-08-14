import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { parseBody, emailSchema } from '$lib/server/validate.ts';
import { decoySalt, decoyBlob } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';
import { assertSameOrigin, audit } from '$lib/server/auth.ts';
import { toB64 } from '$crypto/bytes.ts';

const schema = v.object({ email: emailSchema });

/**
 * Mengembalikan blob pemulihan yang hanya bisa dibuka dengan 24 kata.
 * Email tak terdaftar dapat blob palsu supaya tidak bisa dienumerasi.
 */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('recover', ip, LIMITS.recover);

		const { email } = await parseBody(event.request, schema);
		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

		if (!user) {
			return json({
				recoveryWrappedMk: toB64(decoyBlob(email, 'rmk', 48)),
				recoveryNonce: toB64(decoyBlob(email, 'rnonce', 24)),
				recoverySalt: toB64(decoySalt(email)),
				kdf: { algo: 'argon2id', memKib: 65536, time: 3, parallel: 1 }
			});
		}

		await audit(user.id, 'recovery_fetch', ip);
		return json({
			recoveryWrappedMk: toB64(user.recoveryWrappedMk),
			recoveryNonce: toB64(user.recoveryMkNonce),
			recoverySalt: toB64(user.recoverySalt),
			kdf: {
				algo: user.kdfAlgo,
				memKib: user.kdfMemKib,
				time: user.kdfTime,
				parallel: user.kdfParallel
			}
		});
	});
