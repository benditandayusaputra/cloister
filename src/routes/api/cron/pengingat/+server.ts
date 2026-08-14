import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, sql, isNull, or, lt, inArray } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db, profiles, users, entries, pushSubscriptions } from '$lib/db/server/index.ts';
import { handler, forbidden } from '$lib/server/problem.ts';
import { kirimBatch, pushAktif } from '$lib/server/push.ts';

const AJAKAN = [
	'Waktunya menulis hari ini.',
	'Papannya masih kosong untuk hari ini.',
	'Ada yang mau dititipkan ke papan?',
	'Satu paragraf saja juga cukup.'
];

/**
 * Dijalankan tiap jam. Mengirim pengingat ke pengguna yang jam lokalnya cocok
 * dan belum menulis hari ini. Server tidak tahu isi apa pun, jadi payload-nya generik.
 */
export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const secret = env.CRON_SECRET;
		if (secret && event.request.headers.get('authorization') !== `Bearer ${secret}`)
			throw forbidden('Cron secret salah');

		if (!pushAktif()) return json({ dilewati: 'VAPID belum dikonfigurasi' });

		const sekarang = new Date();
		const jamUtc = sekarang.getUTCHours();
		const menitUtc = jamUtc * 60;

		// Jam lokal = jam UTC + offset. Cocokkan dengan preferensi pengguna.
		const kandidat = await db
			.select({
				userId: profiles.userId,
				jam: profiles.pengingatJam,
				offset: profiles.pengingatOffset,
				terakhir: profiles.pengingatTerakhir
			})
			.from(profiles)
			.innerJoin(users, eq(users.id, profiles.userId))
			.where(
				and(
					eq(profiles.pengingatAktif, true),
					eq(users.status, 'active'),
					isNull(users.deletedAt),
					or(
						isNull(profiles.pengingatTerakhir),
						lt(profiles.pengingatTerakhir, new Date(Date.now() - 20 * 3600_000))
					)
				)
			)
			.limit(2000);

		const jatuhTempo = kandidat.filter(
			(k) => Math.floor((((menitUtc + k.offset) % 1440) + 1440) % 1440 / 60) === k.jam
		);
		if (jatuhTempo.length === 0) return json({ dikirim: 0, kandidat: kandidat.length });

		const ids = jatuhTempo.map((k) => k.userId);

		// Yang sudah menulis hari ini tidak perlu diingatkan.
		const sudahMenulis = await db
			.select({ userId: entries.userId })
			.from(entries)
			.where(
				and(
					inArray(entries.userId, ids),
					isNull(entries.deletedAt),
					sql`${entries.updatedAt} > now() - interval '20 hours'`
				)
			)
			.groupBy(entries.userId);
		const lewati = new Set(sudahMenulis.map((r) => r.userId));

		const perluDiingatkan = ids.filter((id) => !lewati.has(id));
		if (perluDiingatkan.length === 0) return json({ dikirim: 0, semuaSudahMenulis: true });

		const langganan = await db
			.select()
			.from(pushSubscriptions)
			.where(inArray(pushSubscriptions.userId, perluDiingatkan));

		const perUser = new Map<string, typeof langganan>();
		for (const s of langganan) {
			const list = perUser.get(s.userId) ?? [];
			list.push(s);
			perUser.set(s.userId, list);
		}

		let dikirim = 0;
		for (const [userId, subs] of perUser) {
			const isi = AJAKAN[Math.floor(Math.random() * AJAKAN.length)] as string;
			dikirim += await kirimBatch(subs, { judul: 'Cloister', isi });
			await db
				.update(profiles)
				.set({ pengingatTerakhir: sekarang })
				.where(eq(profiles.userId, userId));
		}

		return json({ dikirim, kandidat: kandidat.length, jatuhTempo: jatuhTempo.length });
	});
