export const MIN_PANJANG = 12;

export function skorSandi(s: string): number {
	if (s.length === 0) return 0;
	let skor = Math.min(3, Math.floor(s.length / 5));
	if (/[a-z]/.test(s) && /[A-Z]/.test(s)) skor++;
	if (/\d/.test(s)) skor++;
	if (/[^A-Za-z0-9]/.test(s)) skor++;
	if (s.length < MIN_PANJANG) skor = Math.min(skor, 2);
	return Math.min(5, skor);
}

export const sandiCukup = (s: string) => s.length >= MIN_PANJANG;
