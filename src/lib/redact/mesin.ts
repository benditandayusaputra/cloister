/**
 * Mesin Penyaring Identitas: menggabungkan dua lapis dan menghitung skor.
 *
 * File ini murni dan sinkron supaya bisa dipakai tiga tempat sekaligus:
 * di Web Worker (jalur normal), langsung di thread utama (cadangan kalau
 * worker gagal dibuat), dan di Vitest (evaluasi 200 kalimat).
 */

import { pindaiPola } from './pola.ts';
import { pindaiEntitas } from './entitas.ts';
import { rakitHasil } from './skor.ts';
import type { HasilPindai, Temuan } from './tipe.ts';

export interface OpsiPindai {
	/** Matikan lapis 2 (saklar permanen di Pengaturan → Publik). */
	entitas?: boolean;
}

/** Lapis 1 selalu menang saat rentangnya bertabrakan dengan lapis 2. */
function gabung(pola: Temuan[], entitas: Temuan[]): Temuan[] {
	const bersih = entitas.filter(
		(e) => !pola.some((p) => e.mulai < p.selesai && p.mulai < e.selesai)
	);
	return [...pola, ...bersih].sort((a, b) => a.mulai - b.mulai);
}

export function pindai(teks: string, opsi: OpsiPindai = {}): HasilPindai {
	const pakaiEntitas = opsi.entitas !== false;
	const mulai = Date.now();

	const pola = pindaiPola(teks);
	const entitas = pakaiEntitas ? pindaiEntitas(teks) : [];

	return rakitHasil(gabung(pola, entitas), pakaiEntitas, Date.now() - mulai);
}

/* ------------------------------------------------------------------ *
 * Protokol worker
 * ------------------------------------------------------------------ */

export interface PermintaanSaring {
	id: number;
	teks: string;
	entitas: boolean;
}

export interface JawabanSaring {
	id: number;
	ok: boolean;
	hasil?: HasilPindai;
	error?: string;
}
