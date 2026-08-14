import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * PRD 5.4: kontras teks minimal WCAG AA (4.5:1) di semua tema, dan tema yang
 * gagal kontras tidak boleh dirilis. Tes ini membaca token CSS langsung supaya
 * penambahan tema baru ikut terperiksa tanpa perlu mengubah tes.
 */
const css = readFileSync('src/lib/styles/tokens.css', 'utf8');

function blok(pola: RegExp): Record<string, string> {
	const m = pola.exec(css);
	if (!m?.[1]) return {};
	const out: Record<string, string> = {};
	for (const cocok of m[1].matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
		const [, kunci, nilai] = cocok;
		if (kunci && nilai) out[kunci] = nilai.trim();
	}
	return out;
}

const dasar = blok(/:root,\s*\[data-mode='malam'\]\s*\{([\s\S]*?)\n\}/);
const siang = blok(/\[data-mode='siang'\]\s*\{([\s\S]*?)\n\}/);
const permukaanGelap = blok(/\.panel-gelap\s*\{([\s\S]*?)\n\}/);

const TEMA = ['buku-tulis', 'polaroid', 'meja', 'batik', 'kamar-gelap', 'senja', 'terminal'] as const;
const temaToken = Object.fromEntries(
	TEMA.map((t) => [t, blok(new RegExp(`\\[data-theme='${t}'\\]\\s*\\{([\\s\\S]*?)\\n\\}`))])
) as Record<(typeof TEMA)[number], Record<string, string>>;

function luminansi(hex: string): number | null {
	const h = hex.trim().replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
	const kanal = [0, 2, 4].map((i) => {
		const c = parseInt(h.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	return 0.2126 * kanal[0] + 0.7152 * kanal[1] + 0.0722 * kanal[2];
}

function kontras(depan: string, belakang: string): number | null {
	const a = luminansi(depan);
	const b = luminansi(belakang);
	if (a === null || b === null) return null;
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Urutan cascade nyata: dasar, lalu mode, lalu tema (tema muncul terakhir di file). */
function tokenUntuk(tema: string, mode: 'malam' | 'siang'): Record<string, string> {
	return {
		...dasar,
		...(mode === 'siang' ? siang : {}),
		...(tema === 'flanel' ? {} : (temaToken[tema as (typeof TEMA)[number]] ?? {}))
	};
}

const SEMUA_TEMA = ['flanel', ...TEMA];
const MODE = ['malam', 'siang'] as const;
const AA = 4.5;

const PASANGAN: Array<[string, string, string]> = [
	['teks utama di ruangan', '--ink-on-board', '--room-wall'],
	['teks sekunder di ruangan', '--ink-on-board-dim', '--room-wall'],
	['tinta di kertas bone', '--ink', '--paper-bone'],
	['tinta di kertas manila', '--ink', '--paper-manila'],
	['tinta di kertas buram', '--ink', '--paper-buram'],
	['tinta di kertas biru', '--ink', '--paper-biru'],
	['tinta di kertas mawar', '--ink', '--paper-mawar'],
	['tinta lembut di bone', '--ink-soft', '--paper-bone'],
	['tinta lembut di manila', '--ink-soft', '--paper-manila'],
	['tinta lembut di buram', '--ink-soft', '--paper-buram'],
	// Pita peringatan di kertas: dulu ikut mode, jadi tinta terang jatuh ke kertas terang.
	['pita peringatan di bone', '--warn-ink-kertas', '--paper-bone'],
	['pita peringatan di manila', '--warn-ink-kertas', '--paper-manila'],
	['pita peringatan di buram', '--warn-ink-kertas', '--paper-buram'],
	['pita peringatan di dinding', '--warn-ink', '--room-wall'],
	['teks tombol utama', '--accent-ink', '--accent']
];

describe('kontras WCAG AA di semua tema dan mode', () => {
	for (const tema of SEMUA_TEMA) {
		for (const mode of MODE) {
			const t = tokenUntuk(tema, mode);

			for (const [nama, fg, bg] of PASANGAN) {
				it(`${tema} / ${mode}: ${nama}`, () => {
					const r = kontras(t[fg] ?? '', t[bg] ?? '');
					expect(r, `${fg} vs ${bg} tidak bisa dihitung`).not.toBeNull();
					expect(r as number).toBeGreaterThanOrEqual(AA);
				});
			}

			it(`${tema} / ${mode}: teks di permukaan gelap`, () => {
				const gelap = { ...t, ...permukaanGelap };
				for (const kunci of ['--ink-on-board', '--ink-on-board-dim']) {
					const r = kontras(gelap[kunci] ?? '', t['--board-felt'] ?? '');
					expect(r, `${kunci} vs --board-felt`).not.toBeNull();
					expect(r as number, `${kunci} vs --board-felt`).toBeGreaterThanOrEqual(AA);
				}
			});
		}
	}

	it('mode siang memakai tinta gelap, bukan warisan mode malam', () => {
		// Bug yang pernah terjadi: dinding jadi terang tapi tinta tetap terang.
		expect(luminansi(siang['--ink-on-board'] ?? '')).toBeLessThan(0.2);
		expect(luminansi(siang['--room-wall'] ?? '')).toBeGreaterThan(0.4);
	});

	it('permukaan yang selalu gelap membawa tinta terangnya sendiri', () => {
		expect(luminansi(permukaanGelap['--ink-on-board'] ?? '')).toBeGreaterThan(0.4);
		expect(luminansi(permukaanGelap['--ink-on-board-dim'] ?? '')).toBeGreaterThan(0.3);
	});
});
