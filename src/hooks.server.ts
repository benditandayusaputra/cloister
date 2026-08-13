import type { Handle } from '@sveltejs/kit';

const HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'no-referrer',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Resource-Policy': 'same-origin',
	'Permissions-Policy':
		'geolocation=(self), camera=(self), microphone=(self), payment=(), usb=(), interest-cohort=()',
	'X-Frame-Options': 'DENY'
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	for (const [k, v] of Object.entries(HEADERS)) response.headers.set(k, v);
	if (event.url.protocol === 'https:') {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=63072000; includeSubDomains; preload'
		);
	}
	if (event.url.pathname.startsWith('/api') || event.url.pathname.startsWith('/app')) {
		response.headers.set('Cache-Control', 'no-store');
	}

	return response;
};
