import { desc, eq } from 'drizzle-orm';
import { db, entries, entryTags, users } from '$lib/db/server/index.ts';

export interface BarisBukti {
	tabel: string;
	baris: Record<string, string | number | null>;
	ukuran: Record<string, number>;
	entry_tags: string[];
	kolom_yang_tidak_ada: string[];
}

const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');

export const KOLOM_YANG_TIDAK_ADA = ['title', 'body', 'content', 'mood', 'tags', 'location', 'weather'];

export async function bentukBarisBukti(row: typeof entries.$inferSelect): Promise<BarisBukti> {
	const tags = await db
		.select({ tagToken: entryTags.tagToken })
		.from(entryTags)
		.where(eq(entryTags.entryId, row.id));

	return {
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
		entry_tags: tags.map((t) => t.tagToken),
		kolom_yang_tidak_ada: KOLOM_YANG_TIDAK_ADA
	};
}

export async function contohBarisPublik(
	emailDemo: string
): Promise<{ baris: BarisBukti; totalEntri: number } | null> {
	const [pemilik] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, emailDemo))
		.limit(1);
	if (!pemilik) return null;

	const milik = await db
		.select()
		.from(entries)
		.where(eq(entries.userId, pemilik.id))
		.orderBy(desc(entries.updatedAt))
		.limit(50);
	const hidup = milik.filter((r) => !r.deletedAt);
	const row = hidup[0];
	if (!row) return null;

	return { baris: await bentukBarisBukti(row), totalEntri: hidup.length };
}
