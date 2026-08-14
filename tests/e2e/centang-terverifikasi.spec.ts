import { test, expect, type Page, type Browser } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const DB_E2E = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/cloister';

test.describe.configure({ timeout: 240_000 });

const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';

function sql(perintah: string) {
	execFileSync('psql', [DB_E2E, '-c', perintah]);
}

async function halamanBaru(browser: Browser): Promise<Page> {
	const ctx = await browser.newContext({ locale: 'id-ID' });
	return ctx.newPage();
}

async function daftar(page: Page): Promise<string> {
	const email = `centang-${unik()}@contoh.id`;
	await page.goto('/daftar');
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').nth(0).fill(SANDI);
	await page.locator('input[type="password"]').nth(1).fill(SANDI);
	await page.getByRole('button', { name: 'Mulai menulis' }).click();

	await expect(page.getByTestId('gulungan-frasa')).toBeVisible({ timeout: 90_000 });
	const frasa = await page.getByTestId('frasa-kata').allTextContents();
	await page.getByTestId('gulungan-frasa').evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await page.getByRole('button', { name: 'Lanjut' }).click();
	const uji = page.locator('input[type="text"]');
	for (const [i, n] of [4, 11, 19].entries()) await uji.nth(i).fill(frasa[n - 1] ?? '');
	await page.getByRole('button', { name: 'Selesai' }).click();
	await page.waitForURL(/\/app/, { timeout: 120_000 });
	return email;
}

test('centang biru hanya muncul setelah email diverifikasi', async ({ browser }) => {
	const page = await halamanBaru(browser);
	const email = await daftar(page);

	await page.goto('/pengaturan/akun');
	await expect(page.getByText('email belum diverifikasi · opsional')).toBeVisible({
		timeout: 30_000
	});
	await expect(page.getByRole('img', { name: 'Email terverifikasi' })).toHaveCount(0);

	sql(`update users set email_verified_at = now() where email = '${email}'`);

	await page.reload();
	await expect(page.getByText('email terverifikasi')).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole('img', { name: 'Email terverifikasi' }).first()).toBeVisible();
});

/** Terbitkan langsung lewat SQL: yang diuji di sini render halaman publiknya. */
function terbitkan(email: string, pena: string, judul: string) {
	sql(`
		insert into profiles (user_id, pen_name)
		select id, '${pena}' from users where email = '${email}'
		on conflict (user_id) do update set pen_name = '${pena}';

		insert into public_entries (id, user_id, slug, title, body_md, excerpt, entry_date, pen_name)
		select gen_random_uuid(), id, 'uji-${pena}', '${judul}', 'Isi tulisan.', 'Isi tulisan.',
		       current_date, '${pena}'
		from users where email = '${email}';
	`);
}

test('halaman publik membawa centang penulis yang terverifikasi', async ({ browser }) => {
	const page = await halamanBaru(browser);
	const email = await daftar(page);
	const pena = `pena_${unik()}`;
	terbitkan(email, pena, `Tulisan ${unik()}`);

	const pembaca = await halamanBaru(browser);
	await pembaca.goto(`/baca/@${pena}`);
	await expect(pembaca.getByRole('heading', { name: pena })).toBeVisible({ timeout: 30_000 });
	await expect(pembaca.getByRole('img', { name: 'Email terverifikasi' })).toHaveCount(0);

	// Feed dipakai bersama penulis lain, jadi periksa kartu penulis ini saja.
	const kartu = pembaca.locator('article', { hasText: pena });
	await pembaca.goto('/baca');
	await expect(kartu.first()).toBeVisible({ timeout: 30_000 });
	await expect(kartu.first().getByRole('img', { name: 'Email terverifikasi' })).toHaveCount(0);

	sql(`update users set email_verified_at = now() where email = '${email}'`);

	await pembaca.goto(`/baca/@${pena}`);
	await expect(pembaca.getByRole('img', { name: 'Email terverifikasi' }).first()).toBeVisible({
		timeout: 30_000
	});

	await pembaca.goto('/baca');
	await expect(kartu.first().getByRole('img', { name: 'Email terverifikasi' })).toHaveCount(1, {
		timeout: 30_000
	});
});
