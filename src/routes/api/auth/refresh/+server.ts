import { json, type RequestHandler } from '@sveltejs/kit';
import { handler, unauthorized } from '$lib/server/problem.ts';
import {
	rotateRefresh,
	setRefreshCookie,
	clearRefreshCookie,
	REFRESH_COOKIE,
	assertSameOrigin
} from '$lib/server/auth.ts';
import { clientIp } from '$lib/server/ratelimit.ts';

export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const token = event.cookies.get(REFRESH_COOKIE);
		if (!token) throw unauthorized('Tidak ada refresh token');
		try {
			const s = await rotateRefresh(
				token,
				clientIp(event.request, event.getClientAddress()),
				event.request.headers.get('user-agent') ?? ''
			);
			setRefreshCookie(event.cookies, s.refreshToken);
			return json({ accessToken: s.accessToken });
		} catch (err) {
			clearRefreshCookie(event.cookies);
			throw err;
		}
	});
