/**
 * Uji pipeline markdown terhadap payload XSS sungguhan.
 *
 * Yang diuji adalah fungsi yang sama persis dengan yang dipakai
 * `AmanMarkdown.svelte` — satu-satunya `{@html}` di aplikasi — bukan
 * tiruannya. Kalau tes ini hijau, jalur render catatan aman dari payload
 * yang dicoba di sini; kalau ada payload baru yang lolos, tambahkan ke sini
 * dulu sebagai tes yang gagal, baru perbaiki pipelinenya.
 */

import { describe, expect, it } from 'vitest';
import {
	renderAman,
	resolusiLampiran,
	dirujukDiBadan,
	buangLampiranPrivat
} from '$lib/utils/markdown-aman.ts';

const ID = '01920000-0000-7000-8000-000000000abc';

describe('renderAman menolak vektor XSS', () => {
	const kasus: Array<[string, string]> = [
		['skrip mentah', '<script>alert(1)</script>'],
		['iframe', '<iframe src="https://jahat.example"></iframe>'],
		['object dan embed', '<object data="x"></object><embed src="x">'],
		['form phishing', '<form action="https://jahat.example"><input name="sandi"></form>'],
		['handler event', '<img src="x" onerror="alert(1)">'],
		['javascript: di tautan', '[klik](javascript:alert(1))'],
		['javascript: berkedok spasi', '[klik](java\tscript:alert(1))'],
		['data: di gambar', '![x](data:text/html,<script>alert(1)</script>)'],
		['svg onload', '<svg onload="alert(1)"></svg>'],
		['atribut style', '<p style="background:url(javascript:alert(1))">x</p>'],
		['markdown tautan data:', '[x](data:text/html;base64,PHNjcmlwdD4)']
	];

	for (const [nama, payload] of kasus) {
		it(nama, () => {
			const html = renderAman(payload);
			expect(html).not.toContain('<script');
			expect(html).not.toContain('<iframe');
			expect(html).not.toContain('<object');
			expect(html).not.toContain('<embed');
			expect(html).not.toContain('<form');
			expect(html).not.toContain('onerror');
			expect(html).not.toContain('onload');
			expect(html).not.toContain('javascript:');
			expect(html).not.toContain('data:text/html');
			expect(html).not.toContain('style=');
		});
	}

	it('markdown wajar tetap dirender', () => {
		const html = renderAman('# Judul\n\n**tebal** dan _miring_ dan [tautan](https://contoh.id)');
		expect(html).toContain('<h1>');
		expect(html).toContain('<strong>tebal</strong>');
		expect(html).toContain('<em>miring</em>');
		expect(html).toContain('href="https://contoh.id"');
	});

	it('daftar centang GFM dirender sebagai checkbox mati', () => {
		const html = renderAman('- [x] simpan 24 kata\n- [ ] pasang passkey');
		expect(html).toContain('type="checkbox"');
		expect(html).toContain('disabled');
		expect(html).toContain('checked');
	});

	it('input selain checkbox dipaksa jadi checkbox mati tanpa atribut liar', () => {
		const html = renderAman('<input type="text" name="sandi" onfocus="alert(1)" value="x">');
		expect(html).not.toContain('type="text"');
		expect(html).not.toContain('name=');
		expect(html).not.toContain('value=');
		expect(html).not.toContain('onfocus');
		if (html.includes('<input')) {
			expect(html).toContain('type="checkbox"');
			expect(html).toContain('disabled');
		}
	});

	it('form tetap terlarang meski input diizinkan', () => {
		const html = renderAman('<form action="https://jahat.example"><input></form>');
		expect(html).not.toContain('<form');
		expect(html).not.toContain('action=');
	});

	it('tautan eksternal selalu diberi rel noopener noreferrer nofollow', () => {
		const html = renderAman('[x](https://contoh.id)');
		expect(html).toContain('rel="noopener noreferrer nofollow"');
		expect(html).toContain('target="_blank"');
	});
});

describe('sintaks lampiran: resolusi hanya untuk id yang dikenal', () => {
	it('id di peta diresolusi ke blob URL', () => {
		const md = `sebelum\n\n![senja di jendela](lampiran:${ID})\n\nsesudah`;
		const hasil = resolusiLampiran(md, { [ID]: 'blob:http://localhost/abc' });
		expect(hasil).toContain('](blob:http://localhost/abc)');
		expect(hasil).not.toContain('lampiran:');

		const html = renderAman(hasil);
		expect(html).toContain('src="blob:http://localhost/abc"');
		expect(html).toContain('alt="senja di jendela"');
	});

	it('id yang tidak dikenal tidak diresolusi, dan src-nya dibuang saat render', () => {
		const md = `![curian](lampiran:${ID})`;
		const hasil = resolusiLampiran(md, {}); // peta kosong = bukan lampiran catatan ini
		expect(hasil).toBe(md);

		const html = renderAman(hasil);
		expect(html).not.toContain('lampiran:');
		expect(html).not.toContain('src=');
		expect(html).toContain('alt="curian"'); // alt tetap tampil sebagai keterangan
	});

	it('nilai peta yang bukan blob: ditolak', () => {
		const md = `![x](lampiran:${ID})`;
		// Kalau suatu hari ada bug yang memasukkan URL jahat ke peta, resolusi
		// tetap menolaknya — hanya blob: yang pernah ditukar.
		const hasil = resolusiLampiran(md, { [ID]: 'javascript:alert(1)' });
		expect(hasil).toBe(md);
	});

	it('injeksi lewat teks alternatif tidak menghasilkan atribut', () => {
		const md = `![" onerror="alert(1)](lampiran:${ID})`;
		const html = renderAman(resolusiLampiran(md, { [ID]: 'blob:http://localhost/x' }));
		// Tanda kutipnya harus ter-escape jadi teks (&quot;), bukan menutup
		// atribut alt lalu melahirkan atribut onerror sungguhan. Bentuk yang
		// berbahaya adalah kutip MENTAH diikuti nama atribut event; bentuk yang
		// aman memuat teks yang sama tapi seluruh kutipnya &quot;.
		expect(html).not.toMatch(/"\s+on\w+=/);
		expect(html).not.toMatch(/onerror=["']/);
		expect(html).toContain('&quot;');
	});

	it('teks biasa yang menyebut lampiran: tidak disentuh', () => {
		const md = `catatan soal lampiran:${ID} tanpa sintaks gambar`;
		expect(resolusiLampiran(md, { [ID]: 'blob:http://localhost/x' })).toBe(md);
	});

	it('dirujukDiBadan mendeteksi referensi', () => {
		expect(dirujukDiBadan(`![x](lampiran:${ID})`, ID)).toBe(true);
		expect(dirujukDiBadan('tidak ada gambar', ID)).toBe(false);
	});
});

describe('buangLampiranPrivat untuk salinan publik', () => {
	it('membuang referensi gambar dan merapikan baris kosong', () => {
		const md = `paragraf satu\n\n![foto kos](lampiran:${ID})\n\nparagraf dua`;
		const hasil = buangLampiranPrivat(md);
		expect(hasil).not.toContain('lampiran:');
		expect(hasil).not.toContain('foto kos');
		expect(hasil).toBe('paragraf satu\n\nparagraf dua');
	});

	it('markdown tanpa lampiran tidak berubah isinya', () => {
		const md = 'cuma teks dan ![gambar web](https://contoh.id/a.png)';
		expect(buangLampiranPrivat(md)).toBe(md);
	});
});
