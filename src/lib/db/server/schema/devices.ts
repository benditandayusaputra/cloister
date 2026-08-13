import { pgTable, uuid, text, timestamp, bigint, smallint, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users, bytea } from './users.ts';

export const devices = pgTable(
	'devices',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		platform: text('platform'),
		registeredVia: text('registered_via').notNull(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
		lastSyncedRev: bigint('last_synced_rev', { mode: 'number' }).notNull().default(0),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('idx_devices_user').on(t.userId)]
);

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'cascade' }),
		refreshTokenHash: text('refresh_token_hash').notNull(),
		familyId: uuid('family_id').notNull(),
		ipHash: text('ip_hash'),
		userAgent: text('user_agent'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		// Diisi saat token dirotasi normal, dipakai untuk masa tenggang anti-false-positive.
		rotatedAt: timestamp('rotated_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('idx_sessions_token').on(t.refreshTokenHash),
		index('idx_sessions_family').on(t.familyId)
	]
);

export const transferSessions = pgTable(
	'transfer_sessions',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		blob: bytea('blob').notNull(),
		nonce: bytea('nonce').notNull(),
		attempts: smallint('attempts').notNull().default(0),
		maxAttempts: smallint('max_attempts').notNull().default(5),
		consumedAt: timestamp('consumed_at', { withTimezone: true }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('idx_transfer_expiry').on(t.expiresAt)]
);

export const webauthnCredentials = pgTable('webauthn_credentials', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	publicKey: bytea('public_key').notNull(),
	counter: bigint('counter', { mode: 'number' }).notNull().default(0),
	transports: text('transports').array(),
	nickname: text('nickname'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true })
});

export type Device = typeof devices.$inferSelect;
export type Session = typeof sessions.$inferSelect;
