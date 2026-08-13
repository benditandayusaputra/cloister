import { env } from '$env/dynamic/private';
import { CFG } from './env.ts';
import { tooMany } from './problem.ts';

/** Hanya untuk pengembangan dan E2E. Di produksi nilai ini diabaikan. */
const NONAKTIF = env.RATELIMIT_DISABLED === '1' && !import.meta.env.PROD;
if (NONAKTIF) console.warn('[Cloister] rate limit dimatikan — jangan pernah dipakai di produksi');

export interface Limit {
	limit: number;
	windowSec: number;
}

export const LIMITS = {
	login: { limit: 5, windowSec: 60 },
	loginEmail: { limit: 10, windowSec: 3600 },
	register: { limit: 3, windowSec: 3600 },
	params: { limit: 20, windowSec: 60 },
	recover: { limit: 5, windowSec: 3600 },
	push: { limit: 60, windowSec: 60 },
	publishHour: { limit: 5, windowSec: 3600 },
	publishDay: { limit: 20, windowSec: 86400 },
	report: { limit: 10, windowSec: 3600 },
	react: { limit: 60, windowSec: 3600 },
	presign: { limit: 60, windowSec: 3600 },
	bukti: { limit: 30, windowSec: 60 }
} satisfies Record<string, Limit>;

interface Bucket {
	hits: number[];
}
const memory = new Map<string, Bucket>();

async function redisIncr(key: string, windowSec: number): Promise<number | null> {
	if (!CFG.redisUrl || !CFG.redisToken) return null;
	try {
		const res = await fetch(`${CFG.redisUrl}/pipeline`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${CFG.redisToken}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify([
				['INCR', key],
				['EXPIRE', key, String(windowSec), 'NX']
			])
		});
		if (!res.ok) return null;
		const out = (await res.json()) as Array<{ result: number }>;
		return out[0]?.result ?? null;
	} catch {
		return null;
	}
}

function memoryHit(key: string, l: Limit): number {
	const now = Date.now();
	const from = now - l.windowSec * 1000;
	const b = memory.get(key) ?? { hits: [] };
	b.hits = b.hits.filter((t) => t > from);
	b.hits.push(now);
	memory.set(key, b);
	if (memory.size > 5000) {
		for (const [k, v] of memory) if (v.hits.every((t) => t <= from)) memory.delete(k);
	}
	return b.hits.length;
}

/** Sliding window; Upstash kalau tersedia, memori proses kalau tidak. */
export async function rateLimit(scope: string, id: string, l: Limit): Promise<void> {
	if (NONAKTIF) return;
	const key = `cloister:rl:${scope}:${id}:${Math.floor(Date.now() / (l.windowSec * 1000))}`;
	const count = (await redisIncr(key, l.windowSec)) ?? memoryHit(`${scope}:${id}`, l);
	if (count > l.limit) throw tooMany(l.windowSec);
}

export function clientIp(request: Request, fallback: string): string {
	const fwd = request.headers.get('x-forwarded-for');
	return fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || fallback;
}
