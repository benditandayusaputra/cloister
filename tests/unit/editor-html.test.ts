import { describe, expect, it } from 'vitest';
import {
	adalahHtml,
	bersihkanHtml,
	buangLampiranPrivat,
	buangRujukan,
	kembalikanLampiran,
	markdownKeHtml,
	renderAman,
	resolusiLampiran,
	teksPolos
} from '$lib/utils/markdown-aman.ts';
import { terapkanKeHtml } from '$lib/redact/sunting.ts';

const ID = '01920000-0000-7000-8000-000000000abc';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('badan HTML: vektor XSS ditolak', () => {
	const kasus: Array<[string, string, RegExp]> = [
		['onerror pada gambar', `<p><img src="${PNG}" onerror="alert(1)"></p>`, /onerror/i],
		['skrip di tengah paragraf', '<p>halo<script>alert(1)</script></p>', /<script/i],
		['javascript: pada tautan', '<p><a href="javascript:alert(1)">klik</a></p>', /javascript:/i],
		['data:text/html pada tautan', '<p><a href="data:text/html;base64,PHNjcmlwdD4=">x</a></p>', /data:text/i],
		['svg base64 pada gambar', '<p><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="></p>', /svg\+xml/i],
		['data:text/html pada gambar', '<p><img src="data:text/html,<script>alert(1)</script>"></p>', /data:text/i],
		['style dengan url()', '<p style="background:url(javascript:alert(1))">x</p>', /style=/i],
		['style dengan position', '<p style="position:fixed;top:0">x</p>', /position/i],
		['style dengan expression', '<span style="width:expression(alert(1))">x</span>', /expression/i],
		['iframe', '<p><iframe src="https://jahat.example"></iframe></p>', /<iframe/i],
		['form', '<form action="https://jahat.example"><input name="sandi"></form>', /<form/i],
		['handler pada sel tabel', '<table><tr><td onclick="alert(1)">x</td></tr></table>', /onclick/i],
		['kelas sembarang', '<p class="ProseMirror-widget jahat">x</p>', /class=/i],
		['srcset', `<p><img src="${PNG}" srcset="x 1x"></p>`, /srcset/i],
		['meta refresh', '<meta http-equiv="refresh" content="0;url=https://jahat.example">', /<meta/i],
		['base href', '<base href="https://jahat.example/">', /<base/i]
	];

	for (const [nama, payload, larangan] of kasus) {
		it(`tampilan: ${nama}`, () => {
			expect(renderAman(payload)).not.toMatch(larangan);
		});
		it(`penyimpanan: ${nama}`, () => {
			expect(bersihkanHtml(payload)).not.toMatch(larangan);
		});
	}

	it('gambar dengan src tak dikenal kehilangan src-nya, bukan lolos', () => {
		expect(renderAman('<p><img src="ftp://x/y.png" alt="a"></p>')).not.toContain('src=');
		expect(renderAman('<p><img src="lampiran:bukan-uuid"></p>')).not.toContain('src=');
	});
});

describe('badan HTML: format yang sah dipertahankan', () => {
	it('heading H1–H6, gaya, dan ukuran huruf', () => {
		const html =
			'<h1>Satu</h1><h2>Dua</h2><h3>Tiga</h3><h4>Empat</h4><h5>Lima</h5><h6>Enam</h6>' +
			'<p><strong>tebal</strong> <em>miring</em> <u>garis</u> <s>coret</s> <code>kode</code> ' +
			'<span data-ukuran="24">besar</span></p>';
		const hasil = renderAman(html);
		for (const t of ['<h1>', '<h2>', '<h3>', '<h4>', '<h5>', '<h6>', '<strong>', '<em>', '<u>', '<s>', '<code>']) {
			expect(hasil).toContain(t);
		}
		expect(hasil).toContain('data-ukuran="24"');
	});

	it('ukuran huruf di luar daftar dibuang', () => {
		expect(renderAman('<p><span data-ukuran="999">x</span></p>')).not.toContain('data-ukuran');
		expect(renderAman('<p><span data-ukuran="12px">x</span></p>')).not.toContain('data-ukuran');
	});

	it('gambar base64 raster dengan lebar, tinggi, dan perataan', () => {
		const html = `<p><img src="${PNG}" alt="uji" width="320" height="200" data-rata="tengah"></p>`;
		const hasil = renderAman(html);
		expect(hasil).toContain(`src="${PNG}"`);
		expect(hasil).toContain('width="320"');
		expect(hasil).toContain('height="200"');
		expect(hasil).toContain('data-rata="tengah"');
	});

	it('lebar tidak numerik dan perataan tak dikenal dibuang', () => {
		const hasil = renderAman(`<p><img src="${PNG}" width="100%" data-rata="atas"></p>`);
		expect(hasil).not.toContain('width=');
		expect(hasil).not.toContain('data-rata');
	});

	it('gambar webp, jpeg, gif, avif diterima', () => {
		for (const m of ['webp', 'jpeg', 'gif', 'avif']) {
			expect(renderAman(`<p><img src="data:image/${m};base64,AAAA"></p>`)).toContain(`data:image/${m}`);
		}
	});

	it('perataan teks lewat style text-align', () => {
		const hasil = renderAman('<p style="text-align: center">tengah</p><h2 style="text-align:right">kanan</h2>');
		expect(hasil).toContain('text-align: center');
		expect(hasil).toContain('text-align:right');
	});

	it('tabel dengan colspan, colwidth, dan colgroup', () => {
		const html =
			'<table style="min-width: 150px"><colgroup><col style="min-width: 25px"><col style="width: 120px"></colgroup>' +
			'<tbody><tr><th colspan="2" colwidth="120,30">Judul</th></tr><tr><td>a</td><td rowspan="1">b</td></tr></tbody></table>';
		const hasil = renderAman(html);
		expect(hasil).toContain('colspan="2"');
		expect(hasil).toContain('colwidth="120,30"');
		expect(hasil).toContain('<colgroup>');
		expect(hasil).toContain('min-width: 25px');
	});

	it('daftar centang: input dipaksa checkbox nonaktif', () => {
		const html =
			'<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="text" name="x" checked="checked"><span></span></label><div><p>selesai</p></div></li></ul>';
		const hasil = renderAman(html);
		expect(hasil).toContain('data-type="taskList"');
		expect(hasil).toContain('data-checked="true"');
		expect(hasil).toContain('type="checkbox"');
		expect(hasil).toContain('disabled');
		expect(hasil).toContain('checked');
		expect(hasil).not.toContain('name=');
	});

	it('tautan luar mendapat rel dan target aman', () => {
		const hasil = renderAman('<p><a href="https://contoh.id/x" target="_top">x</a></p>');
		expect(hasil).toContain('rel="noopener noreferrer nofollow"');
		expect(hasil).toContain('target="_blank"');
		expect(hasil).not.toContain('_top');
	});
});

describe('lampiran terenkripsi di badan HTML', () => {
	const html = `<p>foto:</p><img src="lampiran:${ID}" alt="senja">`;

	it('mode simpan mempertahankan skema lampiran:', () => {
		expect(bersihkanHtml(html)).toContain(`src="lampiran:${ID}"`);
	});

	it('mode tampilan membuang src yang belum diresolusi', () => {
		expect(renderAman(html)).not.toContain('lampiran:');
	});

	it('resolusi ke blob dan kembali', () => {
		const urls = { [ID]: 'blob:http://localhost/abc' };
		const diresolusi = resolusiLampiran(html, urls);
		expect(diresolusi).toContain('src="blob:http://localhost/abc"');
		expect(kembalikanLampiran(diresolusi, urls)).toBe(html);
	});

	it('resolusi menolak url non-blob', () => {
		expect(resolusiLampiran(html, { [ID]: 'https://jahat.example/x.png' })).toBe(html);
	});

	it('buangRujukan menghapus tag img yang merujuk id', () => {
		expect(buangRujukan(html, ID)).not.toContain('<img');
	});

	it('salinan publik tidak membawa lampiran privat tapi tetap membawa base64', () => {
		const badan = `${html}<p><img src="${PNG}"></p>`;
		const publik = buangLampiranPrivat(badan);
		expect(publik).not.toContain('lampiran:');
		expect(publik).toContain(PNG);
	});
});

describe('deteksi format dan konversi', () => {
	it('adalahHtml membedakan markdown dan HTML', () => {
		expect(adalahHtml('# Judul\n\nteks')).toBe(false);
		expect(adalahHtml('<p>teks</p>')).toBe(true);
		expect(adalahHtml('  <h2>Judul</h2>')).toBe(true);
		expect(adalahHtml('')).toBe(false);
	});

	it('markdown lama dikonversi ke HTML tersanitasi', () => {
		const hasil = markdownKeHtml(`# Judul\n\n**tebal** dan ![foto](lampiran:${ID})\n\n<script>alert(1)</script>`);
		expect(hasil).toContain('<h1>Judul</h1>');
		expect(hasil).toContain('<strong>tebal</strong>');
		expect(hasil).toContain(`src="lampiran:${ID}"`);
		expect(hasil).not.toContain('<script');
	});

	it('teksPolos membuang tag, base64, dan entitas', () => {
		const t = teksPolos(`<h1>Judul</h1><p>Tom &amp; Jerry<br>baris</p><img src="${PNG}"><table><tr><td>sel</td></tr></table>`);
		expect(t).toContain('Judul');
		expect(t).toContain('Tom & Jerry');
		expect(t).toContain('sel');
		expect(t).not.toContain('base64');
		expect(t).not.toContain('<');
	});
});

describe('penyuntingan identitas pada HTML', () => {
	it('mengganti teks di dalam simpul teks tanpa merusak markup', () => {
		const html = '<p>Bertemu <strong>Rina Kartika</strong> di Jl. Kaliurang No. 14.</p>';
		const temuan = [
			{ id: 't1', jenis: 'orang', teks: 'Rina Kartika', mulai: 8, selesai: 20, skor: 0.9, sumber: 'ner' },
			{ id: 't2', jenis: 'alamat', teks: 'Jl. Kaliurang No. 14', mulai: 24, selesai: 44, skor: 0.9, sumber: 'regex' }
		] as unknown as Parameters<typeof terapkanKeHtml>[1];
		const hasil = terapkanKeHtml(html, temuan, [
			{ temuanId: 't1', tindakan: 'inisial' },
			{ temuanId: 't2', tindakan: 'generik' }
		]);
		expect(hasil).toContain('<strong>R.K.</strong>');
		expect(hasil).toContain('sebuah alamat');
		expect(hasil).not.toContain('Kaliurang');
	});

	it('teks berbahaya di temuan tidak menjadi markup', () => {
		const html = '<p>kontak: budi@contoh.id</p>';
		const temuan = [
			{ id: 't1', jenis: 'email', teks: 'budi@contoh.id', mulai: 8, selesai: 22, skor: 1, sumber: 'regex' }
		] as unknown as Parameters<typeof terapkanKeHtml>[1];
		const hasil = terapkanKeHtml(html, temuan, [{ temuanId: 't1', tindakan: 'sensor' }]);
		expect(hasil).toMatch(/<p>kontak: █+<\/p>/);
	});
});
