import { pantau } from '$lib/bukti/pantau.svelte.ts';

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly title: string,
		detail: string,
		readonly body: Record<string, unknown> = {}
	) {
		super(detail || title);
	}
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export const tokenStore = {
	get: () => accessToken,
	set: (t: string | null) => {
		accessToken = t;
	}
};

async function doRefresh(): Promise<boolean> {
	if (!refreshing) {
		refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
			.then(async (r) => {
				if (!r.ok) return false;
				const data = (await r.json()) as { accessToken: string };
				accessToken = data.accessToken;
				return true;
			})
			.catch(() => false)
			.finally(() => {
				refreshing = null;
			});
	}
	return refreshing;
}

interface Options extends Omit<RequestInit, 'body'> {
	body?: unknown;
	auth?: boolean;
	raw?: boolean;
	retried?: boolean;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
	const { body, auth = true, raw = false, retried = false, ...rest } = opts;
	const headers = new Headers(rest.headers);
	const isForm = body instanceof FormData;
	if (body !== undefined && !isForm) headers.set('content-type', 'application/json');
	if (auth && accessToken) headers.set('authorization', `Bearer ${accessToken}`);

	const payload = body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body);

	// Dicatat sebelum dikirim, bukan sesudah, supaya yang terhitung benar-benar
	// yang masuk ke jaringan. Halaman /bukti membaca rekaman ini.
	if (typeof payload === 'string') pantau.catat(rest.method ?? 'GET', path, payload);

	const res = await fetch(path, {
		...rest,
		headers,
		credentials: 'same-origin',
		body: payload
	});

	if (res.status === 401 && auth && !retried && (await doRefresh())) {
		return api<T>(path, { ...opts, retried: true });
	}

	if (res.status === 204) return undefined as T;
	if (raw) return res as unknown as T;

	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok && res.status !== 409) {
		throw new ApiError(
			res.status,
			(data.title as string) ?? 'Permintaan gagal',
			(data.detail as string) ?? '',
			data
		);
	}
	return data as T;
}

export const ensureFreshToken = doRefresh;
