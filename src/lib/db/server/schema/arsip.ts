import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { users, bytea } from './users.ts';

/**
 * Brankas kunci lama yang disimpan saat pengguna "mulai dari nol".
 *
 * Tanpa ini, memulai dari nol berarti tulisan lama hilang seketika dan
 * permanen — termasuk kalau yang menekannya ternyata pencuri sandi.
 * Dengan arsip, pemilik akun yang menemukan 24 katanya dalam masa tenggang
 * masih bisa mengambil kembali seluruh tulisannya.
 */
export const keyArchives = pgTable(
	'key_archives',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		keyVersion: integer('key_version').notNull(),

		recoveryWrappedMk: bytea('recovery_wrapped_mk').notNull(),
		recoveryMkNonce: bytea('recovery_mk_nonce').notNull(),
		recoverySalt: bytea('recovery_salt').notNull(),
		recoveryAuthHash: text('recovery_auth_hash'),

		kdfAlgo: text('kdf_algo').notNull(),
		kdfMemKib: integer('kdf_mem_kib').notNull(),
		kdfTime: integer('kdf_time').notNull(),
		kdfParallel: integer('kdf_parallel').notNull(),

		jumlahEntri: integer('jumlah_entri').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		/** Setelah tanggal ini, arsip dan entri lamanya dibuang cron. */
		purgeAfter: timestamp('purge_after', { withTimezone: true }).notNull()
	},
	(t) => [index('idx_arsip_user').on(t.userId), index('idx_arsip_purge').on(t.purgeAfter)]
);

export type KeyArchive = typeof keyArchives.$inferSelect;
