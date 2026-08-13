import { pgTable, uuid, text, timestamp, jsonb, bigserial, index } from 'drizzle-orm/pg-core';
import { users } from './users.ts';

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		action: text('action').notNull(),
		deviceId: uuid('device_id'),
		ipHash: text('ip_hash'),
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('idx_audit_user').on(t.userId, t.createdAt)]
);

export const emailTokens = pgTable('email_tokens', {
	tokenHash: text('token_hash').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	purpose: text('purpose').notNull(),
	code: text('code'),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true })
});

export const pushSubscriptions = pgTable('push_subscriptions', {
	endpoint: text('endpoint').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type AuditLog = typeof auditLogs.$inferSelect;
