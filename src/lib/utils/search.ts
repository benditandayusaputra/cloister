const STOP = new Set(['dan', 'yang', 'di', 'ke', 'dari', 'itu', 'ini', 'the', 'and', 'a', 'to', 'of']);

export function tokenize(text: string): string[] {
	return [
		...new Set(
			text
				.toLowerCase()
				.replace(/[^\p{L}\p{N}\s]/gu, ' ')
				.split(/\s+/)
				.filter((t) => t.length >= 2 && !STOP.has(t))
		)
	];
}

export function highlight(text: string, query: string, len = 160): string {
	const q = query.trim().toLowerCase();
	if (!q) return text.slice(0, len);
	const i = text.toLowerCase().indexOf(q);
	if (i < 0) return text.slice(0, len);
	const start = Math.max(0, i - 40);
	return (start > 0 ? '…' : '') + text.slice(start, start + len);
}
