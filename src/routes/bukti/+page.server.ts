import type { PageServerLoad } from './$types';
import { contohBarisPublik } from '$lib/server/bukti.ts';
import { CFG } from '$lib/server/env.ts';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });
	try {
		return { contoh: await contohBarisPublik(CFG.demoEmail) };
	} catch {
		return { contoh: null };
	}
};
