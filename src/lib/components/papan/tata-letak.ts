import { geometri } from '$lib/utils/kertas.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';

export const CARD_W = 184;
export const ROW_H = 238;

export interface Kisi {
	W: number;
	cols: number;
	span: number;
	jx: number;
}

export function kisi(lebar: number): Kisi {
	const W = Math.max(320, lebar);
	const cols = Math.max(2, Math.min(5, Math.floor((W + 22) / (CARD_W + 22))));
	const span = cols > 1 ? (W - CARD_W) / (cols - 1) : 0;
	return { W, cols, span, jx: Math.round(Math.max(0, Math.min(10, (span - CARD_W) / 2))) };
}

export interface PosisiKartu {
	entri: LocalEntry;
	x: number;
	y: number;
	cx: number;
	cy: number;
	delay: number;
}

export function tataKartu(entries: LocalEntry[], L: Kisi, reduceMotion: boolean): PosisiKartu[] {
	const clampX = (v: number) => Math.max(0, Math.min(L.W - CARD_W, v));
	return entries.map((entri, i) => {
		const g = geometri(entri.entryDate + entri.id.slice(-4), reduceMotion);
		const col = i % L.cols;
		const row = Math.floor(i / L.cols);
		const x = clampX(col * L.span + (((g.seed >>> 3) % (2 * L.jx + 1)) - L.jx));
		const y = row * ROW_H + (((g.seed >>> 11) % 29) - 14);
		return { entri, x, y, cx: x + CARD_W / 2, cy: y + 102, delay: i < 12 ? i * 45 : 0 };
	});
}

export interface PosisiLubang {
	iso: string;
	day: number;
	x: number;
	y: number;
}

export function tataLubang(kosong: string[], L: Kisi): PosisiLubang[] {
	const cols = Math.max(2, L.cols);
	return kosong.map((iso, i) => {
		const g = geometri(iso, false);
		const col = i % cols;
		const row = Math.floor(i / cols);
		const gutter = col * L.span + CARD_W + Math.max(2, (L.span - CARD_W) / 2) - 22;
		return {
			iso,
			day: Number(iso.slice(8)),
			x: Math.max(0, Math.min(L.W - 44, gutter + (((g.seed >>> 5) % 13) - 6))),
			y: row * ROW_H + 62 + (((g.seed >>> 13) % 121) - 60)
		};
	});
}

export interface Benang {
	d: string;
	len: number;
	delay: number;
}

/** Benang merah antar kartu yang berbagi tag saat hover. */
export function benangTag(kartu: PosisiKartu[], sumberId: string, tag: string): Benang[] {
	const src = kartu.find((c) => c.entri.id === sumberId);
	if (!src) return [];
	return kartu
		.filter((c) => c.entri.id !== sumberId && c.entri.tags.includes(tag))
		.map((c, i) => {
			const dx = c.cx - src.cx;
			const dy = c.cy - src.cy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const mx = (src.cx + c.cx) / 2;
			const my = Math.max(src.cy, c.cy) + dist * 0.16 + 14;
			return {
				d: `M${src.cx} ${src.cy} Q${mx.toFixed(1)} ${my.toFixed(1)} ${c.cx} ${c.cy}`,
				len: Math.round(dist * 1.25),
				delay: i * 40
			};
		});
}

export function tinggiPapan(jumlahKartu: number, jumlahLubang: number, L: Kisi): number {
	const rowsCard = Math.ceil(jumlahKartu / L.cols);
	const rowsHole = Math.ceil(jumlahLubang / Math.max(2, L.cols));
	return Math.max(rowsCard, rowsHole, 1) * ROW_H + 216;
}
