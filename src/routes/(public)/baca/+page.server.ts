import type { PageServerLoad } from './$types';
import { loadFeed, popularTags, bacaParamFeed } from '$lib/server/feed.ts';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const param = bacaParamFeed(url);

	const [feed, tags] = await Promise.all([
		loadFeed({ ...param, q: param.q || undefined, hal: param.hal ?? 1, limit: 12 }),
		popularTags()
	]);

	// Hasil pencarian ikut kata kunci pembacanya, jadi tidak boleh dipakai bersama.
	setHeaders({
		'cache-control': param.q
			? 'private, max-age=0, no-store'
			: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
	});

	return {
		...feed,
		tags,
		sort: param.sort,
		tagAktif: param.tag ?? null,
		penulisAktif: param.penName ?? null,
		moodAktif: param.mood ?? null,
		gambarAktif: param.gambar === true,
		cari: param.q
	};
};
