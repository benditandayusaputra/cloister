import { createHash } from 'node:crypto';

export function slugify(title: string): string {
	return (
		title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'tulisan'
	);
}

export function makeSlug(title: string, seed: string): string {
	const short = createHash('sha256').update(seed).digest('base64url').slice(0, 6);
	return `${slugify(title)}-${short}`;
}
