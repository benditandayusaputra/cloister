import { test, expect, type Page, type Browser } from '@playwright/test';
import { isiKodeGambar } from './bantu.ts';
import { execFileSync } from 'node:child_process';

const DB_E2E = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/cloister';

test.describe.configure({ timeout: 240_000 });

const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';

/** Fixture: tandai email sudah terverifikasi tanpa lewat kotak masuk. */
function tandaiTerverifikasi(email: string) {
	execFileSync('psql', [
		DB_E2E,
		'-c',
		`update users set email_verified_at = now() where email = '${email}'`
	]);
}

/** Tanpa Resend, kode verifikasi hanya ada di database. */
function kodeTerakhir(email: string, purpose: string): string {
	const out = execFileSync(
		'psql',
		[
			DB_E2E,
			'-t',
			'-A',
			'-c',
			`select t.code from email_tokens t join users u on u.id = t.user_id
			 where u.email = '${email}' and t.purpose = '${purpose}' and t.used_at is null
			 order by t.expires_at desc limit 1`
		],
		{ encoding: 'utf8' }
	);
	return out.trim();
}

async function halamanBaru(browser: Browser): Promise<Page> {
	const ctx = await browser.newContext({ locale: 'id-ID' });
	return ctx.newPage();
}

async function daftar(page: Page): Promise<{ email: string; frasa: string[] }> {
	const email = `nol-${unik()}@contoh.id`;
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
	await isiKodeGambar(page);
	await page.getByRole('button', { name: 'Selesai' }).click();
	await page.waitForURL(/\/app/, { timeout: 120_000 });
	return { email, frasa };
}

async function tulis(page: Page, isi: string) {
	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
	await page.getByLabel('Isi tulisan').fill(isi);
	await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
	await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
	await page.waitForTimeout(3000);
}

async function isiKode(page: Page, kode: string) {
	for (const [i, d] of kode.split('').entries()) {
		await page.getByLabel(`Angka ke-${i + 1}`).fill(d);
	}
}

async function mulaiDariNol(page: Page, email: string, terverifikasi = false) {
	await page.goto('/mulai-baru');
	await page.locator('input[type="email"]').fill(email);
	await page.locator('input[type="password"]').fill(SANDI);
	await page.getByLabel('Ketik "MULAI DARI NOL" untuk melanjutkan').fill('MULAI DARI NOL');
	await page.getByRole('button', { name: 'Lanjutkan' }).click();

	if (terverifikasi) {
		await expect(page.getByRole('heading', { name: 'Cek emailmu' })).toBeVisible({ timeout: 60_000 });
		const kode = kodeTerakhir(email, 'start_over');
		expect(kode).toMatch(/^\d{6}$/);
		await isiKode(page, kode);
	} else {
		// Email belum diverifikasi: tidak ada kode, tapi tetap ada klik terakhir.
		await expect(page.getByRole('heading', { name: 'Sekali klik lagi' })).toBeVisible({
			timeout: 60_000
		});
	}

	await page.getByRole('button', { name: 'Mulai dari nol sekarang' }).click();
	await expect(page.getByRole('heading', { name: /Papanmu sudah kosong/ })).toBeVisible({
		timeout: 180_000
	});
}

test('terkunci tanpa 24 kata dan tanpa perangkat lama masih bisa masuk lewat mulai dari nol', async ({
	browser
}) => {
	const lama = await halamanBaru(browser);
	const { email } = await daftar(lama);
	await tulis(lama, `tulisan sebelum mulai dari nol ${unik()}`);

	// Perangkat baru: sandi benar tapi tidak punya kunci, jalan buntu.
	const baru = await halamanBaru(browser);
	await baru.goto('/masuk');
	await baru.locator('input[type="email"]').fill(email);
	await baru.locator('input[type="password"]').fill(SANDI);
	await isiKodeGambar(baru);
	await baru.getByRole('button', { name: 'Masuk' }).click();
	await baru.waitForURL(/\/sambung/, { timeout: 120_000 });

	// Jalan keluar tersedia dari halaman buntu itu.
	await expect(baru.getByRole('link', { name: /Mulai dari nol/ })).toBeVisible();

	await mulaiDariNol(baru, email);

	// Frasa baru diberikan dan papan kosong.
	expect(await baru.getByTestId('frasa-kata').count()).toBe(24);
	await baru.getByRole('button', { name: 'Mulai menulis' }).click();
	await baru.waitForURL(/\/app/, { timeout: 30_000 });

	await baru.goto('/app/linimasa');
	await baru.waitForTimeout(3000);
	await expect(baru.getByText('tulisan sebelum mulai dari nol')).toHaveCount(0);
});

test('email terverifikasi: sandi saja tidak cukup, kode tetap diminta', async ({ browser }) => {
	const lama = await halamanBaru(browser);
	const { email } = await daftar(lama);
	await tulis(lama, `masih utuh ${unik()}`);
	tandaiTerverifikasi(email);

	// Sandi benar, tapi layar berikutnya menuntut kode dari kotak masuk.
	const penyerang = await halamanBaru(browser);
	await penyerang.goto('/mulai-baru');
	await penyerang.locator('input[type="email"]').fill(email);
	await penyerang.locator('input[type="password"]').fill(SANDI);
	await penyerang.getByLabel('Ketik "MULAI DARI NOL" untuk melanjutkan').fill('MULAI DARI NOL');
	await penyerang.getByRole('button', { name: 'Lanjutkan' }).click();

	await expect(penyerang.getByRole('heading', { name: 'Cek emailmu' })).toBeVisible({
		timeout: 60_000
	});
	await isiKode(penyerang, '000000');
	await penyerang.getByRole('button', { name: 'Mulai dari nol sekarang' }).click();
	await expect(penyerang.locator('.toast').last()).toContainText(/Kode tidak cocok/, {
		timeout: 120_000
	});

	// Tulisan lama masih terbaca di perangkat asal.
	await lama.goto('/app/linimasa');
	await lama.waitForTimeout(2000);
	await expect(lama.getByText('masih utuh').first()).toBeVisible({ timeout: 30_000 });
});

test('daftar langsung masuk aplikasi tanpa verifikasi email', async ({ browser }) => {
	const page = await halamanBaru(browser);
	await daftar(page);
	await expect(page).toHaveURL(/\/app/);

	// Menulis jalan penuh walau email belum diverifikasi.
	await tulis(page, `tulisan tanpa verifikasi ${unik()}`);
	await page.goto('/app/linimasa');
	await expect(page.getByText('tulisan tanpa verifikasi').first()).toBeVisible({ timeout: 30_000 });
});

test('arsip lama bisa dipulihkan kalau 24 kata lamanya ketemu', async ({ browser }) => {
	const lama = await halamanBaru(browser);
	const { email, frasa } = await daftar(lama);
	const isi = `tulisan yang dipulihkan dari arsip ${unik()}`;
	await tulis(lama, isi);

	const baru = await halamanBaru(browser);
	await mulaiDariNol(baru, email);
	await baru.getByRole('button', { name: 'Mulai menulis' }).click();
	await baru.waitForURL(/\/app/, { timeout: 30_000 });

	// Arsip muncul di Pengaturan dengan sisa masa tenggang.
	await baru.goto('/pengaturan/data');
	await expect(baru.getByRole('heading', { name: 'Arsip tulisan lama' })).toBeVisible({
		timeout: 30_000
	});
	await expect(baru.getByText(/dibuang dalam \d+ hari/)).toBeVisible();

	await baru.getByRole('button', { name: 'Aku menemukan 24 katanya' }).click();
	const kotak = baru.locator('input[autocapitalize="none"]');
	for (const [i, kata] of frasa.entries()) await kotak.nth(i).fill(kata);
	await baru.getByRole('button', { name: 'Pulihkan tulisan lama' }).click();

	await expect(baru.locator('.toast')).toContainText(/tulisan lama dipulihkan/, {
		timeout: 180_000
	});

	// Tulisan lama kembali terbaca dengan kunci yang baru.
	await baru.goto('/app/linimasa');
	await expect(baru.getByText(isi.slice(0, 24)).first()).toBeVisible({ timeout: 60_000 });
});
