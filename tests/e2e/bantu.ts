import type { Page } from '@playwright/test';

export async function isiKodeGambar(page: Page) {
	const isian = page.locator('.kode .isian');
	await isian.waitFor({ state: 'visible', timeout: 20_000 });
	await isian.fill('TES12');
}
