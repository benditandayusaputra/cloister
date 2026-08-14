import { test, expect, type Page } from '@playwright/test';

const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';

async function daftar(page: Page): Promise<{ email: string; frasa: string[] }> {
	const email = `tes-${unik()}@contoh.id`;

	await page.goto('/daftar');
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').nth(0).fill(SANDI);
	await page.locator('input[type="password"]').nth(1).fill(SANDI);
	await page.getByRole('button', { name: 'Mulai menulis' }).click();

	await expect(page.getByTestId('gulungan-frasa')).toBeVisible({ timeout: 90_000 });
	const frasa = await page.getByTestId('frasa-kata').allTextContents();
	expect(frasa).toHaveLength(24);

	await page.getByTestId('gulungan-frasa').evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await page.getByRole('button', { name: 'Lanjut' }).click();

	const uji = page.locator('input[type="text"]');
	for (const [i, n] of [4, 11, 19].entries()) {
		await uji.nth(i).fill(frasa[n - 1] ?? '');
	}
	await page.getByRole('button', { name: 'Selesai' }).click();

	await page.waitForURL(/\/(verifikasi|app)/, { timeout: 120_000 });
	return { email, frasa };
}

async function tulisEntri(page: Page, isi: string, judul = '') {
	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
	if (judul) await page.getByPlaceholder('Judul (opsional)').fill(judul);
	await page.getByLabel('Isi tulisan').fill(isi);
	await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
	await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
}

test('daftar lalu tulis, dan tulisannya muncul di papan', async ({ page }) => {
	await daftar(page);

	const isi = `Hujan dari sore sampai malam ${unik()}`;
	await tulisEntri(page, isi, 'Hari yang panjang');

	await expect(page.getByText('Hari yang panjang').first()).toBeVisible();
	await page.getByTestId('kartu-buka').first().click();
	await expect(page.getByText(isi)).toBeVisible();
});

test('server tidak pernah menerima plaintext entri', async ({ page }) => {
	const rahasia = `rahasia-yang-sangat-pribadi-${unik()}`;
	const badanPush: string[] = [];

	page.on('request', (req) => {
		if (req.url().includes('/api/sync/push') && req.method() === 'POST') {
			badanPush.push(req.postData() ?? '');
		}
	});

	await daftar(page);
	await tulisEntri(page, rahasia);
	await page.waitForTimeout(5000);

	expect(badanPush.length).toBeGreaterThan(0);
	for (const badan of badanPush) {
		expect(badan).not.toContain(rahasia);
		expect(badan).not.toContain('"body"');
		expect(badan).not.toContain('"title"');
		expect(badan).toContain('ciphertext');
		expect(badan).toContain('wrappedDek');
	}
});

test('entri bertahan setelah muat ulang', async ({ page }) => {
	await daftar(page);
	const isi = `catatan tahan muat ulang ${unik()}`;
	await tulisEntri(page, isi);

	await page.reload();
	await expect(page.getByText(isi.slice(0, 24)).first()).toBeVisible({ timeout: 40_000 });
});

test('pencarian lokal menemukan entri', async ({ page }) => {
	await daftar(page);
	const kunci = `kembangsepatu${unik()}`;
	await tulisEntri(page, `Beli ${kunci} di depan pasar.`);

	await page.getByRole('button', { name: 'Cari' }).first().click();
	await page.getByPlaceholder('Cari di semua tulisan').fill(kunci);
	await expect(page.getByText(kunci, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
});

test('tema dan mode bisa diganti', async ({ page }) => {
	await daftar(page);
	await page.goto('/pengaturan/tampilan');

	await page.getByRole('button', { name: /Polaroid/ }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'polaroid');

	const modeAwal = await page.locator('html').getAttribute('data-mode');
	await page.getByRole('button', { name: 'Saklar Malam atau Siang' }).click();
	await expect(page.locator('html')).not.toHaveAttribute('data-mode', modeAwal ?? 'malam');
});

test('ekspor menghasilkan file zip', async ({ page }) => {
	await daftar(page);
	await tulisEntri(page, `isi untuk diekspor ${unik()}`);

	await page.goto('/pengaturan/data');
	const unduhan = page.waitForEvent('download', { timeout: 60_000 });
	await page.getByRole('button', { name: 'Ekspor semua tulisan' }).click();
	const file = await unduhan;
	expect(file.suggestedFilename()).toMatch(/^cloister-export-\d{4}-\d{2}-\d{2}\.zip$/);
});

test('daftar perangkat menampilkan perangkat ini', async ({ page }) => {
	await daftar(page);
	await page.goto('/pengaturan/perangkat');
	await expect(page.getByText('perangkat ini')).toBeVisible({ timeout: 20_000 });
});

test('feed publik bisa dibuka tanpa login', async ({ page }) => {
	await page.goto('/baca');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByText(/119 ext 8/)).toBeVisible();
});

test('halaman aplikasi menolak tamu', async ({ page }) => {
	await page.context().clearCookies();
	await page.goto('/app');
	await page.waitForURL(/\/masuk/, { timeout: 30_000 });
});

test('header keamanan terpasang', async ({ page }) => {
	const res = await page.goto('/');
	const h = res?.headers() ?? {};
	expect(h['x-content-type-options']).toBe('nosniff');
	expect(h['referrer-policy']).toBe('no-referrer');
	expect(h['x-frame-options']).toBe('DENY');
	expect(h['cross-origin-opener-policy']).toBe('same-origin');
});

test('keterangan mood muncul saat kursor menyentuh, dan menetap setelah dipilih', async ({
	page
}) => {
	await daftar(page);
	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);

	const grup = page.getByRole('group', { name: 'Mood' });
	const keterangan = grup.locator('xpath=following-sibling::span[1]');
	await expect(keterangan).toHaveText('Belum dipilih');

	// Menyentuh saja sudah memberi keterangan, tanpa menunggu tooltip browser.
	await grup.getByRole('button', { name: 'Lega' }).hover();
	await expect(keterangan).toHaveText('Lega');

	await grup.getByRole('button', { name: 'Berat' }).hover();
	await expect(keterangan).toHaveText('Berat');

	// Setelah dipilih, keterangannya bertahan walau kursor pergi.
	await grup.getByRole('button', { name: 'Berat' }).click();
	await page.getByLabel('Isi tulisan').hover();
	await expect(keterangan).toHaveText('Berat');
});
