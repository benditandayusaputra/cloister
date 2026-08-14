import { test, expect, type Page, type Browser } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test.describe.configure({ timeout: 240_000 });

const unik = () => Math.random().toString(36).slice(2, 10);
const SANDI = 'Sandi-Cloister-2026!';

function sql(perintah: string) {
	execFileSync('psql', ['-d', 'Cloister', '-c', perintah]);
}

async function halamanBaru(browser: Browser): Promise<Page> {
	const ctx = await browser.newContext({ locale: 'id-ID' });
	return ctx.newPage();
}

async function daftar(page: Page): Promise<string> {
	const email = `cari-${unik()}@contoh.id`;
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

/** Terbitkan lewat SQL: yang diuji di sini pencarian dan saringannya. */
function terbitkan(
	email: string,
	pena: string,
	tulisan: Array<{ judul: string; isi: string; mood: number; dilihat?: number; tag?: string }>
) {
	sql(`insert into profiles (user_id, pen_name)
	     select id, '${pena}' from users where email = '${email}'
	     on conflict (user_id) do update set pen_name = '${pena}'`);

	for (const [i, t] of tulisan.entries()) {
		sql(`
			with u as (select id from users where email = '${email}'),
			     e as (
			       insert into public_entries
			         (id, user_id, slug, title, body_md, excerpt, entry_date, mood, pen_name, view_count)
			       select gen_random_uuid(), u.id, '${pena}-${i}', '${t.judul}', '${t.isi}', '${t.isi}',
			              current_date, ${t.mood}, '${pena}', ${t.dilihat ?? 0}
			       from u returning id
			     )
			insert into public_tags (public_entry_id, tag)
			select e.id, '${t.tag ?? 'umum'}' from e`);
	}
}

test('pencarian feed publik mencocokkan judul dan isi, lalu bisa dibersihkan', async ({
	browser
}) => {
	const page = await halamanBaru(browser);
	const email = await daftar(page);
	const pena = `p${unik()}`;
	const kunci = `kunci${unik()}`;

	terbitkan(email, pena, [
		{ judul: `Hujan ${kunci} sore`, isi: 'Sore itu deras sekali.', mood: 2 },
		{ judul: `Pagi cerah ${unik()}`, isi: `Isi tulisan menyebut ${kunci} di tengah.`, mood: 5 },
		{ judul: `Tidak nyambung ${unik()}`, isi: 'Tidak ada kata itu di sini.', mood: 3 }
	]);

	const pembaca = await halamanBaru(browser);
	await pembaca.goto('/baca');
	await expect(pembaca.getByRole('searchbox', { name: /Cari tulisan/ })).toBeVisible({
		timeout: 30_000
	});

	await pembaca.getByRole('searchbox', { name: /Cari tulisan/ }).fill(kunci);
	await pembaca.getByRole('button', { name: 'Cari' }).click();
	await pembaca.waitForURL(new RegExp(`q=${kunci}`), { timeout: 30_000 });

	// Cocok lewat judul dan lewat isi, tapi yang tidak menyebut sama sekali gugur.
	const kartu = pembaca.locator('article');
	await expect(kartu).toHaveCount(2, { timeout: 30_000 });
	await expect(pembaca.getByText('Tidak nyambung')).toHaveCount(0);

	await pembaca.getByRole('link', { name: 'Bersihkan' }).click();
	await expect(pembaca).toHaveURL(/\/baca$/);
	await expect(pembaca.locator('article').first()).toBeVisible({ timeout: 30_000 });
});

test('saringan suasana hati menyaring, dan tetap terbawa saat mencari', async ({ browser }) => {
	const page = await halamanBaru(browser);
	const email = await daftar(page);
	const pena = `p${unik()}`;
	const kunci = `mood${unik()}`;

	terbitkan(email, pena, [
		{ judul: `Berat ${kunci}`, isi: 'Hari yang berat.', mood: 1 },
		{ judul: `Lega ${kunci}`, isi: 'Hari yang lega.', mood: 5 }
	]);

	const pembaca = await halamanBaru(browser);
	await pembaca.goto(`/baca?q=${kunci}`);
	await expect(pembaca.locator('article')).toHaveCount(2, { timeout: 30_000 });

	// title membedakan tombol saringan dari judul tulisan yang kebetulan sama.
	await pembaca.locator('a[title="Lega"]').click();
	await pembaca.waitForURL(/mood=5/, { timeout: 30_000 });

	// Kata kunci tidak boleh hilang begitu suasana hati dipilih.
	expect(pembaca.url()).toContain(`q=${kunci}`);
	await expect(pembaca.locator('article')).toHaveCount(1);
	await expect(pembaca.getByText(`Lega ${kunci}`)).toBeVisible();
});

test('tanda persen di kotak cari dicari apa adanya, bukan jadi wildcard', async ({ browser }) => {
	const page = await halamanBaru(browser);
	const email = await daftar(page);
	const pena = `p${unik()}`;

	terbitkan(email, pena, [
		{ judul: `Diskon lima puluh ${unik()}`, isi: 'Tidak ada tanda apa pun.', mood: 3 }
	]);

	const pembaca = await halamanBaru(browser);
	await pembaca.goto('/baca?q=%25%25%25');
	await expect(pembaca.getByText(/Tidak ada tulisan publik yang memuat/)).toBeVisible({
		timeout: 30_000
	});
});
