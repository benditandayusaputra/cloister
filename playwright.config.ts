import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 120_000,
	expect: { timeout: 20_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	use: {
		baseURL: process.env.CLOISTER_BASE_URL ?? 'http://localhost:4820',
		locale: 'id-ID',
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: process.env.CLOISTER_BASE_URL
		? undefined
		: {
				command: 'RATELIMIT_DISABLED=1 pnpm dev',
				port: 4820,
				reuseExistingServer: true,
				timeout: 120_000
			}
});
