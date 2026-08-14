import type { Action } from 'svelte/action';

export const reveal: Action<HTMLElement, { tunda?: number } | undefined> = (node, opsi) => {
	const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
	node.classList.add('reveal');
	if (opsi?.tunda) node.style.setProperty('--tunda', `${opsi.tunda}ms`);

	if (kurangiGerak || !('IntersectionObserver' in window)) {
		node.classList.add('tampak');
		return;
	}

	const io = new IntersectionObserver(
		(entri) => {
			for (const e of entri) {
				if (e.isIntersecting) {
					node.classList.add('tampak');
					io.disconnect();
				}
			}
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
	);
	io.observe(node);

	return {
		destroy() {
			io.disconnect();
		}
	};
};
