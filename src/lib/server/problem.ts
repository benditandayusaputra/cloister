import { json } from '@sveltejs/kit';

export interface ProblemInit {
	status: number;
	title: string;
	detail?: string;
	type?: string;
	extra?: Record<string, unknown>;
}

/** Error mengikuti RFC 9457 Problem Details. */
export class Problem extends Error {
	constructor(readonly init: ProblemInit) {
		super(init.detail ?? init.title);
	}
}

export function problemResponse(p: ProblemInit, headers?: HeadersInit): Response {
	return json(
		{
			type: p.type ?? `https://cloister.app/problems/${p.status}`,
			title: p.title,
			status: p.status,
			...(p.detail ? { detail: p.detail } : {}),
			...(p.extra ?? {})
		},
		{ status: p.status, headers: { 'content-type': 'application/problem+json', ...headers } }
	);
}

export const bad = (detail: string) => new Problem({ status: 400, title: 'Permintaan tidak valid', detail });
export const unauthorized = (detail = 'Sesi tidak berlaku') =>
	new Problem({ status: 401, title: 'Belum terautentikasi', detail });
export const forbidden = (detail = 'Tidak diizinkan') =>
	new Problem({ status: 403, title: 'Ditolak', detail });
export const notFound = (detail = 'Tidak ditemukan') =>
	new Problem({ status: 404, title: 'Tidak ditemukan', detail });
export const conflict = (detail: string, extra?: Record<string, unknown>) =>
	new Problem({ status: 409, title: 'Konflik', detail, extra });
export const tooMany = (retryAfter: number) =>
	new Problem({
		status: 429,
		title: 'Terlalu banyak permintaan',
		detail: `Coba lagi dalam ${retryAfter} detik`,
		extra: { retryAfter }
	});
export const tooLarge = (detail: string) =>
	new Problem({ status: 413, title: 'Payload terlalu besar', detail });

export async function handler(fn: () => Promise<Response>): Promise<Response> {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof Problem) return problemResponse(err.init);
		console.error('[api]', err);
		return problemResponse({ status: 500, title: 'Kesalahan server' });
	}
}
