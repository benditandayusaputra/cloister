/**
 * Menegakkan janji "AI dipakai untuk melindungi, bukan untuk membaca".
 *
 * Klaim di antarmuka berbunyi: pemindaian berjalan di perangkat, tidak ada teks
 * yang dikirim ke mana pun. Tes ini membuktikannya dua arah:
 *
 * 1. Membaca sumber `src/lib/redact/` dan menolak jalur jaringan apa pun.
 * 2. Menjalankan pemindaian sungguhan dengan `fetch`, `XMLHttpRequest`,
 *    `WebSocket`, dan `navigator.sendBeacon` diganti jebakan yang melempar.
 */

import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pindai } from '$lib/redact/mesin.ts';
import { pindaiPola } from '$lib/redact/pola.ts';
import { pindaiEntitas } from '$lib/redact/entitas.ts';

const DIR = new URL('../../src/lib/redact/', import.meta.url).pathname;

const TERLARANG = [
	'fetch(',
	'XMLHttpRequest',
	'WebSocket',
	'sendBeacon',
	'importScripts',
	'EventSource',
	'navigator.connection',
	'https://',
	'http://'
];

describe('Penyaring Identitas tidak punya jalur jaringan', () => {
	const berkas = readdirSync(DIR).filter((f) => f.endsWith('.ts'));

	it('ada berkas untuk diperiksa', () => {
		expect(berkas.length).toBeGreaterThan(3);
	});

	for (const f of berkas) {
		it(`${f} bersih dari pemanggilan jaringan`, () => {
			const isi = readFileSync(join(DIR, f), 'utf8');
			// Komentar dibuang dulu supaya penjelasan di kepala berkas — yang memang
			// menyebut kenapa model jarak jauh tidak dipakai — tidak ikut tertangkap.
			const kode = isi.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
			for (const t of TERLARANG) {
				expect(kode, `${f} memuat "${t}"`).not.toContain(t);
			}
		});
	}
});

describe('pemindaian berjalan tanpa jaringan sama sekali', () => {
	it('tidak menyentuh fetch, XHR, WebSocket, atau sendBeacon', () => {
		const jebakan = () => {
			throw new Error('Penyaring Identitas mencoba mengakses jaringan');
		};

		const g = globalThis as Record<string, unknown>;
		const asli = {
			fetch: g.fetch,
			XMLHttpRequest: g.XMLHttpRequest,
			WebSocket: g.WebSocket,
			navigator: g.navigator
		};

		g.fetch = vi.fn(jebakan);
		g.XMLHttpRequest = vi.fn(jebakan);
		g.WebSocket = vi.fn(jebakan);
		g.navigator = { sendBeacon: vi.fn(jebakan) };

		try {
			const teks =
				'Kemarin ketemu Mbak Rina di kosnya di Jl. Kaliurang No. 14, Sleman. ' +
				'Dia cerita soal utangnya ke bank, nomor rekeningnya 1234567897 kalau mau transfer. ' +
				'WA dia 081234567890.';

			const hasil = pindai(teks);
			expect(hasil.temuan.length).toBeGreaterThan(3);
			expect(pindaiPola(teks).length).toBeGreaterThan(2);
			expect(pindaiEntitas(teks).length).toBeGreaterThan(0);

			expect(g.fetch).not.toHaveBeenCalled();
			expect(g.XMLHttpRequest).not.toHaveBeenCalled();
			expect(g.WebSocket).not.toHaveBeenCalled();
		} finally {
			g.fetch = asli.fetch;
			g.XMLHttpRequest = asli.XMLHttpRequest;
			g.WebSocket = asli.WebSocket;
			g.navigator = asli.navigator;
		}
	});
});

describe('contoh dari Lampiran C PRD', () => {
	const teks =
		'Kemarin ketemu Rina di kosnya di Jl. Kaliurang No. 14, Sleman. ' +
		'Dia cerita soal utangnya ke bank, nomor rekeningnya 1234567897 kalau mau transfer. ' +
		'WA dia 081234567890.';

	it('menemukan alamat, nomor rekening, dan nomor HP', () => {
		const jenis = new Set(pindaiPola(teks).map((t) => t.jenis));
		expect(jenis.has('alamat')).toBe(true);
		expect(jenis.has('rekening')).toBe(true);
		expect(jenis.has('telepon')).toBe(true);
	});

	it('masuk kategori sebaiknya disunting', () => {
		expect(pindai(teks).kategori).toBe('sebaiknya-disunting');
	});
});
