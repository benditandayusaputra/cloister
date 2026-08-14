/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const SHELL = `cloister-shell-${version}`;
const ASET = `cloister-aset-${version}`;
const PUBLIK = `cloister-publik-${version}`;
const LAMPIRAN = 'cloister-lampiran';
const BATAS_LAMPIRAN = 200 * 1024 * 1024;

const PRECACHE = [...build, ...files];

const HALAMAN_SHELL = ['/app', '/'];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(SHELL).then((c) => c.addAll([...PRECACHE, ...HALAMAN_SHELL]))
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith('cloister-') && ![SHELL, ASET, PUBLIK, LAMPIRAN].includes(key)) {
					await caches.delete(key);
				}
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('message', (event) => {
	if (event.data === 'SKIP_WAITING') void sw.skipWaiting();
});

async function cacheFirst(req: Request, nama: string): Promise<Response> {
	const cache = await caches.open(nama);
	const hit = await cache.match(req);
	if (hit) return hit;
	const res = await fetch(req);
	if (res.ok) await cache.put(req, res.clone());
	return res;
}

async function staleWhileRevalidate(req: Request, nama: string): Promise<Response> {
	const cache = await caches.open(nama);
	const hit = await cache.match(req);
	const segar = fetch(req)
		.then((res) => {
			if (res.ok) void cache.put(req, res.clone());
			return res;
		})
		.catch(() => hit ?? Response.error());
	return hit ?? segar;
}

async function pangkasLampiran() {
	const cache = await caches.open(LAMPIRAN);
	const kunci = await cache.keys();
	let total = 0;
	for (const k of kunci) {
		const res = await cache.match(k);
		total += Number(res?.headers.get('content-length') ?? 0);
	}
	let i = 0;
	while (total > BATAS_LAMPIRAN && i < kunci.length) {
		const k = kunci[i++];
		if (!k) break;
		const res = await cache.match(k);
		total -= Number(res?.headers.get('content-length') ?? 0);
		await cache.delete(k);
	}
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== location.origin) return;

	if (url.pathname.startsWith('/api/sync/attachments/')) {
		event.respondWith(
			cacheFirst(request, LAMPIRAN).then((r) => {
				void pangkasLampiran();
				return r;
			})
		);
		return;
	}

	// Sync selalu ke jaringan; kegagalan ditangani mesin sync di klien.
	if (url.pathname.startsWith('/api/sync') || url.pathname.startsWith('/api/auth')) return;

	if (PRECACHE.includes(url.pathname) || url.pathname.startsWith('/fonts/')) {
		event.respondWith(cacheFirst(request, url.pathname.startsWith('/fonts/') ? ASET : SHELL));
		return;
	}

	if (url.pathname.startsWith('/baca')) {
		event.respondWith(staleWhileRevalidate(request, PUBLIK));
		return;
	}

	// Navigasi aplikasi: jaringan dulu, jatuh ke shell saat offline.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => {
				const cache = await caches.open(SHELL);
				return (await cache.match('/app')) ?? (await cache.match('/')) ?? Response.error();
			})
		);
	}
});

interface PayloadPush {
	judul?: string;
	isi?: string;
	url?: string;
}

sw.addEventListener('push', (event) => {
	let m: PayloadPush = {};
	try {
		m = (event.data?.json() ?? {}) as PayloadPush;
	} catch {
		m = { isi: event.data?.text() };
	}
	event.waitUntil(
		sw.registration.showNotification(m.judul || 'Cloister', {
			body: m.isi || 'Waktunya menulis hari ini',
			icon: '/icons/192.png',
			badge: '/icons/192.png',
			tag: 'cloister-pengingat',
			data: { url: m.url || '/app/hari-ini' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const tujuan = (event.notification.data as { url?: string } | undefined)?.url ?? '/app/hari-ini';
	event.waitUntil(
		(async () => {
			// Kalau Cloister sudah terbuka, fokuskan saja alih-alih membuka jendela baru.
			const daftar = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const c of daftar) {
				if (c.url.includes('/app')) {
					await c.focus();
					if ('navigate' in c) await (c as WindowClient).navigate(tujuan).catch(() => null);
					return;
				}
			}
			await sw.clients.openWindow(tujuan);
		})()
	);
});

export {};
