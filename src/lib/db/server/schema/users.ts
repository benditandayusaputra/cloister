import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	bigint,
	boolean,
	customType
} from 'drizzle-orm/pg-core';

export const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
	dataType: () => 'bytea',
	toDriver: (v) => Buffer.from(v),
	fromDriver: (v) => new Uint8Array(v)
});

export const users = pgTable('users', {
	id: uuid('id').primaryKey(),
	email: text('email').notNull().unique(),
	emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

	authHash: text('auth_hash').notNull(),
	saltUser: bytea('salt_user').notNull(),
	kdfAlgo: text('kdf_algo').notNull().default('argon2id'),
	kdfMemKib: integer('kdf_mem_kib').notNull().default(65536),
	kdfTime: integer('kdf_time').notNull().default(3),
	kdfParallel: integer('kdf_parallel').notNull().default(1),

	wrappedMasterKey: bytea('wrapped_master_key'),
	wrappedMkNonce: bytea('wrapped_mk_nonce'),
	recoveryWrappedMk: bytea('recovery_wrapped_mk').notNull(),
	recoveryMkNonce: bytea('recovery_mk_nonce').notNull(),
	recoverySalt: bytea('recovery_salt').notNull(),
	recoveryAuthHash: text('recovery_auth_hash'),
	recoveryUsedAt: timestamp('recovery_used_at', { withTimezone: true }),
	keyVersion: integer('key_version').notNull().default(1),
	hardenedMode: boolean('hardened_mode').notNull().default(false),

	role: text('role').notNull().default('user'),
	status: text('status').notNull().default('active'),
	syncRev: bigint('sync_rev', { mode: 'number' }).notNull().default(0),

	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp('deleted_at', { withTimezone: true })
});

export const profiles = pgTable('profiles', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	penName: text('pen_name').unique(),
	displayName: text('display_name'),
	bio: text('bio'),
	avatarUrl: text('avatar_url'),
	theme: text('theme').notNull().default('flanel'),
	mode: text('mode').notNull().default('malam'),
	locale: text('locale').notNull().default('id'),
	paranoidTags: boolean('paranoid_tags').notNull().default(false),
	pengingatAktif: boolean('pengingat_aktif').notNull().default(false),
	/** Jam lokal pengguna untuk pengingat, 0-23. */
	pengingatJam: integer('pengingat_jam').notNull().default(21),
	/** Selisih menit dari UTC, dikirim klien supaya cron tahu kapan "jam 21" di sana. */
	pengingatOffset: integer('pengingat_offset').notNull().default(0),
	pengingatTerakhir: timestamp('pengingat_terakhir', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
