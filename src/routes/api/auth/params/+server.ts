import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db, users } from '$lib/db/server/index.ts';
import { handler } from '$lib/server/problem.ts';
import { parseQuery, emailSchema } from '$lib/server/validate.ts';
import { decoySalt } from '$lib/server/crypto.ts';
import { rateLimit, LIMITS, clientIp } from '$lib/server/ratelimit.ts';
import { toB64 } from '$crypto/bytes.ts';

const querySchema = v.object({ email: emailSchema });

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('params', ip, LIMITS.params);

		const { email } = parseQuery(event.url, querySchema);
		const [user] = await db
			.select({
				saltUser: users.saltUser,
				kdfAlgo: users.kdfAlgo,
				kdfMemKib: users.kdfMemKib,
				kdfTime: users.kdfTime,
				kdfParallel: users.kdfParallel
			})
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		// Selalu 200 dengan salt: email tak terdaftar dapat salt palsu deterministik.
		if (!user) {
			return json({
				saltUser: toB64(decoySalt(email)),
				kdf: { algo: 'argon2id', memKib: 65536, time: 3, parallel: 1 }
			});
		}

		return json({
			saltUser: toB64(user.saltUser),
			kdf: {
				algo: user.kdfAlgo,
				memKib: user.kdfMemKib,
				time: user.kdfTime,
				parallel: user.kdfParallel
			}
		});
	});
