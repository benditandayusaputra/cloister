import type { Action } from 'svelte/action';

export const reveal: Action<HTMLElement, { tunda?: number } | undefined> = (node, opsi) => {
	const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)').matches;
	node.classList.add('reveal');
	if (opsi?.tunda) node.style.setProperty('--tunda', `${opsi.tunda}ms`);

	if (kurangiGerak || !('IntersectionObserver' in window)) {
		node.classList.add('tampak');
		return;
	}

	const tampil = () => {
		node.classList.add('tampak');
		io.disconnect();
		clearTimeout(pengaman);
	};

	const io = new IntersectionObserver(
		(entri) => {
			for (const e of entri) if (e.isIntersecting) tampil();
		},
		{ rootMargin: '0px 0px 12% 0px', threshold: 0 }
	);
	io.observe(node);

	const pengaman = setTimeout(() => {
		const r = node.getBoundingClientRect();
		if (r.top < innerHeight && r.bottom > 0) tampil();
	}, 900);

	return {
		destroy() {
			io.disconnect();
			clearTimeout(pengaman);
		}
	};
};
