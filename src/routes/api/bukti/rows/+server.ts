/**
 * `GET /api/bukti/rows?entryId=<uuid>`
 *
 * Mengembalikan baris `entries` milik pengguna sendiri **apa adanya**, tanpa
 * transformasi kosmetik. Ini tulang punggung halaman Bukti.
 *
 * Aman karena yang dikembalikan adalah ciphertext milik pemanggil sendiri:
 * server memang tidak punya bentuk lain untuk diberikan. Kalau suatu hari
 * rute ini bisa mengembalikan sesuatu yang terbaca, berarti ada regresi yang
 * jauh lebih besar daripada rute ini.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { db, entries, entryTags } from '$lib/db/server/index.ts';
import { handler, bad, notFound } from '$lib/server/problem.ts';
import { requireAuth } from '$lib/server/auth.ts';
import { rateLimit, LIMITS } from '$lib/server/ratelimit.ts';

const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');

const idSchema = v.pipe(v.string(), v.uuid());

export const GET: RequestHandler = async (event) =>
	handler(async () => {
		const ctx = await requireAuth(event);
		await rateLimit('bukti', ctx.userId, LIMITS.bukti);

		const entryId = event.url.searchParams.get('entryId') ?? '';
		const cek = v.safeParse(idSchema, entryId);
		if (!cek.success) throw bad('entryId wajib berupa UUID');

		const [row] = await db
			.select()
			.from(entries)
			.where(and(eq(entries.id, cek.output), eq(entries.userId, ctx.userId)))
			.limit(1);

		if (!row) throw notFound('Catatan itu belum pernah sampai ke server');

		const tags = await db
			.select({ tagToken: entryTags.tagToken })
			.from(entryTags)
			.where(eq(entryTags.entryId, row.id));

		return json({
			/* Nama kolom sengaja memakai nama aslinya di Postgres, bukan camelCase,
			   supaya juri bisa mencocokkannya langsung dengan `docs/CRYPTOGRAPHY.md`
			   dan dengan `psql`. */
			tabel: 'entries',
			baris: {
				id: row.id,
				user_id: row.userId,
				entry_date: row.entryDate,
				ciphertext: b64(row.ciphertext),
				nonce: b64(row.nonce),
				wrapped_dek: b64(row.wrappedDek),
				dek_nonce: b64(row.dekNonce),
				size_bucket: row.sizeBucket,
				key_version: row.keyVersion,
				schema_version: row.schemaVersion,
				rev: row.rev,
				client_updated_at: row.clientUpdatedAt.toISOString(),
				deleted_at: row.deletedAt?.toISOString() ?? null,
				created_at: row.createdAt.toISOString(),
				updated_at: row.updatedAt.toISOString()
			},
			ukuran: {
				ciphertext_byte: row.ciphertext.length,
				nonce_byte: row.nonce.length,
				wrapped_dek_byte: row.wrappedDek.length,
				dek_nonce_byte: row.dekNonce.length
			},
			/* Token indeks buta, bukan nama tag. Ditampilkan supaya batas yang kami
			   akui sendiri di 11.8 terlihat, bukan disembunyikan. */
			entry_tags: tags.map((t) => t.tagToken),
			kolom_yang_tidak_ada: ['title', 'body', 'content', 'mood', 'tags', 'location', 'weather']
		});
	});
