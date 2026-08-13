import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	bigint,
	date,
	index,
	uniqueIndex,
	primaryKey
} from 'drizzle-orm/pg-core';
import { users, bytea } from './users.ts';

export const entries = pgTable(
	'entries',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		entryDate: date('entry_date').notNull(),
		ciphertext: bytea('ciphertext').notNull(),
		nonce: bytea('nonce').notNull(),
		wrappedDek: bytea('wrapped_dek').notNull(),
		dekNonce: bytea('dek_nonce').notNull(),
		sizeBucket: integer('size_bucket').notNull(),
		keyVersion: integer('key_version').notNull().default(1),
		schemaVersion: integer('schema_version').notNull().default(1),

		rev: bigint('rev', { mode: 'number' }).notNull(),
		clientUpdatedAt: timestamp('client_updated_at', { withTimezone: true }).notNull(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
		/* Diisi saat pengguna mulai dari nol: entri lama disimpan sementara
		   supaya masih bisa dipulihkan kalau 24 katanya ketemu belakangan. */
		archivedAt: timestamp('archived_at', { withTimezone: true }),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('idx_entries_sync').on(t.userId, t.rev),
		index('idx_entries_date').on(t.userId, t.entryDate),
		uniqueIndex('idx_entries_user_rev').on(t.userId, t.rev)
	]
);

export const entryTags = pgTable(
	'entry_tags',
	{
		entryId: uuid('entry_id')
			.notNull()
			.references(() => entries.id, { onDelete: 'cascade' }),
		tagToken: text('tag_token').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.entryId, t.tagToken] }),
		index('idx_entry_tags_token').on(t.tagToken)
	]
);

export const attachments = pgTable(
	'attachments',
	{
		id: uuid('id').primaryKey(),
		entryId: uuid('entry_id')
			.notNull()
			.references(() => entries.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		blobKey: text('blob_key').notNull(),
		nonce: bytea('nonce').notNull(),
		wrappedFileKey: bytea('wrapped_file_key').notNull(),
		fileKeyNonce: bytea('file_key_nonce').notNull(),
		sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
		mimeBucket: text('mime_bucket').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp('deleted_at', { withTimezone: true })
	},
	(t) => [index('idx_attachments_user').on(t.userId)]
);

export type Entry = typeof entries.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
