<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import CangkangAuth from '$components/auth/CangkangAuth.svelte';
	import PemindaiQr from '$components/pengaturan/PemindaiQr.svelte';
	import KotakKode from '$components/auth/KotakKode.svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import { crypto } from '$crypto/client.ts';
	import { decodeQr } from '$crypto/transfer.ts';
	import { deviceApi } from '$lib/api/endpoints.ts';
	import { tokenStore } from '$lib/api/client.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { metaRepo } from '$lib/db/local/repo.ts';
	import { namaPerangkat, platformPerangkat } from '$lib/utils/perangkat.ts';

	let sessionId = $state('');
	let secret = $state('');
	let manual = $state('');
	let pin = $state(['', '', '', '', '', '']);
	let sibuk = $state(false);
	let sisaPercobaan = $state(5);
	let salah = $state('');

	onMount(() => {
		if (sesi.fase === 'memuat') void sesi.bangun();
	});

	function terapkanQr(teks: string) {
		const hasil = decodeQr(teks);
		if (!hasil) {
			toast.bahaya('Kode itu bukan kode penyambungan Cloister');
			return;
		}
		sessionId = hasil.sessionId;
		secret = hasil.secret;
		toast.show('Kode terbaca. Sekarang ketik PIN dari perangkat lama.');
	}

	function terapkanManual() {
		terapkanQr(manual.trim());
	}

	async function sambungkan() {
		const kode = pin.join('');
		if (!sessionId || !secret || kode.length !== 6 || sibuk) return;
		sibuk = true;
		salah = '';
		try {
			const sesiTransfer = await deviceApi.fetchTransfer(sessionId);
			sisaPercobaan = sesiTransfer.attemptsLeft;

			const hasil = await crypto.acceptTransfer(kode, secret, sesiTransfer.blob, sesiTransfer.nonce);
			await crypto.adoptMasterKey(hasil.masterKey);

			const konfirmasi = await deviceApi.confirmTransfer(
				sessionId,
				namaPerangkat(),
				platformPerangkat()
			);
			tokenStore.set(konfirmasi.accessToken);
			await metaRepo.set('deviceId', konfirmasi.deviceId);
			await sesi.simpanBrankas();
			await sesi.bangun();
			toast.show('Perangkat tersambung. Menarik arsip.');
			await goto('/app');
		} catch (err) {
			salah =
				sisaPercobaan > 0
					? `PIN atau kode salah. Sisa ${sisaPercobaan} percobaan.`
					: (err as Error).message;
			pin = ['', '', '', '', '', ''];
		} finally {
			sibuk = false;
		}
	}
</script>

<svelte:head><title>Sambungkan perangkat · Cloister</title></svelte:head>

<CangkangAuth>
	<div style="display:flex;flex-direction:column;gap:var(--s-5);align-items:center">
		<h1 class="t-judul t-xl" style="text-align:center">{i18n.t.pengaturan.arahkanKamera}</h1>
		<p class="t-baca" style="color:var(--ink-on-board-dim);text-align:center;max-width:52ch">
			Sandi saja tidak cukup untuk membuka arsip di perangkat baru. Buka Pengaturan → Perangkat di
			perangkat lamamu, lalu pilih "Sambungkan perangkat baru".
		</p>

		<PemindaiQr onbaca={terapkanQr} />

		<Kertas padding="var(--s-5)" gaya="width:100%">
			<div style="display:flex;flex-direction:column;gap:var(--s-4)">
				<label class="label-medan">
					<span class="t-data t-data-ink">Atau tempel kode manual</span>
					<input
						type="text"
						bind:value={manual}
						placeholder="cloister://sambung?s=…&k=…"
						class="isian isian-data"
						style="font-size:var(--text-sm)"
					/>
				</label>
				<button type="button" class="tbl-garis" onclick={terapkanManual}>Pakai kode itu</button>

				{#if sessionId}
					<span class="t-data" style="color:var(--ok)">Kode diterima</span>
				{/if}
			</div>
		</Kertas>

		<div style="display:flex;flex-direction:column;gap:12px;align-items:center">
			<span class="t-data">{i18n.t.pengaturan.atauPin}</span>
			<!-- Tidak auto-kirim: percobaan dibatasi 5, salah ketik tidak boleh langsung membakar satu. -->
			<KotakKode nilai={pin} gelap onubah={(v) => (pin = v)} />
			<button
				type="button"
				class="tbl"
				disabled={!sessionId || pin.join('').length !== 6 || sibuk}
				onclick={sambungkan}>{i18n.t.pengaturan.sambungkan}</button
			>
			{#if salah}
				<span class="t-data" style="color:var(--danger-hi)">{salah}</span>
			{/if}
		</div>

		<div style="display:flex;gap:var(--s-4);flex-wrap:wrap;justify-content:center">
			<a href="/pulih" class="t-data" style="color:var(--ink-on-board-dim)"
				>Tidak punya perangkat lama? Pakai 24 kata</a
			>
			<a href="/mulai-baru" class="t-data" style="color:var(--ink-on-board-dim)"
				>Tidak punya keduanya? Mulai dari nol</a
			>
			<button
				type="button"
				class="t-data"
				style="border:none;background:transparent;cursor:pointer;color:var(--ink-on-board-dim);text-decoration:underline"
				onclick={() => sesi.keluar()}>{i18n.t.umum.keluar}</button
			>
		</div>
	</div>
</CangkangAuth>
