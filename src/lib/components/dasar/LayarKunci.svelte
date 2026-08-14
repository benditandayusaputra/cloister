<script lang="ts">
	import Logo from '$components/nav/Logo.svelte';
	import KotakKode from '$components/auth/KotakKode.svelte';
	import { kunci } from '$lib/state/kunci.svelte.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let pin = $state(['', '', '', '', '', '']);
	let salah = $state(false);
	let sibuk = $state(false);

	async function coba(kode = pin.join('')) {
		if (kode.length !== 6 || sibuk) return;
		sibuk = true;
		salah = !(await kunci.buka(kode));
		if (salah) pin = ['', '', '', '', '', ''];
		sibuk = false;
	}
</script>

<div class="ruangan" style="display:grid;place-items:center;min-height:100vh;padding:var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-5);align-items:center;text-align:center">
		<Logo ukuran={40} />
		<h1 class="t-judul t-lg">{i18n.t.pengaturan.kunciAplikasi}</h1>
		<p class="t-baca" style="color:var(--ink-on-board-dim);max-width:38ch">
			{i18n.t.pengaturan.pinLokal}
		</p>

		<KotakKode nilai={pin} gelap onubah={(v) => (pin = v)} onlengkap={coba} />

		{#if salah}
			<span class="t-data" style="color:var(--danger-hi)">PIN salah</span>
		{/if}

		<button type="button" class="tbl" disabled={pin.join('').length !== 6 || sibuk} onclick={() => coba()}>
			Buka
		</button>

		<button
			type="button"
			class="t-data"
			style="border:none;background:transparent;cursor:pointer;color:var(--ink-on-board-dim);text-decoration:underline"
			onclick={() => sesi.keluar()}>{i18n.t.umum.keluar}</button
		>
	</div>
</div>
