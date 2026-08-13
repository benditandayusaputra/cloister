<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import CangkangAuth from '$components/auth/CangkangAuth.svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import KotakKode from '$components/auth/KotakKode.svelte';
	import { authApi } from '$lib/api/endpoints.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let kode = $state(['', '', '', '', '', '']);
	let sibuk = $state(false);
	let hitungMundur = $state(0);

	onMount(() => {
		if (sesi.fase === 'memuat') void sesi.bangun();
		const t = setInterval(() => hitungMundur > 0 && (hitungMundur -= 1), 1000);
		return () => clearInterval(t);
	});

	async function verifikasi(nilai = kode.join('')) {
		if (nilai.length !== 6 || sibuk) return;
		sibuk = true;
		try {
			await authApi.verifyEmail(nilai);
			await sesi.segarkan();
			toast.show('Email terverifikasi.');
			await goto('/app');
		} catch (err) {
			toast.bahaya((err as Error).message);
			kode = ['', '', '', '', '', ''];
		} finally {
			sibuk = false;
		}
	}

	async function kirimUlang() {
		if (hitungMundur > 0) return;
		await authApi.resendCode();
		hitungMundur = 60;
		toast.show('Kode baru dikirim.');
	}
</script>

<svelte:head><title>Verifikasi email · Cloister</title></svelte:head>

<CangkangAuth>
	<Kertas warna="biru" angkat padding="var(--s-6)">
		<div style="display:flex;flex-direction:column;gap:var(--s-5)">
			<h1 class="t-judul t-xl" style="color:var(--ink)">{i18n.t.auth.cekEmail}</h1>
			<p class="t-baca" style="color:var(--ink-soft);max-width:52ch">
				{i18n.t.auth.cekEmailSub(sesi.email || 'emailmu')}
			</p>

			<KotakKode nilai={kode} onubah={(v) => (kode = v)} onlengkap={verifikasi} />

			<div style="display:flex;gap:var(--s-4);align-items:center;flex-wrap:wrap">
				<button
					type="button"
					class="tbl"
					disabled={kode.join('').length !== 6 || sibuk}
					onclick={() => verifikasi()}>{i18n.t.auth.verifikasi}</button
				>
				<button
					type="button"
					class="tbl-garis"
					disabled={hitungMundur > 0}
					onclick={kirimUlang}
				>
					{hitungMundur > 0 ? `${i18n.t.auth.kirimUlang} (${hitungMundur})` : i18n.t.auth.kirimUlang}
				</button>
				<a
					href="/app"
					class="t-data"
					style="margin-left:auto;color:var(--ink-soft);text-decoration:underline"
					>{i18n.t.auth.lewatiVerifikasi}</a
				>
			</div>

			<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">
				Kamu bisa menulis tanpa verifikasi. Yang butuh email terverifikasi hanya menerbitkan entri ke
				halaman publik.
			</p>
		</div>
	</Kertas>
</CangkangAuth>
