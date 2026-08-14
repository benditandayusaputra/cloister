import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { users, bytea } from './users.ts';

/**
 * Tautan rahasia: server hanya menyimpan ciphertext dan nonce.
 * DEK ada di fragment URL dan tidak pernah dikirim ke server.
 */
export const shareLinks = pgTable(
	'share_links',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		entryId: uuid('entry_id').notNull(),
		ciphertext: bytea('ciphertext').notNull(),
		nonce: bytea('nonce').notNull(),
		sizeBucket: integer('size_bucket').notNull(),
		label: text('label'),
		viewCount: integer('view_count').notNull().default(0),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('idx_share_user').on(t.userId)]
);

export type ShareLink = typeof shareLinks.$inferSelect;
