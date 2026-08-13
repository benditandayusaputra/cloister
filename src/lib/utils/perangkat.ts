import { browser } from '$app/environment';

export function platformPerangkat(): string {
	if (!browser) return '';
	const ua = navigator.userAgent;
	if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
	if (/Android/.test(ua)) return 'Android';
	if (/Macintosh/.test(ua)) return 'macOS';
	if (/Windows/.test(ua)) return 'Windows';
	if (/Linux/.test(ua)) return 'Linux';
	return 'Web';
}

export function namaPeramban(): string {
	if (!browser) return 'Peramban';
	const ua = navigator.userAgent;
	if (/Edg\//.test(ua)) return 'Edge';
	if (/OPR\//.test(ua)) return 'Opera';
	if (/Firefox\//.test(ua)) return 'Firefox';
	if (/Chrome\//.test(ua)) return 'Chrome';
	if (/Safari\//.test(ua)) return 'Safari';
	return 'Peramban';
}

export const namaPerangkat = (): string => `${namaPeramban()} di ${platformPerangkat()}`;

export const layarKecil = (): boolean => browser && matchMedia('(max-width: 900px)').matches;
