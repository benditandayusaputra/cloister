import * as v from 'valibot';
import { bad } from './problem.ts';
import { fromB64 } from '$crypto/bytes.ts';
import { BUCKETS } from '$crypto/padding.ts';
import { QUOTA } from './env.ts';

export async function parseBody<S extends v.GenericSchema>(
	request: Request,
	schema: S
): Promise<v.InferOutput<S>> {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		throw bad('Body harus JSON');
	}
	const result = v.safeParse(schema, raw);
	if (!result.success) throw bad(result.issues.map((i) => i.message).join('; '));
	return result.output;
}

export function parseQuery<S extends v.GenericSchema>(url: URL, schema: S): v.InferOutput<S> {
	const result = v.safeParse(schema, Object.fromEntries(url.searchParams));
	if (!result.success) throw bad(result.issues.map((i) => i.message).join('; '));
	return result.output;
}

export const b64 = (maxBytes: number, label: string) =>
	v.pipe(
		v.string(),
		v.regex(/^[A-Za-z0-9+/=]*$/, `${label} harus base64`),
		v.check((s) => fromB64(s).length <= maxBytes, `${label} melebihi ${maxBytes} byte`)
	);

export const b64Exact = (bytes: number, label: string) =>
	v.pipe(
		v.string(),
		v.regex(/^[A-Za-z0-9+/=]*$/, `${label} harus base64`),
		v.check((s) => fromB64(s).length === bytes, `${label} harus tepat ${bytes} byte`)
	);

export const emailSchema = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.email('Alamat email tidak valid'),
	v.maxLength(254)
);

export const kdfSchema = v.object({
	algo: v.literal('argon2id'),
	memKib: v.pipe(v.number(), v.integer(), v.minValue(8192), v.maxValue(262144)),
	time: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)),
	parallel: v.literal(1)
});

export const dateSchema = v.pipe(
	v.string(),
	v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
	v.check((s) => {
		const y = Number(s.slice(0, 4));
		return y >= 1900 && y <= new Date().getFullYear() + 1;
	}, 'Tanggal di luar rentang wajar')
);

export const sizeBucketSchema = v.picklist([...BUCKETS], 'size_bucket tidak dikenal');

export const entryPushSchema = v.pipe(
	v.object({
		id: v.pipe(v.string(), v.uuid('id entri harus UUID')),
		entryDate: dateSchema,
		ciphertext: b64(QUOTA.maxCiphertextBytes, 'ciphertext'),
		nonce: b64Exact(24, 'nonce'),
		wrappedDek: b64Exact(48, 'wrapped_dek'),
		dekNonce: b64Exact(24, 'dek_nonce'),
		sizeBucket: sizeBucketSchema,
		tagTokens: v.pipe(v.array(v.pipe(v.string(), v.maxLength(64))), v.maxLength(32)),
		clientUpdatedAt: v.pipe(v.string(), v.isoTimestamp()),
		baseRev: v.pipe(v.number(), v.integer(), v.minValue(0)),
		deleted: v.optional(v.boolean(), false)
	}),
	v.check(
		(e) => fromB64(e.ciphertext).length === e.sizeBucket + 16,
		'panjang ciphertext tidak konsisten dengan size_bucket'
	)
);

export type EntryPush = v.InferOutput<typeof entryPushSchema>;
