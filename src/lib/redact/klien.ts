/**
 * Klien Penyaring Identitas untuk thread utama.
 *
 * Worker dibuat malas: baru saat modal Terbitkan dibuka pertama kali, tidak
 * pernah saat cold start. Kalau pembuatan worker gagal — peramban lama, mode
 * privat yang ketat, atau memori tipis — pemindaian jatuh ke thread utama dan
 * pengguna diberi tahu apa adanya alih-alih fitur diam-diam mati.
 */

import { browser } from '$app/environment';
import { pindai, type JawabanSaring, type PermintaanSaring } from './mesin.ts';
import type { HasilPindai } from './tipe.ts';

type Menunggu = { resolve: (h: HasilPindai) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let gagalWorker = false;
let seq = 0;
const menunggu = new Map<number, Menunggu>();

function siapkan(): Worker | null {
	if (!browser || gagalWorker) return null;
	if (worker) return worker;
	try {
		worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (ev: MessageEvent<JawabanSaring>) => {
			const m = menunggu.get(ev.data.id);
			if (!m) return;
			menunggu.delete(ev.data.id);
			if (ev.data.ok && ev.data.hasil) m.resolve(ev.data.hasil);
			else m.reject(new Error(ev.data.error ?? 'pemindaian gagal'));
		};
		worker.onerror = () => {
			gagalWorker = true;
			for (const m of menunggu.values()) m.reject(new Error('worker penyaring mati'));
			menunggu.clear();
			worker = null;
		};
		return worker;
	} catch {
		gagalWorker = true;
		return null;
	}
}

/** Panggil saat modal Terbitkan dibuka, sebelum pengguna sempat menekan apa pun. */
export function hangatkan(): void {
	siapkan();
}

export interface StatusPenyaring {
	/** `worker` kalau berjalan di thread terpisah, `utama` kalau jatuh ke fallback. */
	mode: 'worker' | 'utama';
}

export function statusPenyaring(): StatusPenyaring {
	return { mode: worker && !gagalWorker ? 'worker' : 'utama' };
}

export function saring(teks: string, entitas = true): Promise<HasilPindai> {
	const w = siapkan();
	if (!w) return Promise.resolve(pindai(teks, { entitas }));

	const id = ++seq;
	return new Promise<HasilPindai>((resolve, reject) => {
		menunggu.set(id, { resolve, reject });
		try {
			w.postMessage({ id, teks, entitas } satisfies PermintaanSaring);
		} catch (err) {
			menunggu.delete(id);
			reject(err as Error);
		}
	}).catch(() => pindai(teks, { entitas }));
}
