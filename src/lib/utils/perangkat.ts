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

export function namaBrowser(): string {
	if (!browser) return 'Browser';
	const ua = navigator.userAgent;
	if (/Edg\//.test(ua)) return 'Edge';
	if (/OPR\//.test(ua)) return 'Opera';
	if (/Firefox\//.test(ua)) return 'Firefox';
	if (/Chrome\//.test(ua)) return 'Chrome';
	if (/Safari\//.test(ua)) return 'Safari';
	return 'Browser';
}

export const namaPerangkat = (): string => `${namaBrowser()} di ${platformPerangkat()}`;

export const layarKecil = (): boolean => browser && matchMedia('(max-width: 900px)').matches;

const KEY_PETA_PERANGKAT = 'cloister:peta-perangkat';

/**
 * Ingatan deviceId per email, di localStorage supaya selamat saat database
 * lokal dibuang ketika ganti akun. deviceId bukan rahasia: server tetap
 * memeriksa kepemilikannya dan tidak pernah menyerahkan kunci terbungkus ke
 * perangkat yang bukan milik akun itu.
 */
export function deviceIdUntuk(email: string): string | null {
	if (!browser) return null;
	try {
		const peta = JSON.parse(localStorage.getItem(KEY_PETA_PERANGKAT) ?? '{}') as Record<string, string>;
		return peta[email.toLowerCase()] ?? null;
	} catch {
		return null;
	}
}

export function ingatDeviceId(email: string, deviceId: string) {
	if (!browser) return;
	try {
		const peta = JSON.parse(localStorage.getItem(KEY_PETA_PERANGKAT) ?? '{}') as Record<string, string>;
		peta[email.toLowerCase()] = deviceId;
		localStorage.setItem(KEY_PETA_PERANGKAT, JSON.stringify(peta));
	} catch {
		localStorage.setItem(KEY_PETA_PERANGKAT, JSON.stringify({ [email.toLowerCase()]: deviceId }));
	}
}
