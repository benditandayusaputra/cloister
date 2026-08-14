import type { PageServerLoad } from './$types';
import { loadFeed } from '$lib/server/feed.ts';

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
		const { items } = await loadFeed({ sort: 'terbaru', limit: 4 });
		return { terbaru: items };
	} catch {
		return { terbaru: [] };
	}
};
