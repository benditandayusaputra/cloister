import type { PageServerLoad } from './$types';
import { loadFeed } from '$lib/server/feed.ts';

export const load: PageServerLoad = async () => {
	try {
		const { items } = await loadFeed({ sort: 'terbaru', limit: 6 });
		return { terbaru: items };
	} catch {
		return { terbaru: [] };
	}
};
