import { browser } from '$app/environment';
import { toast } from '$lib/state/toast.svelte.ts';
import { i18n } from '$lib/state/i18n.svelte.ts';

/** Pola prompt, bukan auto-reload: reload paksa saat mengetik itu pengalaman buruk. */
export async function daftarkanSW() {
	if (!browser || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
	try {
		const reg = await navigator.serviceWorker.register('/service-worker.js', { type: 'module' });
		reg.addEventListener('updatefound', () => {
			const baru = reg.installing;
			if (!baru) return;
			baru.addEventListener('statechange', () => {
				if (baru.state === 'installed' && navigator.serviceWorker.controller) {
					toast.show(
						i18n.locale === 'en'
							? 'A new version is ready. Reload when you are done writing.'
							: 'Versi baru siap. Muat ulang kalau sudah selesai menulis.',
						'biasa',
						8000
					);
				}
			});
		});
	} catch {
		// SW opsional; aplikasi tetap jalan tanpa itu
	}
}

/** Minta penyimpanan permanen setelah ada sinyal komitmen (entri ketiga). */
export async function mintaPersistensi(jumlahEntri = 3) {
	if (!browser || !navigator.storage?.persist) return;
	if (await navigator.storage.persisted()) return;
	if (jumlahEntri < 3) return;
	await navigator.storage.persist().catch(() => false);
}

export async function sisaKuota(): Promise<{ dipakai: number; kuota: number } | null> {
	if (!browser || !navigator.storage?.estimate) return null;
	const e = await navigator.storage.estimate();
	return { dipakai: e.usage ?? 0, kuota: e.quota ?? 0 };
}
