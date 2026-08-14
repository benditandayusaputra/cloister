import type { Config } from 'drizzle-kit';

export default {
	schema: './src/lib/db/server/schema/*.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? 'postgres://localhost:5432/cloister'
	}
} satisfies Config;
