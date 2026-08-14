import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ setHeaders, url }) => {
	// Landing memuat catatan publik terbaru, jadi cache CDN-nya dibuat pendek
	// supaya tulisan yang baru terbit tidak tertahan berjam-jam di halaman muka.
	const landing = url.pathname === '/';
	setHeaders({
		'cache-control': landing
			? 'public, max-age=0, s-maxage=60, stale-while-revalidate=600'
			: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
	});
	return {};
};
