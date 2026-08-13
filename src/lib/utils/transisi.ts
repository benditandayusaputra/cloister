import { browser } from '$app/environment';

type StartViewTransition = (cb: () => void | Promise<void>) => { finished: Promise<void> };

/** View Transitions kalau ada, crossfade biasa kalau tidak. */
export function pindah(aksi: () => void | Promise<void>) {
	if (!browser) return void aksi();
	const doc = document as Document & { startViewTransition?: StartViewTransition };
	const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!doc.startViewTransition || kurangiGerak) return void aksi();
	doc.startViewTransition(aksi);
}
