import { renderAman, teksPolos, bersihkanHtml, adalahHtml } from '$lib/utils/markdown-aman.ts';

export function renderMarkdown(body: string): string {
	return renderAman(body);
}

export function sanitizeMarkdown(body: string): string {
	const b = (body ?? '').slice(0, 1_500_000);
	return adalahHtml(b)
		? bersihkanHtml(b)
		: b.replace(/<\/?(script|iframe|object|embed|form|style)[^>]*>/gi, '');
}

export function plainText(body: string): string {
	return teksPolos(body).replace(/\s+/g, ' ').trim();
}

export function excerptOf(body: string, len = 220): string {
	const t = plainText(body);
	return t.length <= len ? t : t.slice(0, len).replace(/\s+\S*$/, '') + '…';
}
