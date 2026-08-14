import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// fileURLToPath, bukan URL#pathname: pathname mengembalikan bentuk ter-encode,
// sehingga alias rusak begitu jalur proyek memuat spasi.
const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	test: {
		include: [
			'tests/unit/**/*.test.ts',
			'tests/crypto-vectors/**/*.test.ts',
			'tests/redaction-eval/**/*.test.ts'
		],
		environment: 'node'
	},
	resolve: {
		alias: {
			'$env/dynamic/private': dir('./tests/stub/env-dynamic-private.ts'),
			'$app/environment': dir('./tests/stub/app-environment.ts'),
			$crypto: dir('./src/lib/crypto'),
			$components: dir('./src/lib/components'),
			$lib: dir('./src/lib')
		}
	}
});
