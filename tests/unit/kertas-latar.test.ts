import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('src/app.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function berkasSvelte(dir: string): string[] {
	const out: string[] = [];
	for (const nama of readdirSync(dir)) {
		const p = join(dir, nama);
		if (statSync(p).isDirectory()) out.push(...berkasSvelte(p));
		else if (nama.endsWith('.svelte')) out.push(p);
	}
	return out;
}

/** Kelas apa saja yang pernah dipasang berbarengan dengan .kertas. */
function kelasPendampingKertas(): Set<string> {
	const hasil = new Set<string>();
	for (const berkas of berkasSvelte('src')) {
		const isi = readFileSync(berkas, 'utf8');
		for (const m of isi.matchAll(/(?:class|kelas)=["']([^"'{}]*\bkertas\b[^"'{}]*)["']/g)) {
			for (const k of (m[1] ?? '').split(/\s+/)) if (k && k !== 'kertas') hasil.add(k);
		}
		// <Kertas kelas="…"> memasang kelasnya ke elemen yang sama dengan .kertas.
		for (const m of isi.matchAll(/<Kertas\b[^>]*\bkelas=["']([^"']+)["']/g)) {
			for (const k of (m[1] ?? '').split(/\s+/)) if (k) hasil.add(k);
		}
	}
	return hasil;
}

function aturan(kelas: string): string[] {
	// (?![\w-]) supaya .kertas tidak ikut menangkap .kertas-mawar.
	const re = new RegExp(`\\.${kelas}(?![\\w-])[^{}]*\\{([^}]*)\\}`, 'g');
	return [...css.matchAll(re)].map((m) => m[1] ?? '');
}

describe('kelas yang menempel di .kertas tidak boleh menghapus kertasnya', () => {
	const kelas = kelasPendampingKertas();

	it('menemukan kelas pendamping untuk diperiksa', () => {
		expect(kelas.size).toBeGreaterThan(0);
	});

	// Shorthand `background` mereset background-image, jadi tekstur dan warna
	// kertas hilang dan tinta gelap jatuh langsung ke papan yang juga gelap.
	for (const k of kelasPendampingKertas()) {
		it(`.${k} tidak memakai shorthand background`, () => {
			for (const isi of aturan(k)) {
				expect(isi, `.${k} { ${isi.trim()} }`).not.toMatch(/(^|;)\s*background\s*:/);
			}
		});
	}
});
