import type { PosisiKartu } from './tata-letak.ts';

export type Arah = 'kiri' | 'kanan' | 'atas' | 'bawah';

const ARAH: Record<string, Arah> = {
	ArrowLeft: 'kiri',
	ArrowRight: 'kanan',
	ArrowUp: 'atas',
	ArrowDown: 'bawah'
};

export const arahDariTombol = (key: string): Arah | null => ARAH[key] ?? null;

/**
 * Kartu terdekat ke arah tertentu: jarak sepanjang sumbu utama ditambah
 * penalti simpangan, supaya panah terasa mengikuti tata letak papan.
 */
export function kartuBerikutnya(
	kartu: PosisiKartu[],
	dariId: string,
	arah: Arah
): string | null {
	const asal = kartu.find((c) => c.entri.id === dariId);
	if (!asal) return kartu[0]?.entri.id ?? null;

	let terbaik: { id: string; skor: number } | null = null;

	for (const c of kartu) {
		if (c.entri.id === dariId) continue;
		const dx = c.cx - asal.cx;
		const dy = c.cy - asal.cy;

		const searah =
			(arah === 'kiri' && dx < -1) ||
			(arah === 'kanan' && dx > 1) ||
			(arah === 'atas' && dy < -1) ||
			(arah === 'bawah' && dy > 1);
		if (!searah) continue;

		const utama = arah === 'kiri' || arah === 'kanan' ? Math.abs(dx) : Math.abs(dy);
		const simpangan = arah === 'kiri' || arah === 'kanan' ? Math.abs(dy) : Math.abs(dx);
		const skor = utama + simpangan * 2;

		if (!terbaik || skor < terbaik.skor) terbaik = { id: c.entri.id, skor };
	}

	return terbaik?.id ?? null;
}

export function kartuUjung(kartu: PosisiKartu[], ujung: 'awal' | 'akhir'): string | null {
	const list = ujung === 'awal' ? kartu : [...kartu].reverse();
	return list[0]?.entri.id ?? null;
}
