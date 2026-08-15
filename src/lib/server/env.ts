import { env } from '$env/dynamic/private';

function need(name: string, fallback: string): string {
	const v = env[name];
	if (v && v.length > 0) return v;
	if (import.meta.env.PROD) throw new Error(`env ${name} wajib diisi di produksi`);
	return fallback;
}

export const CFG = {
	authPepper: need('SERVER_AUTH_PEPPER', 'dev-pepper'),
	saltHmac: need('SALT_HMAC_SECRET', 'dev-salt-hmac'),
	ipHmac: need('IP_HMAC_SECRET', 'dev-ip-hmac'),
	jwtSecret: need('JWT_SECRET', 'dev-jwt-secret-panjang-sekali-untuk-hs256'),
	resendKey: env.RESEND_API_KEY ?? '',
	mailFrom: env.MAIL_FROM ?? 'Cloister <no-reply@cloister.local>',
	blobToken: env.BLOB_READ_WRITE_TOKEN ?? '',
	blobDir: env.BLOB_LOCAL_DIR ?? '.blobstore',
	redisUrl: env.UPSTASH_REDIS_REST_URL ?? '',
	redisToken: env.UPSTASH_REDIS_REST_TOKEN ?? '',
	readOrigin: env.PUBLIC_READ_ORIGIN ?? '',
	demoEmail: env.DEMO_EMAIL ?? 'benditandayusaputra@gmail.com'
};

export const QUOTA = {
	maxEntries: 20_000,
	maxCiphertextBytes: 1_048_576 + 16,
	maxAttachmentBytes: 25 * 1024 * 1024,
	maxAttachmentTotal: 2 * 1024 * 1024 * 1024,
	pushBatch: 100,
	pullLimit: 200
};
