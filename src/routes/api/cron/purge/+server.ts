import { json, type RequestHandler } from '@sveltejs/kit';
import { lt, and, eq, isNotNull, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import {
	db,
	entries,
	transferSessions,
	auditLogs,
	sessions,
	users,
	attachments,
	keyArchives
} from '$lib/db/server/index.ts';
import { handler, forbidden } from '$lib/server/problem.ts';
import { blob } from '$lib/server/blob.ts';

const days = (n: number) => new Date(Date.now() - n * 86_400_000);

/** Dipanggil Vercel Cron. Menjalankan kebijakan retensi data. */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const secret = env.CRON_SECRET;
		if (secret && event.request.headers.get('authorization') !== `Bearer ${secret}`)
			throw forbidden('Cron secret salah');

		const purgedTransfers = await db
			.delete(transferSessions)
			.where(lt(transferSessions.expiresAt, new Date()))
			.returning({ id: transferSessions.id });

		const purgedTombstones = await db
			.delete(entries)
			.where(and(isNotNull(entries.deletedAt), lt(entries.deletedAt, days(30))))
			.returning({ id: entries.id });

		const purgedAudit = await db
			.delete(auditLogs)
			.where(lt(auditLogs.createdAt, days(90)))
			.returning({ id: auditLogs.id });

		await db
			.update(sessions)
			.set({ ipHash: null })
			.where(and(isNotNull(sessions.ipHash), lt(sessions.createdAt, days(30))));

		await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

		// Arsip "mulai dari nol" yang lewat masa tenggang: kunci lama dan
		// entrinya dibuang bersamaan supaya tidak ada ciphertext yatim.
		const arsipKedaluwarsa = await db
			.delete(keyArchives)
			.where(lt(keyArchives.purgeAfter, new Date()))
			.returning({ userId: keyArchives.userId, keyVersion: keyArchives.keyVersion });

		let entriArsip = 0;
		for (const a of arsipKedaluwarsa) {
			const dibuang = await db
				.delete(entries)
				.where(
					and(
						eq(entries.userId, a.userId),
						isNotNull(entries.archivedAt),
						lt(entries.keyVersion, sql`(select key_version from users where id = ${a.userId})`)
					)
				)
				.returning({ id: entries.id });
			entriArsip += dibuang.length;
		}

		const purgedAccounts = await db
			.delete(users)
			.where(and(isNotNull(users.deletedAt), lt(users.deletedAt, days(7))))
			.returning({ id: users.id });

		const orphans = await db
			.select({ id: attachments.id, blobKey: attachments.blobKey })
			.from(attachments)
			.where(and(isNotNull(attachments.deletedAt), lt(attachments.deletedAt, days(7))))
			.limit(500);
		for (const o of orphans) await blob.del(o.blobKey);
		if (orphans.length) {
			await db.delete(attachments).where(
				sql`${attachments.id} in ${sql.raw(`(${orphans.map((o) => `'${o.id}'`).join(',')})`)}`
			);
		}

		return json({
			arsipKunci: arsipKedaluwarsa.length,
			entriArsip,
			transfers: purgedTransfers.length,
			tombstones: purgedTombstones.length,
			auditLogs: purgedAudit.length,
			accounts: purgedAccounts.length,
			attachments: orphans.length
		});
	});
