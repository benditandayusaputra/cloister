import { test, expect, type Page } from '@playwright/test';
import { isiKodeGambar } from './bantu.ts';
import { execFileSync } from 'node:child_process';

test.describe.configure({ timeout: 300_000 });

const DB_E2E = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/cloister';
const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';

const sql = (perintah: string) => execFileSync('psql', [DB_E2E, '-c', perintah]);
const sqlNilai = (perintah: string) =>
	execFileSync('psql', [DB_E2E, '-tAc', perintah]).toString().trim();

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

test('komentar, balasan, dan flag Penulis di catatan publik', async ({ page }) => {
	const id = unik();
	const emailPenulis = `kom-a-${id}@contoh.id`;
	const emailPembaca = `kom-b-${id}@contoh.id`;
	const penaPenulis = `penulis${id}`;
	const penaPembaca = `pembaca${id}`;
	const judul = `Catatan Berkomentar ${id}`;

	await daftar(page, emailPenulis);
	sql(`update users set email_verified_at = now() where email = '${emailPenulis}'`);
	sql(`insert into profiles (user_id, pen_name)
	     select id, '${penaPenulis}' from users where email = '${emailPenulis}'
	     on conflict (user_id) do update set pen_name = '${penaPenulis}'`);

	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
	await page.getByPlaceholder('Judul (opsional)').fill(judul);
	await page.getByLabel('Isi tulisan').fill(`Isi catatan untuk diuji komentarnya ${id}.`);
	await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
	await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
	await page.getByTestId('kartu-buka').first().click();
	await page.getByRole('button', { name: 'Terbitkan ke halaman publik' }).click();
	await expect(page.getByText('Penyaring Identitas').first()).toBeVisible({ timeout: 30_000 });
	await page
		.getByText('Saya mengerti tulisan ini keluar dari enkripsi')
		.click({ timeout: 10_000 });
	await page.getByRole('button', { name: 'Terbitkan', exact: true }).click();
	await expect(page.locator('.toast').first()).toContainText(/Terbit/, { timeout: 30_000 });
	sql(`update public_entries set moderation_state = 'ok' where title = '${judul}'`);

	await keluar(page);
	await daftar(page, emailPembaca);
	sql(`insert into profiles (user_id, pen_name)
	     select id, '${penaPembaca}' from users where email = '${emailPembaca}'
	     on conflict (user_id) do update set pen_name = '${penaPembaca}'`);

	const slug = sqlNilai(`select slug from public_entries where title = '${judul}'`);
	await page.goto(`/baca/@${penaPenulis}/${slug}`);
	await expect(page.getByLabel('Isi komentar')).toBeVisible({ timeout: 30_000 });

	await page.getByLabel('Isi komentar').fill(`Komentar pertama dari pembaca ${id}.`);
	await page.getByRole('button', { name: 'Kirim komentar' }).click();
	await expect(page.getByText(`Komentar pertama dari pembaca ${id}.`)).toBeVisible({
		timeout: 20_000
	});
	await expect(page.getByText(`@${penaPembaca}`).first()).toBeVisible();

	await keluar(page);
	await page.locator('input[type="email"]').fill(emailPenulis);
	await page.locator('input[type="password"]').fill(SANDI);
	await isiKodeGambar(page);
	await page.getByRole('button', { name: 'Masuk' }).click();
	await page.waitForURL(/\/app/, { timeout: 120_000 });

	await page.goto(`/baca/@${penaPenulis}/${slug}`);
	await expect(page.getByRole('button', { name: 'Balas' }).first()).toBeVisible({
		timeout: 30_000
	});
	await page.getByRole('button', { name: 'Balas' }).first().click();
	await page.getByLabel('Isi komentar').fill(`Terima kasih! Balasan dari penulis ${id}.`);
	await page.getByRole('button', { name: 'Kirim balasan' }).click();

	await expect(page.getByText(`Terima kasih! Balasan dari penulis ${id}.`)).toBeVisible({
		timeout: 20_000
	});
	await expect(page.getByText('Penulis', { exact: true })).toBeVisible();
});
