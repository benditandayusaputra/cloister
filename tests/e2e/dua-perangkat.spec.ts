import { test, expect, type Page, type Browser } from '@playwright/test';

test.describe.configure({ timeout: 180_000 });

const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';

async function halamanBaru(browser: Browser): Promise<Page> {
	const ctx = await browser.newContext({ locale: 'id-ID' });
	return ctx.newPage();
}

async function daftar(page: Page): Promise<{ email: string; frasa: string[] }> {
	const email = `dua-${unik()}@contoh.id`;

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
	await page.waitForURL(/\/(verifikasi|app)/, { timeout: 120_000 });

	return { email, frasa };
}

async function tulis(page: Page, isi: string) {
	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
	await page.getByLabel('Isi tulisan').fill(isi);
	await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
	await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
	// beri kesempatan satu putaran sinkronisasi menyelesaikan push
	await page.waitForTimeout(3000);
}

async function buatKodeTransfer(page: Page): Promise<{ pin: string; kode: string }> {
	await page.goto('/pengaturan/sambungkan');
	await page.getByRole('button', { name: 'Buat kode penyambungan' }).click();
	await expect(page.getByTestId('pin-transfer')).toBeVisible({ timeout: 60_000 });

	const pin = (await page.getByTestId('pin-transfer').innerText()).replace(/\s/g, '');
	await page.getByRole('button', { name: 'Tampilkan kode manual' }).click();
	const kode = (await page.getByTestId('kode-manual').innerText()).trim();
	return { pin, kode };
}

async function masukSampaiSambung(page: Page, email: string) {
	await page.goto('/masuk');
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').fill(SANDI);
	await page.getByRole('button', { name: 'Masuk' }).click();
	await page.waitForURL(/\/sambung/, { timeout: 120_000 });
}

async function isiPin(page: Page, pin: string) {
	for (const [i, d] of pin.split('').entries()) {
		await page.getByLabel(`Angka ke-${i + 1}`).fill(d);
	}
}

test('perangkat kedua menyambung lewat kode dan PIN lalu menarik arsip', async ({ browser }) => {
	const lama = await halamanBaru(browser);
	const baru = await halamanBaru(browser);

	const { email } = await daftar(lama);
	const isi = `tulisan asal perangkat lama ${unik()}`;
	await tulis(lama, isi);

	const { pin, kode } = await buatKodeTransfer(lama);
	expect(pin).toMatch(/^\d{6}$/);
	expect(kode).toContain('cloister://sambung?s=');

	// Sandi benar saja tidak cukup: perangkat baru diarahkan ke penyambungan.
	await masukSampaiSambung(baru, email);

	await baru.getByPlaceholder('cloister://sambung').fill(kode);
	await baru.getByRole('button', { name: 'Pakai kode itu' }).click();
	await expect(baru.getByText('Kode diterima')).toBeVisible();

	await isiPin(baru, pin);
	await baru.getByRole('button', { name: 'Sambungkan' }).click();
	await baru.waitForURL(/\/app/, { timeout: 90_000 });

	// Arsip tertarik dan terbaca di perangkat kedua.
	await baru.goto('/app/linimasa');
	await expect(baru.getByText(isi.slice(0, 24)).first()).toBeVisible({ timeout: 90_000 });

	// Perangkat lama sekarang melihat dua perangkat.
	await lama.goto('/pengaturan/perangkat');
	await expect(lama.getByText('perangkat ini')).toBeVisible({ timeout: 30_000 });
	await expect(lama.getByRole('button', { name: 'Cabut' })).toHaveCount(1);
});

test('PIN salah tidak membuka arsip di perangkat baru', async ({ browser }) => {
	const lama = await halamanBaru(browser);
	const baru = await halamanBaru(browser);

	const { email } = await daftar(lama);
	const { pin, kode } = await buatKodeTransfer(lama);

	await masukSampaiSambung(baru, email);
	await baru.getByPlaceholder('cloister://sambung').fill(kode);
	await baru.getByRole('button', { name: 'Pakai kode itu' }).click();

	const salah = pin === '000000' ? '111111' : '000000';
	await isiPin(baru, salah);
	await baru.getByRole('button', { name: 'Sambungkan' }).click();

	await expect(baru.getByText(/PIN atau kode salah/)).toBeVisible({ timeout: 90_000 });
	expect(baru.url()).toContain('/sambung');
});

test('pemulihan dengan 24 kata membuka arsip di perangkat baru', async ({ browser }) => {
	const lama = await halamanBaru(browser);
	const baru = await halamanBaru(browser);

	const { email, frasa } = await daftar(lama);
	const isi = `dipulihkan lewat frasa ${unik()}`;
	await tulis(lama, isi);

	await baru.goto('/pulih');
	await baru.locator('input[type="email"]').fill(email);

	const kotakKata = baru.locator('input[autocapitalize="none"]');
	for (const [i, kata] of frasa.entries()) await kotakKata.nth(i).fill(kata);

	await baru.locator('input[type="password"]').fill('Sandi-Baru-Cloister-2026!');
	await baru.getByRole('button', { name: 'Buka tulisanku' }).click();

	await baru.waitForURL(/\/app/, { timeout: 150_000 });
	await baru.goto('/app/linimasa');
	await expect(baru.getByText(isi.slice(0, 24)).first()).toBeVisible({ timeout: 90_000 });
});
