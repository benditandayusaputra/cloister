import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

const ALLOWED_TAGS = [
	'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'del', 'blockquote',
	'ul', 'ol', 'li', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'rel', 'target'];

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(md: string): string {
	const html = marked.parse(md, { async: false });
	const clean = DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/(?!\/))/i,
		FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input'],
		FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick']
	});
	return clean.replace(
		/<a\s+href="(https?:\/\/[^"]+)"/gi,
		'<a href="$1" rel="noopener noreferrer nofollow" target="_blank"'
	);
}

/** Markdown mentah yang sudah dibersihkan sebelum disimpan sebagai catatan publik. */
export function sanitizeMarkdown(md: string): string {
	return md.replace(/<\/?(script|iframe|object|embed|form|style)[^>]*>/gi, '').slice(0, 200_000);
}

export function plainText(md: string): string {
	return md
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[#>*_`~-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function excerptOf(md: string, len = 220): string {
	const t = plainText(md);
	return t.length <= len ? t : t.slice(0, len).replace(/\s+\S*$/, '') + '…';
}
