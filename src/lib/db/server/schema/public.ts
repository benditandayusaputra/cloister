import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	bigint,
	smallint,
	boolean,
	date,
	index,
	uniqueIndex,
	primaryKey
} from 'drizzle-orm/pg-core';
import { users } from './users.ts';
import { entries } from './entries.ts';

export const publicEntries = pgTable(
	'public_entries',
	{
		id: uuid('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		sourceEntryId: uuid('source_entry_id').references(() => entries.id, { onDelete: 'set null' }),

		slug: text('slug').notNull(),
		title: text('title').notNull(),
		bodyMd: text('body_md').notNull(),
		excerpt: text('excerpt').notNull(),
		entryDate: date('entry_date').notNull(),
		mood: smallint('mood'),
		theme: text('theme').notNull().default('flanel'),
		penName: text('pen_name'),
		isAnonymous: boolean('is_anonymous').notNull().default(false),
		visibility: text('visibility').notNull().default('public'),
		shareKeyHint: text('share_key_hint'),

		// Jejak Penyaring Identitas. Disimpan supaya metrik "berapa persen
		// penerbitan yang benar-benar disunting" bisa dihitung tanpa menyentuh
		// isi catatan privat mana pun.
		redactionApplied: boolean('redaction_applied').notNull().default(false),
		exposureScore: smallint('exposure_score'),

		viewCount: bigint('view_count', { mode: 'number' }).notNull().default(0),
		reactionCount: integer('reaction_count').notNull().default(0),
		reportCount: integer('report_count').notNull().default(0),
		moderationState: text('moderation_state').notNull().default('ok'),

		publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('idx_public_slug').on(t.userId, t.slug),
		index('idx_public_feed').on(t.publishedAt)
	]
);

export const publicTags = pgTable(
	'public_tags',
	{
		publicEntryId: uuid('public_entry_id')
			.notNull()
			.references(() => publicEntries.id, { onDelete: 'cascade' }),
		tag: text('tag').notNull()
	},
	(t) => [primaryKey({ columns: [t.publicEntryId, t.tag] }), index('idx_public_tags').on(t.tag)]
);

export const reactions = pgTable(
	'reactions',
	{
		publicEntryId: uuid('public_entry_id')
			.notNull()
			.references(() => publicEntries.id, { onDelete: 'cascade' }),
		actorHash: text('actor_hash').notNull(),
		kind: text('kind').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.publicEntryId, t.actorHash, t.kind] })]
);

export const reports = pgTable(
	'reports',
	{
		id: uuid('id').primaryKey(),
		publicEntryId: uuid('public_entry_id')
			.notNull()
			.references(() => publicEntries.id, { onDelete: 'cascade' }),
		reporterHash: text('reporter_hash').notNull(),
		reason: text('reason').notNull(),
		note: text('note'),
		state: text('state').notNull().default('open'),
		handledBy: uuid('handled_by').references(() => users.id),
		handledAt: timestamp('handled_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('idx_reports_open').on(t.state, t.createdAt)]
);

export type PublicEntry = typeof publicEntries.$inferSelect;
export type Report = typeof reports.$inferSelect;
