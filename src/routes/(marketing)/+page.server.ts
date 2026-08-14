import type { PageServerLoad } from './$types';
import { sql } from 'drizzle-orm';
import { loadFeed } from '$lib/server/feed.ts';
import { db } from '$lib/db/server/index.ts';

/**
 * Landing menampilkan beberapa catatan publik terbaru. Diambil di server dari
 * tabel `public_entries` — yang memang plaintext karena isinya sudah sengaja
 * diterbitkan penulisnya. Tidak ada data privat yang bisa bocor dari sini.
 *
 * Kalau query gagal (database belum siap saat pemasangan pertama), landing
 * tetap tampil tanpa bagian itu — halaman muka tidak boleh ikut tumbang.
 */
export const load: PageServerLoad = async () => {
	try {
		const [{ items }, [statistik]] = await Promise.all([
			loadFeed({ sort: 'terbaru', limit: 6 }),
			db.execute(sql`
				SELECT
					(SELECT count(*) FROM public_entries WHERE visibility='public' AND moderation_state='ok') AS catatan,
					(SELECT count(DISTINCT pen_name) FROM public_entries WHERE pen_name IS NOT NULL) AS penulis,
					(SELECT count(*) FROM reactions) AS reaksi,
					(SELECT count(*) FROM comments WHERE deleted_at IS NULL) AS komentar
			`)
		]);
		return {
			terbaru: items,
			statistik: {
				catatan: Number(statistik?.catatan ?? 0),
				penulis: Number(statistik?.penulis ?? 0),
				reaksi: Number(statistik?.reaksi ?? 0),
				komentar: Number(statistik?.komentar ?? 0)
			}
		};
	} catch {
		return { terbaru: [], statistik: { catatan: 0, penulis: 0, reaksi: 0, komentar: 0 } };
	}
};
