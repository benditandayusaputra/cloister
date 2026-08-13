import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema/index.ts';

const url = env.DATABASE_URL ?? 'postgres://localhost:5432/cloister';

const client = postgres(url, { max: 5, prepare: false, onnotice: () => {} });

export const db = drizzle(client, { schema });
export { schema };
export * from './schema/index.ts';
