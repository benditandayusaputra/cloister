export const PAPERS = ['#EDE7D6', '#DCC79B', '#CFC4AC', '#C2D4D8', '#DDB3B0'] as const;

export const PIN_GRADIENT: Record<number, string> = {
	1: 'radial-gradient(circle at 33% 27%, #E6A29D 0%, #B8433C 34%, #8E2F2A 60%, #4E1512 100%)',
	2: 'radial-gradient(circle at 33% 27%, #EBB78E 0%, #C4703F 34%, #A85B32 60%, #5C2E13 100%)',
	3: 'radial-gradient(circle at 33% 27%, #F3DFAA 0%, #D9A845 32%, #C08A2E 58%, #6E4A12 100%)',
	4: 'radial-gradient(circle at 33% 27%, #D4E0A6 0%, #93A85C 34%, #7A8F4A 60%, #3E4A1F 100%)',
	5: 'radial-gradient(circle at 33% 27%, #A9D3AC 0%, #63996A 34%, #4F7F53 60%, #22401F 100%)'
};

export const MOOD_LABEL_ID: Record<number, string> = {
	1: 'Berat',
	2: 'Lelah',
	3: 'Biasa',
	4: 'Baik',
	5: 'Lega'
};

export const MOOD_LABEL_EN: Record<number, string> = {
	1: 'Heavy',
	2: 'Tired',
	3: 'Plain',
	4: 'Good',
	5: 'Relieved'
};

export const pinOf = (mood: number | null): string => PIN_GRADIENT[mood ?? 3] as string;

export const moodLabel = (mood: number | null, locale = 'id'): string =>
	mood === null
		? locale === 'en'
			? 'No mood'
			: 'Tanpa mood'
		: ((locale === 'en' ? MOOD_LABEL_EN : MOOD_LABEL_ID)[mood] as string);

/** FNV-1a: rotasi kartu deterministik dari tanggal, tidak berubah tiap render. */
export function seedFromString(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export interface Geometri {
	seed: number;
	rot: number;
	pinShift: number;
	paper: string;
}

export function geometri(key: string, reduceMotion = false): Geometri {
	const seed = seedFromString(key);
	return {
		seed,
		rot: reduceMotion ? 0 : Number((((seed % 700) / 100) - 3.5).toFixed(2)),
		pinShift: ((seed >>> 9) % 29) - 14,
		paper: PAPERS[(seed >>> 17) % 5] as string
	};
}
