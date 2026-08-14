/**
 * Pipeline markdown yang aman dari XSS, dipakai satu-satunya `{@html}` di
 * aplikasi (lewat `AmanMarkdown.svelte`).
 *
 * Diekstrak ke modul sendiri supaya bisa diuji langsung di Vitest — klaim
 * "aman dari XSS" harus punya tes yang menembakkan payload sungguhan ke
 * fungsi yang sama persis dengan yang dipakai komponen, bukan tiruannya.
 */

import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sabuk ketiga: DOMPurify punya pengecualian bawaan yang mengizinkan `data:`
 * URI pada `<img>` meskipun tidak lolos `ALLOWED_URI_REGEXP` (DATA_URI_TAGS).
 * Markdown catatan tidak pernah butuh gambar `data:` — gambar sah datang dari
 * `blob:` (lampiran terdekripsi), `https:`, atau path relatif — jadi hook ini
 * mencabut src yang tidak masuk ketiganya.
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	if (node.tagName === 'IMG') {
		const src = node.getAttribute('src') ?? '';
		if (!/^(?:https?:|blob:|\/(?!\/))/i.test(src)) node.removeAttribute('src');
	}
});

const ALLOWED_TAGS = [
	'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'del', 'blockquote',
	'ul', 'ol', 'li', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

/**
 * Ubah markdown menjadi HTML yang sudah disanitasi.
 *
 * Lapisan pertahanannya, berurutan:
 * 1. `marked` meng-escape teks; atribut berbahaya tidak pernah lahir dari sini.
 * 2. DOMPurify dengan allowlist tag dan atribut yang ketat.
 * 3. Allowlist skema URI: hanya https/http/mailto/anchor/path relatif/blob.
 *    `javascript:`, `data:`, dan skema internal `lampiran:` tidak lolos —
 *    yang terakhir memang harus diresolusi jadi `blob:` dulu lewat
 *    `resolusiLampiran` sebelum masuk ke sini.
 * 4. Tag dan atribut event dilarang eksplisit sebagai sabuk kedua.
 */
export function renderAman(md: string): string {
	const raw = marked.parse(md ?? '', { async: false, gfm: true, breaks: true });
	return DOMPurify.sanitize(raw, {
		ALLOWED_TAGS,
		ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'rel', 'target'],
		ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/(?!\/)|blob:)/i,
		FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input'],
		FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick']
	}).replace(
		/<a\s+href="(https?:\/\/[^"]+)"/gi,
		'<a href="$1" rel="noopener noreferrer nofollow" target="_blank"'
	);
}

/* ------------------------------------------------------------------ *
 * Gambar lampiran di dalam teks
 * ------------------------------------------------------------------ */

/**
 * Sintaks penempatan gambar: `![teks alternatif](lampiran:<uuid>)`.
 *
 * `lampiran:` adalah skema internal yang tidak pernah menyentuh DOM. Sebelum
 * dirender, ia ditukar dengan blob URL hasil dekripsi lampiran — dan hanya
 * untuk id yang benar-benar ada di peta `urls`, yang dibangun dari daftar
 * lampiran milik catatan itu sendiri. Konsekuensinya:
 *
 * - Referensi ke lampiran catatan lain tidak pernah teresolusi; skemanya
 *   tetap `lampiran:` dan DOMPurify membuang atribut `src`-nya.
 * - Blob URL dibuat oleh kode kita dari bytes terdekripsi, bukan dari input
 *   pengguna, jadi substitusi ini tidak membuka jalur injeksi baru.
 */
const RE_LAMPIRAN = /(!\[[^\]\n]*\]\()lampiran:([0-9a-fA-F-]{36})(\))/g;

export function resolusiLampiran(md: string, urls: Record<string, string>): string {
	return (md ?? '').replace(RE_LAMPIRAN, (utuh, buka: string, id: string, tutup: string) => {
		const url = urls[id];
		// Hanya blob URL yang boleh masuk; apa pun selain itu dibiarkan mentah
		// supaya jatuh ke sanitasi (src dibuang, alt tetap tampil).
		if (!url || !url.startsWith('blob:')) return utuh;
		return `${buka}${url}${tutup}`;
	});
}

/** Apakah lampiran dengan id ini dirujuk di dalam badan tulisan? */
export function dirujukDiBadan(md: string, id: string): boolean {
	return (md ?? '').includes(`](lampiran:${id})`);
}

/**
 * Buang seluruh referensi gambar lampiran dari markdown.
 *
 * Dipakai alur terbit: halaman publik tidak bisa (dan tidak boleh) membuka
 * lampiran terenkripsi, jadi salinan publiknya bersih dari referensi yang
 * pasti patah. Teks alternatifnya ikut dibuang — ia menjelaskan gambar yang
 * tidak ada.
 */
export function buangLampiranPrivat(md: string): string {
	return (md ?? '')
		.replace(/!\[[^\]\n]*\]\(lampiran:[0-9a-fA-F-]{36}\)/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
