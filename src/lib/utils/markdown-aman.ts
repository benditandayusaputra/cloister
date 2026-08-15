import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
	'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'strong', 'b', 'em', 'i', 'u', 's', 'del', 'sub', 'sup', 'mark',
	'blockquote', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'img', 'span',
	'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
	'input', 'label', 'div', 'figure', 'figcaption'
];

const ALLOWED_ATTR = [
	'href', 'src', 'alt', 'title', 'rel', 'target',
	'type', 'checked', 'disabled',
	'width', 'height', 'colspan', 'rowspan', 'colwidth', 'span',
	'data-rata', 'data-ukuran', 'data-type', 'data-checked', 'class', 'style'
];

const ATTR_NON_URI = [
	'width', 'height', 'colspan', 'rowspan', 'colwidth', 'span',
	'type', 'checked', 'disabled', 'target', 'rel'
];

const RE_SRC_AMAN =
	/^(?:https?:|blob:|\/(?!\/)|data:image\/(?:png|jpe?g|webp|gif|avif|bmp);base64,[A-Za-z0-9+/=]+$)/i;
const RE_LAMPIRAN = /^lampiran:[0-9a-fA-F-]{36}$/;
const RE_URI_TAMPIL = /^(?:https?:|mailto:|#|\/(?!\/)|blob:)/i;
const RE_URI_SIMPAN = /^(?:https?:|mailto:|#|\/(?!\/)|blob:|lampiran:)/i;
const RE_ANGKA = /^\d{1,4}$/;
const RE_COLWIDTH = /^\d{1,4}(,\d{1,4})*$/;
const KELAS_AMAN = new Set(['tabel-bungkus', 'gambar-kaya', 'daftar-centang']);

const DEKLARASI_AMAN: Record<string, RegExp> = {
	'text-align': /^(left|center|right|justify|start|end)$/,
	'font-size': /^(?:[89]|[1-5]\d|6[0-4])px$/,
	width: /^\d{1,4}(px|%)$/,
	'min-width': /^\d{1,4}px$/,
	'max-width': /^\d{1,3}%$/,
	height: /^\d{1,4}px$/
};

function styleAman(nilai: string): boolean {
	const bagian = nilai
		.split(';')
		.map((b) => b.trim())
		.filter(Boolean);
	if (bagian.length === 0 || bagian.length > 4) return false;
	return bagian.every((d) => {
		const i = d.indexOf(':');
		if (i < 0) return false;
		const prop = d.slice(0, i).trim().toLowerCase();
		const val = d.slice(i + 1).trim().toLowerCase();
		const re = DEKLARASI_AMAN[prop];
		return !!re && re.test(val);
	});
}

let modeSimpan = false;

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
	const nama = data.attrName.toLowerCase();
	const nilai = data.attrValue;
	if (nama === 'style') {
		if (styleAman(nilai)) data.forceKeepAttr = true;
		else data.keepAttr = false;
		return;
	}
	if (nama === 'class') {
		const kelas = nilai.split(/\s+/).filter(Boolean);
		if (kelas.length > 0 && kelas.every((k) => KELAS_AMAN.has(k))) data.forceKeepAttr = true;
		else data.keepAttr = false;
	}
});

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	const tag = node.tagName;
	if (tag === 'IMG') {
		const src = node.getAttribute('src') ?? '';
		const bolehLampiran = modeSimpan && RE_LAMPIRAN.test(src);
		if (!RE_SRC_AMAN.test(src) && !bolehLampiran) node.removeAttribute('src');
		for (const a of ['width', 'height']) {
			const v = node.getAttribute(a);
			if (v !== null && !RE_ANGKA.test(v)) node.removeAttribute(a);
		}
		const rata = node.getAttribute('data-rata');
		if (rata !== null && !/^(kiri|tengah|kanan)$/.test(rata)) node.removeAttribute('data-rata');
	}
	if (tag === 'A') {
		const href = node.getAttribute('href') ?? '';
		if (/^https?:\/\//i.test(href)) {
			node.setAttribute('rel', 'noopener noreferrer nofollow');
			node.setAttribute('target', '_blank');
		} else {
			node.removeAttribute('rel');
			node.removeAttribute('target');
		}
	}
	if (tag === 'SPAN') {
		const u = node.getAttribute('data-ukuran');
		if (u !== null && !/^(12|14|16|18|20|24|28|32|40|48)$/.test(u)) node.removeAttribute('data-ukuran');
	}
	if (tag === 'TD' || tag === 'TH') {
		for (const a of ['colspan', 'rowspan']) {
			const v = node.getAttribute(a);
			if (v !== null && !RE_ANGKA.test(v)) node.removeAttribute(a);
		}
		const cw = node.getAttribute('colwidth');
		if (cw !== null && !RE_COLWIDTH.test(cw)) node.removeAttribute('colwidth');
	}
	if (tag === 'COL') {
		const sp = node.getAttribute('span');
		if (sp !== null && !RE_ANGKA.test(sp)) node.removeAttribute('span');
	}
	if (tag === 'INPUT') {
		const dicentang = node.hasAttribute('checked');
		for (const a of [...node.attributes]) node.removeAttribute(a.name);
		node.setAttribute('type', 'checkbox');
		node.setAttribute('disabled', '');
		if (dicentang) node.setAttribute('checked', '');
	}
	if (tag === 'LI') {
		const t = node.getAttribute('data-type');
		if (t !== null && t !== 'taskItem') node.removeAttribute('data-type');
		const c = node.getAttribute('data-checked');
		if (c !== null && c !== 'true' && c !== 'false') node.removeAttribute('data-checked');
	}
	if (tag === 'UL' || tag === 'DIV' || tag === 'FIGURE') {
		const t = node.getAttribute('data-type');
		if (t !== null && t !== 'taskList') node.removeAttribute('data-type');
	}
});

function sanitasi(html: string, simpan: boolean): string {
	modeSimpan = simpan;
	try {
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS,
			ALLOWED_ATTR,
			ADD_URI_SAFE_ATTR: ATTR_NON_URI,
			ALLOWED_URI_REGEXP: simpan ? RE_URI_SIMPAN : RE_URI_TAMPIL,
			FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'base', 'meta', 'link'],
			FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'srcset', 'srcdoc']
		});
	} finally {
		modeSimpan = false;
	}
}

const RE_HTML = /^\s*<(?:p|h[1-6]|ul|ol|table|blockquote|pre|img|div|hr|figure|span|strong|em|a)\b[\s\S]*>/i;

export function adalahHtml(body: string): boolean {
	return RE_HTML.test(body ?? '');
}

export function markdownKeHtml(md: string): string {
	return sanitasi(marked.parse(md ?? '', { async: false, gfm: true, breaks: true }) as string, true);
}

export function bersihkanHtml(html: string): string {
	return sanitasi(html ?? '', true);
}

export function renderAman(body: string): string {
	const raw = adalahHtml(body)
		? body
		: (marked.parse(body ?? '', { async: false, gfm: true, breaks: true }) as string);
	return sanitasi(raw, false);
}

const RE_LAMPIRAN_MD = /(!\[[^\]\n]*\]\()lampiran:([0-9a-fA-F-]{36})(\))/g;
const RE_LAMPIRAN_HTML = /(<img\b[^>]*?\bsrc=")lampiran:([0-9a-fA-F-]{36})(")/gi;

export function resolusiLampiran(body: string, urls: Record<string, string>): string {
	const ganti = (utuh: string, buka: string, id: string, tutup: string) => {
		const url = urls[id];
		if (!url || !url.startsWith('blob:')) return utuh;
		return `${buka}${url}${tutup}`;
	};
	return (body ?? '').replace(RE_LAMPIRAN_MD, ganti).replace(RE_LAMPIRAN_HTML, ganti);
}

export function kembalikanLampiran(html: string, urls: Record<string, string>): string {
	let hasil = html ?? '';
	for (const [id, url] of Object.entries(urls)) {
		if (!url.startsWith('blob:')) continue;
		hasil = hasil.split(`src="${url}"`).join(`src="lampiran:${id}"`);
	}
	return hasil;
}

export function dirujukDiBadan(body: string, id: string): boolean {
	return (body ?? '').includes(`lampiran:${id}`);
}

export function buangRujukan(body: string, id: string): string {
	return (body ?? '')
		.replace(new RegExp(`!\\[[^\\]\\n]*\\]\\(lampiran:${id}\\)\\n?`, 'g'), '')
		.replace(new RegExp(`<img\\b[^>]*\\bsrc="lampiran:${id}"[^>]*>`, 'gi'), '')
		.replace(/\n{3,}/g, '\n\n');
}

export function buangLampiranPrivat(body: string): string {
	return (body ?? '')
		.replace(/!\[[^\]\n]*\]\(lampiran:[0-9a-fA-F-]{36}\)/g, '')
		.replace(/<img\b[^>]*\bsrc="lampiran:[0-9a-fA-F-]{36}"[^>]*>/gi, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

const ENTITAS: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&nbsp;': ' '
};

export function teksPolos(body: string): string {
	const b = body ?? '';
	if (adalahHtml(b)) {
		return b
			.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre)>/gi, '\n')
			.replace(/<[^>]+>/g, ' ')
			.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITAS[m] ?? m)
			.replace(/[ \t]+/g, ' ')
			.replace(/\s*\n\s*/g, '\n')
			.trim();
	}
	return b
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/(^|\n)\s*(?:[-*+]\s+\[[ xX]\]|[-*+]|\d+\.)\s+/g, '$1')
		.replace(/\|/g, ' ')
		.replace(/[#>*_`~]+/g, '')
		.replace(/[ \t]+/g, ' ')
		.trim();
}
