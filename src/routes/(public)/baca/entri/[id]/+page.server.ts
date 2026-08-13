import type { PageServerLoad } from './$types';
import { ambilEntriPublik } from '$lib/server/publik.ts';
import { error } from '@sveltejs/kit';
import { Problem } from '$lib/server/problem.ts';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	try {
		const entri = await ambilEntriPublik(params.id);
		setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
		return { entri };
	} catch (err) {
		if (err instanceof Problem) error(err.init.status, err.init.title);
		throw err;
	}
};
