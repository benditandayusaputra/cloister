import { json, type RequestHandler } from '@sveltejs/kit';
import { eq, and, sum } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db, attachments, entries } from '$lib/db/server/index.ts';
import { handler, bad, tooLarge } from '$lib/server/problem.ts';
import { requireAuth, assertSameOrigin } from '$lib/server/auth.ts';
import { rateLimit, LIMITS } from '$lib/server/ratelimit.ts';
import { blob, blobKey } from '$lib/server/blob.ts';
import { QUOTA } from '$lib/server/env.ts';
import { fromB64 } from '$crypto/bytes.ts';

const MIME_BUCKETS = new Set(['image', 'audio', 'other']);

/** Terima ciphertext lampiran langsung; server tidak pernah lihat plaintext. */
export const POST: RequestHandler = async (event) =>
	handler(async () => {
		assertSameOrigin(event);
		const ctx = await requireAuth(event);
		await rateLimit('presign', ctx.userId, LIMITS.presign);

		const form = await event.request.formData();
		const entryId = String(form.get('entryId') ?? '');
		const mimeBucket = String(form.get('mimeBucket') ?? 'other');
		const nonce = String(form.get('nonce') ?? '');
		const wrappedFileKey = String(form.get('wrappedFileKey') ?? '');
		const fileKeyNonce = String(form.get('fileKeyNonce') ?? '');
		const file = form.get('file');

		if (!(file instanceof File)) throw bad('File terenkripsi hilang');
		if (!MIME_BUCKETS.has(mimeBucket)) throw bad('mimeBucket tidak dikenal');
		if (file.size > QUOTA.maxAttachmentBytes) throw tooLarge('Lampiran melebihi 25 MB');
		if (fromB64(nonce).length !== 24 || fromB64(fileKeyNonce).length !== 24)
			throw bad('nonce harus 24 byte');
		if (fromB64(wrappedFileKey).length !== 48) throw bad('wrapped_file_key harus 48 byte');

		const [entry] = await db
			.select({ id: entries.id })
			.from(entries)
			.where(and(eq(entries.id, entryId), eq(entries.userId, ctx.userId)))
			.limit(1);
		if (!entry) throw bad('Entri tidak ada di server, sinkronkan dulu');

		const [used] = await db
			.select({ total: sum(attachments.sizeBytes) })
			.from(attachments)
			.where(eq(attachments.userId, ctx.userId));
		if (Number(used?.total ?? 0) + file.size > QUOTA.maxAttachmentTotal)
			throw tooLarge('Kuota lampiran 2 GB tercapai');

		const id = uuidv7();
		const key = blobKey(ctx.userId, id);
		await blob.put(key, new Uint8Array(await file.arrayBuffer()));

		await db.insert(attachments).values({
			id,
			entryId,
			userId: ctx.userId,
			blobKey: key,
			nonce: fromB64(nonce),
			wrappedFileKey: fromB64(wrappedFileKey),
			fileKeyNonce: fromB64(fileKeyNonce),
			sizeBytes: file.size,
			mimeBucket
		});

		return json({ id, sizeBytes: file.size }, { status: 201 });
	});
