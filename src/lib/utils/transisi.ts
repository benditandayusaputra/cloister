import { browser } from '$app/environment';

type StartViewTransition = (cb: () => void | Promise<void>) => {
	finished: Promise<void>;
	ready: Promise<void>;
	updateCallbackDone: Promise<void>;
};

/** View Transitions kalau ada, crossfade biasa kalau tidak. */
export function pindah(aksi: () => void | Promise<void>) {
	if (!browser) return void aksi();
	const doc = document as Document & { startViewTransition?: StartViewTransition };
	const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!doc.startViewTransition || kurangiGerak) return void aksi();
	const transisi = doc.startViewTransition(aksi);
	transisi.finished.catch(() => {});
	transisi.ready.catch(() => {});
	transisi.updateCallbackDone.catch(() => {});
}
