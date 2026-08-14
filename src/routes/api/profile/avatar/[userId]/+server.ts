import type { RequestHandler } from '@sveltejs/kit';
import { handler } from '$lib/server/problem.ts';
import { blob } from '$lib/server/blob.ts';

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const { userId } = event.params;
		if (!userId || !RE_UUID.test(userId)) {
			return new Response(null, { status: 404 });
		}
		const bytes = await blob.get(`avatar/${userId.slice(0, 2)}/${userId}.img`);
		return new Response(new Uint8Array(bytes), {
			headers: {
				'content-type': 'image/webp',
				'cache-control': 'public, max-age=300, s-maxage=86400',
				'x-content-type-options': 'nosniff'
			}
		});
	});
