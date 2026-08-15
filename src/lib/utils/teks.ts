import { teksPolos } from './markdown-aman.ts';

export function plainTeks(body: string): string {
	return teksPolos(body).replace(/\s+/g, ' ').trim();
}

export function plainRingkas(body: string, len = 220): string {
	const t = plainTeks(body);
	return t.length <= len ? t : t.slice(0, len).replace(/\s+\S*$/, '') + '…';
}
