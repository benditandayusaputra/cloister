import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { ambilProfil } from '$lib/server/publik.ts';
import { Problem } from '$lib/server/problem.ts';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	try {
		const profil = await ambilProfil(params.pen.slice(1));
		setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
		return { profil };
	} catch (err) {
		if (err instanceof Problem) error(err.init.status, err.init.title);
		throw err;
	}
};
