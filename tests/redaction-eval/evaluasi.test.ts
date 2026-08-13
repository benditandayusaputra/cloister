/**
 * Evaluasi Penyaring Identitas terhadap dataset 200 kalimat.
 *
 * Ambang yang kami tetapkan sendiri (PRD 13.7):
 *   - recall lapis 1 di atas 90% pada kalimat ber-PII
 *   - presisi keseluruhan di atas 85%
 *
 * Tes ini sengaja gagal kalau angkanya turun, supaya klaim di README, di
 * `docs/REDACTION.md`, dan di slide presentasi tidak pernah menjadi angka
 * yang ditulis sekali lalu dilupakan.
 */

import { describe, expect, it } from 'vitest';
import { BER_PII, BERSIH } from './dataset.ts';
import { pindaiPola } from '$lib/redact/pola.ts';
import { pindai } from '$lib/redact/mesin.ts';

describe('lapis 1 — pola terstruktur', () => {
	it('recall di atas 90% pada kalimat ber-PII', () => {
		let kena = 0;
		const lolos: string[] = [];

		for (const c of BER_PII) {
			const temuan = pindaiPola(c.teks);
			if (temuan.length > 0) kena++;
			else lolos.push(c.teks);
		}

		const recall = kena / BER_PII.length;
		// Dicetak supaya angkanya terlihat di keluaran CI dan bisa disalin ke docs.
		console.log(
			`[penyaring] recall lapis 1: ${(recall * 100).toFixed(1)}% (${kena}/${BER_PII.length})`
		);
		if (lolos.length) console.log('[penyaring] terlewat:', lolos.slice(0, 8));

		expect(recall).toBeGreaterThan(0.9);
	});

	it('menemukan jenis yang diharapkan, bukan sekadar menemukan sesuatu', () => {
		let cocok = 0;
		let total = 0;

		for (const c of BER_PII) {
			if (!c.harap?.length) continue;
			const jenis = new Set(pindaiPola(c.teks).map((t) => t.jenis));
			for (const h of c.harap) {
				total++;
				if (jenis.has(h as never)) cocok++;
			}
		}

		const akurasi = cocok / total;
		console.log(`[penyaring] jenis tepat: ${(akurasi * 100).toFixed(1)}% (${cocok}/${total})`);
		expect(akurasi).toBeGreaterThan(0.85);
	});

	it('tidak menandai kalimat bersih', () => {
		const positifPalsu = BERSIH.filter((c) => pindaiPola(c.teks).length > 0);

		const presisi = (BERSIH.length - positifPalsu.length) / BERSIH.length;
		console.log(
			`[penyaring] kalimat bersih yang lolos: ${(presisi * 100).toFixed(1)}% (${BERSIH.length - positifPalsu.length}/${BERSIH.length})`
		);
		if (positifPalsu.length) {
			console.log(
				'[penyaring] positif palsu lapis 1:',
				positifPalsu.map((c) => c.teks).slice(0, 8)
			);
		}

		expect(presisi).toBeGreaterThan(0.95);
	});
});

describe('skor paparan', () => {
	it('kalimat bersih tidak pernah masuk kategori merah', () => {
		const merah = BERSIH.filter((c) => pindai(c.teks).kategori === 'sebaiknya-disunting');
		if (merah.length) console.log('[penyaring] bersih tapi merah:', merah.map((c) => c.teks));
		expect(merah).toHaveLength(0);
	});

	it('NIK dan nomor rekening selalu mendorong ke kategori merah', () => {
		const berat = BER_PII.filter((c) =>
			c.harap?.some((h) => h === 'nik' || h === 'rekening' || h === 'kartu-kredit' || h === 'npwp')
		);
		expect(berat.length).toBeGreaterThan(10);

		for (const c of berat) {
			const h = pindai(c.teks);
			expect(h.kategori, `"${c.teks}" seharusnya merah, skornya ${h.skor}`).toBe(
				'sebaiknya-disunting'
			);
		}
	});
});

describe('lapis 2 — pengenal entitas', () => {
	it('tidak memindahkan kalimat bersih ke kategori merah', () => {
		// Lapis 2 menebak, jadi kontribusinya dibatasi lewat pengali keyakinan.
		// Yang diuji di sini bukan seberapa pintar ia, melainkan bahwa ia tidak
		// merusak pengalaman untuk catatan yang sebenarnya aman.
		const naik = BERSIH.filter((c) => {
			const tanpa = pindai(c.teks, { entitas: false });
			const dengan = pindai(c.teks, { entitas: true });
			return tanpa.kategori !== 'sebaiknya-disunting' && dengan.kategori === 'sebaiknya-disunting';
		});
		expect(naik).toHaveLength(0);
	});

	it('mengenali nama setelah sapaan', () => {
		const temuan = pindai('Tadi sore aku ketemu Mbak Rina di depan kos.').temuan;
		expect(temuan.some((t) => t.jenis === 'orang' && t.teks.includes('Rina'))).toBe(true);
	});

	it('mengenali nama tempat yang ada di leksikon', () => {
		const temuan = pindai('Minggu depan aku ke Yogyakarta naik kereta pagi.').temuan;
		expect(temuan.some((t) => t.jenis === 'tempat')).toBe(true);
	});
});
