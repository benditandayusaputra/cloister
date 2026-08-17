import { test, expect, type Page } from '@playwright/test';
import { isiKodeGambar } from './bantu.ts';
import { execFileSync } from 'node:child_process';

test.describe.configure({ timeout: 300_000 });

const DB_E2E = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/cloister';
const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);

const entriUser = (email: string) =>
	Number(
		execFileSync('psql', [
			DB_E2E,
			'-tAc',
			`select count(*) from entries e join users u on u.id=e.user_id where u.email='${email}'`
		])
			.toString()
			.trim()
	);

async function daftar(page: Page, email: string) {
	await page.goto('/daftar');
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').nth(0).fill(SANDI);
	await page.locator('input[type="password"]').nth(1).fill(SANDI);
	await page.getByRole('button', { name: 'Mulai menulis' }).click();
	await expect(page.getByTestId('gulungan-frasa')).toBeVisible({ timeout: 120_000 });
	const frasa = await page.getByTestId('frasa-kata').allTextContents();
	await page.getByTestId('gulungan-frasa').evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await page.getByRole('button', { name: 'Lanjut' }).click();
	const uji = page.locator('input[type="text"]');
	for (const [i, n] of [4, 11, 19].entries()) await uji.nth(i).fill(frasa[n - 1] ?? '');
	await isiKodeGambar(page);
	await page.getByRole('button', { name: 'Selesai' }).click();
	await page.waitForURL(/\/(verifikasi|app)/, { timeout: 120_000 });
}

async function keluar(page: Page) {
	await page.goto('/app');
	await page.getByRole('button', { name: /Lewati/ }).click({ timeout: 6000 }).catch(() => {});
	await page.getByRole('button', { name: 'Menu profil' }).click();
	await page.getByRole('menuitem', { name: 'Keluar' }).click();
	await page.waitForURL(/\/masuk/, { timeout: 20_000 });
}

test('ganti akun di perangkat yang sama tidak membocorkan data antar akun', async ({ page }) => {
	const id = unik();
	const emailA = `iso-a-${id}@contoh.id`;
	const emailB = `iso-b-${id}@contoh.id`;
	const penandaA = `RAHASIA-MILIK-A-${id}`;
	const penandaB = `CATATAN-MILIK-B-${id}`;

	await daftar(page, emailA);
	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
	await page.getByLabel('Isi tulisan').fill(`${penandaA}. Dengan gambar sisipan.`);
	await page.locator('input[type="file"][accept="image/*,audio/*"]').setInputFiles({
		name: 'logo.png',
		mimeType: 'image/png',
		buffer: PNG
	});
	await page.getByRole('button', { name: /Sisipkan logo/ }).click({ timeout: 20_000 });
	await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
	await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
	await page.waitForTimeout(8000);
	expect(entriUser(emailA)).toBe(1);

	await page.goto('/bukti');
	await expect(page.locator('.prosa img[src^="blob:"]').first()).toBeVisible({
		timeout: 30_000
	});

	await keluar(page);

	await daftar(page, emailB);
	await page.goto('/app');
	await page.getByRole('button', { name: /Lewati/ }).click({ timeout: 6000 }).catch(() => {});
	await expect(page.getByText(/0 tulisan di \d{4}/i)).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText(penandaA)).toHaveCount(0);

	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
	await page.getByLabel('Isi tulisan').fill(`${penandaB}.`);
	await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
	await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
	await page.waitForTimeout(8000);
	expect(entriUser(emailA)).toBe(1);
	expect(entriUser(emailB)).toBe(1);

	await keluar(page);

	await page.locator('input[type="email"]').fill(emailA);
	await page.locator('input[type="password"]').fill(SANDI);
	await isiKodeGambar(page);
	await page.getByRole('button', { name: 'Masuk' }).click();
	await page.waitForURL(/\/app/, { timeout: 120_000 });
	expect(page.url()).not.toContain('/sambung');
	await page.goto('/app');
	await expect(page.getByText(/1 tulisan di \d{4}/i)).toBeVisible({ timeout: 60_000 });
	await expect(page.getByText(penandaB)).toHaveCount(0);
});
