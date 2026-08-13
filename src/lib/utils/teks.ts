export function plainTeks(md: string): string {
	return md
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[#>*_`~]+/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function plainRingkas(md: string, len = 220): string {
	const t = plainTeks(md);
	return t.length <= len ? t : t.slice(0, len).replace(/\s+\S*$/, '') + '…';
}
