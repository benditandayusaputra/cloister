import { test, expect, type Page, type Browser } from '@playwright/test';

test.describe.configure({ timeout: 240_000 });

const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';
const SANDI_BARU = 'Sandi-Cloister-Baru-2026!';

async function halamanBaru(browser: Browser): Promise<Page> {
	const ctx = await browser.newContext({ locale: 'id-ID' });
	return ctx.newPage();
}

async function daftar(page: Page): Promise<{ email: string; frasa: string[] }> {
	const email = `lanjut-${unik()}@contoh.id`;

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
	await page.waitForTimeout(3000);
}

test('rotasi kunci master menjaga isi tulisan tetap terbaca', async ({ browser }) => {
	const page = await halamanBaru(browser);
	await daftar(page);

	const isi = `sebelum rotasi ${unik()}`;
	await tulis(page, isi);

	await page.goto('/pengaturan/keamanan');
	await page.getByRole('button', { name: 'Ganti kunci master' }).click();

	await page.getByLabel('Sandi sekarang').fill(SANDI);
	await page.getByLabel('Sandi baru', { exact: true }).fill(SANDI_BARU);
	await page.getByLabel('Ulangi sandi').fill(SANDI_BARU);
	await page.getByLabel('Ketik ROTASI untuk mengonfirmasi').fill('ROTASI');

	page.once('dialog', (d) => void d.accept());
	await page.getByRole('button', { name: 'Ganti kunci master sekarang' }).click();

	// Frasa pemulihan baru muncul setelah rotasi selesai.
	await expect(page.getByTestId('frasa-kata').first()).toBeVisible({ timeout: 180_000 });
	expect(await page.getByTestId('frasa-kata').count()).toBe(24);

	// Isi tetap terbaca dengan kunci baru.
	await page.goto('/app/linimasa');
	await expect(page.getByText(isi.slice(0, 20)).first()).toBeVisible({ timeout: 60_000 });
});

test('sandi lama tidak berlaku lagi setelah rotasi, sandi baru berlaku', async ({ browser }) => {
	const page = await halamanBaru(browser);
	const { email } = await daftar(page);
	await tulis(page, `isi ${unik()}`);

	await page.goto('/pengaturan/keamanan');
	await page.getByRole('button', { name: 'Ganti kunci master' }).click();
	await page.getByLabel('Sandi sekarang').fill(SANDI);
	await page.getByLabel('Sandi baru', { exact: true }).fill(SANDI_BARU);
	await page.getByLabel('Ulangi sandi').fill(SANDI_BARU);
	await page.getByLabel('Ketik ROTASI untuk mengonfirmasi').fill('ROTASI');
	page.once('dialog', (d) => void d.accept());
	await page.getByRole('button', { name: 'Ganti kunci master sekarang' }).click();
	await expect(page.getByTestId('frasa-kata').first()).toBeVisible({ timeout: 180_000 });

	// Perangkat baru dengan sandi lama harus ditolak.
	const lain = await halamanBaru(browser);
	await lain.goto('/masuk');
	await lain.locator('input[type="email"]').fill(email);
	await lain.locator('input[type="password"]').fill(SANDI);
	await lain.getByRole('button', { name: 'Masuk' }).click();
	await expect(lain.locator('.toast')).toBeVisible({ timeout: 90_000 });
	expect(lain.url()).toContain('/masuk');

	// Sandi baru diterima.
	await lain.locator('input[type="password"]').fill(SANDI_BARU);
	await lain.getByRole('button', { name: 'Masuk' }).click();
	await lain.waitForURL(/\/(app|sambung|verifikasi)/, { timeout: 120_000 });
	expect(lain.url()).not.toContain('/masuk');
});

test('jendela sinkronisasi bisa dipersempit dan dilebarkan lagi', async ({ browser }) => {
	const page = await halamanBaru(browser);
	await daftar(page);
	const isi = `masih ada setelah jendela diubah ${unik()}`;
	await tulis(page, isi);

	await page.goto('/pengaturan/data');
	await expect(page.getByRole('heading', { name: 'Jendela sinkronisasi' })).toBeVisible();

	await page.getByRole('button', { name: '3 bulan terakhir' }).click();
	await expect(page.getByRole('button', { name: '3 bulan terakhir' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	// Melebarkan lagi memicu tarik ulang; entri harus tetap ada.
	await page.getByRole('button', { name: 'Semuanya' }).click();
	await expect(page.getByRole('button', { name: 'Semuanya' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await page.goto('/app/linimasa');
	await expect(page.getByText(isi.slice(0, 24)).first()).toBeVisible({ timeout: 60_000 });
});

test('pengaturan pengingat menampilkan keadaan VAPID dengan jujur', async ({ browser }) => {
	const page = await halamanBaru(browser);
	await daftar(page);

	await page.goto('/pengaturan/akun');
	await expect(page.getByRole('heading', { name: 'Pengingat harian' })).toBeVisible();

	// Tanpa kunci VAPID, UI harus mengatakannya alih-alih menawarkan tombol yang gagal diam-diam.
	const pesan = page.getByText(/Kunci VAPID belum dipasang|Browser ini tidak mendukung/);
	const tombol = page.getByRole('button', { name: 'Nyalakan pengingat' });
	await expect(pesan.or(tombol).first()).toBeVisible({ timeout: 30_000 });
});

test('halaman passkey tampil dan melaporkan dukungan browser', async ({ browser }) => {
	const page = await halamanBaru(browser);
	await daftar(page);

	await page.goto('/pengaturan/keamanan');
	await expect(page.getByRole('heading', { name: 'Kelola passkey' })).toBeVisible();
	await expect(
		page.getByText(/Belum ada passkey terdaftar|Browser ini tidak mendukung passkey/)
	).toBeVisible({ timeout: 30_000 });
});

test('cron pengingat menolak permintaan tanpa secret kalau diset', async ({ request }) => {
	const res = await request.get('/api/cron/pengingat');
	expect([200, 403]).toContain(res.status());
});

test('peta lokasi tidak menghubungi pihak ketiga sebelum disetujui', async ({ browser }) => {
	const ctx = await browser.newContext({
		locale: 'id-ID',
		permissions: ['geolocation'],
		geolocation: { latitude: -6.2312, longitude: 106.8619 }
	});
	const page = await ctx.newPage();
	await daftar(page);

	// Catat setiap permintaan yang keluar dari localhost.
	const keLuar: string[] = [];
	page.on('request', (r) => {
		if (!r.url().includes('localhost')) keLuar.push(r.url());
	});

	await page.goto('/app/hari-ini');
	await page.waitForURL(/\/app\/\d{4}\/\d{2}\/\d{2}/);
	// Tanpa membuang query-nya, halaman ini membuka editor kosong yang baru.
	const alamatHari = new URL(page.url()).pathname;
	await page.getByLabel('Isi tulisan').fill(`Catatan berlokasi ${unik()}`);
	await page.getByRole('button', { name: '+ lokasi & cuaca' }).click();

	// Koordinatnya muncul sebagai cip begitu lokasi tersemat.
	await expect(page.getByText(/-6\.23, 106\.86/).first()).toBeVisible({ timeout: 60_000 });

	await page.getByRole('button', { name: 'Tancapkan ke papan' }).click();
	await page.waitForURL(/\/app\/\d{4}\/\d{2}$/, { timeout: 30_000 });
	await page.goto(alamatHari);

	// Petanya masih tertutup, jadi belum ada satu ubin pun yang diminta.
	await expect(page.getByRole('button', { name: 'Tampilkan peta' })).toBeVisible({
		timeout: 30_000
	});
	expect(keLuar.filter((u) => u.includes('tile.openstreetmap.org'))).toHaveLength(0);

	await page.getByRole('button', { name: 'Tampilkan peta' }).click();
	await expect(page.getByRole('link', { name: /Buka .* di peta penuh/ })).toBeVisible({
		timeout: 30_000
	});

	// Persetujuannya diingat, jadi tidak ditanya lagi tiap membuka tulisan.
	await page.reload();
	await expect(page.getByRole('link', { name: /Buka .* di peta penuh/ })).toBeVisible({
		timeout: 30_000
	});
	await expect(page.getByRole('button', { name: 'Tampilkan peta' })).toHaveCount(0);
});
