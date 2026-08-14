import { json, type RequestHandler } from '@sveltejs/kit';
import { handler } from '$lib/server/problem.ts';
import { loadFeed, popularTags, bacaParamFeed } from '$lib/server/feed.ts';

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const param = bacaParamFeed(event.url);
		const feed = await loadFeed({ ...param, q: param.q || undefined });
		return json(
			{ ...feed, tags: await popularTags() },
			{
				headers: {
					// Hasil pencarian ikut kata kunci pemanggilnya, jangan dibagi ke pembaca lain.
					'cache-control': param.q
						? 'private, max-age=0, no-store'
						: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
				}
			}
		);
	});
