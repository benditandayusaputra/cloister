import webpush from 'web-push';
import { eq, inArray } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db, pushSubscriptions } from '$lib/db/server/index.ts';
import { CFG } from './env.ts';

let siap = false;

function siapkan(): boolean {
	if (siap) return true;
	const pub = env.VAPID_PUBLIC_KEY;
	const priv = env.VAPID_PRIVATE_KEY;
	if (!pub || !priv) return false;
	webpush.setVapidDetails(env.VAPID_SUBJECT ?? CFG.mailFrom.replace(/.*<|>.*/g, 'mailto:'), pub, priv);
	siap = true;
	return true;
}

export const pushAktif = () => Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
export const vapidPublicKey = () => env.VAPID_PUBLIC_KEY ?? '';

export interface Notifikasi {
	judul: string;
	isi: string;
	url?: string;
}

/**
 * Muatan notifikasi tidak boleh berisi isi jurnal. Server memang tidak punya
 * isinya untuk dikirim, jadi ini otomatis aman — hanya ajakan generik.
 */
export async function kirimKe(userId: string, n: Notifikasi): Promise<number> {
	if (!siapkan()) return 0;

	const langganan = await db
		.select()
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, userId));

	return kirimBatch(langganan, n);
}

type Langganan = typeof pushSubscriptions.$inferSelect;

export async function kirimBatch(langganan: Langganan[], n: Notifikasi): Promise<number> {
	if (!siapkan() || langganan.length === 0) return 0;

	const muatan = JSON.stringify({ judul: n.judul, isi: n.isi, url: n.url ?? '/app/hari-ini' });
	const mati: string[] = [];
	let terkirim = 0;

	await Promise.all(
		langganan.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					muatan,
					{ TTL: 6 * 3600, urgency: 'low' }
				);
				terkirim++;
			} catch (err) {
				const kode = (err as { statusCode?: number }).statusCode;
				// 404 dan 410 berarti langganan sudah mati di sisi peramban.
				if (kode === 404 || kode === 410) mati.push(s.endpoint);
			}
		})
	);

	if (mati.length > 0) {
		await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, mati));
	}
	return terkirim;
}
