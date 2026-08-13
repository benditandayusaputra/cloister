import { browser } from '$app/environment';
import { api } from '$lib/api/client.ts';
import { fromB64Url } from '$crypto/bytes.ts';

export interface StatusPush {
	tersedia: boolean;
	publicKey: string;
	aktif: boolean;
	jam: number;
	jumlahPerangkat: number;
}

export const didukung = () =>
	browser && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const statusPush = () => api<StatusPush>('/api/push');

async function registrasiSW(): Promise<ServiceWorkerRegistration | null> {
	if (!didukung()) return null;
	return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.ready;
}

/** Minta izin lalu daftarkan langganan push ke server. */
export async function berlangganan(publicKey: string, jam: number): Promise<boolean> {
	if (!didukung()) throw new Error('Peramban ini tidak mendukung notifikasi push');

	const izin = await Notification.requestPermission();
	if (izin !== 'granted') throw new Error('Izin notifikasi ditolak');

	const reg = await registrasiSW();
	if (!reg) throw new Error('Service worker belum aktif');

	const lama = await reg.pushManager.getSubscription();
	const sub =
		lama ??
		(await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: fromB64Url(publicKey) as BufferSource
		}));

	const json = sub.toJSON();
	if (!json.keys?.p256dh || !json.keys?.auth) throw new Error('Langganan push tidak lengkap');

	await api<{ subscribed: boolean }>('/api/push', {
		method: 'POST',
		body: {
			endpoint: sub.endpoint,
			p256dh: json.keys.p256dh,
			auth: json.keys.auth,
			jam,
			// Offset dibalik: getTimezoneOffset() mengembalikan menit UTC dikurangi lokal.
			offsetMenit: -new Date().getTimezoneOffset()
		}
	});
	return true;
}

export async function berhentiBerlangganan(): Promise<void> {
	const reg = await registrasiSW();
	const sub = await reg?.pushManager.getSubscription();
	if (sub) {
		await api<void>(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' });
		await sub.unsubscribe();
	} else {
		await api<void>('/api/push', { method: 'DELETE' });
	}
}

export const kirimUji = () => api<{ terkirim: number }>('/api/push', { method: 'PUT' });
