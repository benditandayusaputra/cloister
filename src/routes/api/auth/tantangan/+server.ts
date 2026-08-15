import { json, type RequestHandler } from '@sveltejs/kit';
import { handler } from '$lib/server/problem.ts';
import { rateLimit, clientIp } from '$lib/server/ratelimit.ts';
import { buatTantangan } from '$lib/server/captcha.ts';

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ip = clientIp(event.request, event.getClientAddress());
		await rateLimit('tantangan', ip, { limit: 60, windowSec: 60 });
		return json(buatTantangan(), { headers: { 'cache-control': 'no-store' } });
	});
