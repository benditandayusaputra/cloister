<script lang="ts">
	import { browser } from '$app/environment';
	import { didukung, daftarPasskey } from '$lib/auth/passkey.ts';

	const KEY = 'cloister:passkey-ingat';
	const TUNDA_HARI = 7;

	let tampil = $state(false);

	$effect(() => {
		if (!browser || !didukung()) return;
		if (localStorage.getItem('cloister:tutorial-v1') !== '1') return;
		const tunda = Number(localStorage.getItem(KEY) ?? 0);
		if (Date.now() < tunda) return;
		void daftarPasskey()
			.then(({ passkeys }) => {
				tampil = passkeys.length === 0;
			})
			.catch(() => {});
	});

	function nanti() {
		if (browser) localStorage.setItem(KEY, String(Date.now() + TUNDA_HARI * 86_400_000));
		tampil = false;
	}
</script>

{#if tampil}
	<div
		class="kotak-warn muncul"
		role="status"
		style="display:flex;flex-wrap:wrap;gap:var(--s-4);align-items:center;justify-content:space-between"
	>
		<div style="display:flex;flex-direction:column;gap:4px;max-width:56ch">
			<strong style="font-family:var(--f-display);font-size:var(--text-sm)"
				>Kunci pintumu dua kali: daftarkan passkey</strong
			>
			<span style="font-family:var(--f-read);font-size:0.85rem;line-height:1.6">
				Dengan passkey sebagai faktor kedua, orang yang tahu sandimu saja tetap tidak bisa masuk.
				Butuh sekitar 30 detik.
			</span>
		</div>
		<div style="display:flex;gap:var(--s-2);flex-wrap:wrap">
			<a href="/pengaturan/keamanan" class="tbl" style="text-decoration:none;min-height:38px"
				>Daftarkan</a
			>
			<button type="button" class="tbl-garis" style="min-height:38px" onclick={nanti}
				>Nanti dulu</button
			>
		</div>
	</div>
{/if}
