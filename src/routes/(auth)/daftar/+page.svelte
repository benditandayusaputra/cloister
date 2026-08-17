<script lang="ts">
	import { goto } from '$app/navigation';
	import CangkangAuth from '$components/auth/CangkangAuth.svelte';
	import KekuatanSandi from '$components/auth/KekuatanSandi.svelte';
	import KisiFrasa from '$components/auth/KisiFrasa.svelte';
	import AnimasiKunci from '$components/auth/AnimasiKunci.svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import { crypto } from '$crypto/client.ts';
	import { KDF_DEFAULT, type KdfParams } from '$crypto/kdf.ts';
	import { authApi } from '$lib/api/endpoints.ts';
	import { tokenStore, ApiError } from '$lib/api/client.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import KodeGambar from '$components/auth/KodeGambar.svelte';
	import type { Jawaban } from '$lib/captcha/klien.ts';
	import { sandiCukup } from '$lib/utils/sandi.ts';
	import { namaPerangkat, platformPerangkat } from '$lib/utils/perangkat.ts';
	import { unduhTeks } from '$lib/utils/unduh.ts';

	type Layar = 'form' | 'frasa' | 'konfirmasi' | 'kunci';

	const UJI_N = [4, 11, 19];

	let layar = $state<Layar>('form');
	let email = $state('');
	let sandi = $state('');
	let ulangi = $state('');
	let sibuk = $state(false);
	let kdf = $state<KdfParams>(KDF_DEFAULT);

	let frasa = $state<string[]>([]);
	let gulirBawah = $state(false);
	let salinLabel = $state(i18n.t.auth.salin);
	let uji = $state(['', '', '']);
	let langkahKunci = $state(0);

	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
	const cocokSandi = $derived(sandi.length > 0 && sandi === ulangi);
	const bisaLanjut = $derived(emailValid && sandiCukup(sandi) && cocokSandi && !sibuk);
	const cocokUji = $derived(
		UJI_N.map((n, i) => uji[i]?.trim().toLowerCase() === frasa[n - 1])
	);
	const semuaCocok = $derived(cocokUji.every(Boolean));

	async function buatKunci() {
		if (!bisaLanjut) return;
		sibuk = true;
		try {
			kdf = await crypto.benchmark();
			const hasil = await crypto.register(sandi, kdf);
			frasa = hasil.phrase;
			pending = hasil;
			layar = 'frasa';
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	let pending = $state<Awaited<ReturnType<typeof crypto.register>> | null>(null);

	function periksaGulir(e: Event) {
		const el = e.currentTarget as HTMLDivElement;
		if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) gulirBawah = true;
	}

	async function salin() {
		try {
			await navigator.clipboard.writeText(frasa.join(' '));
			salinLabel = i18n.t.auth.tersalin;
			setTimeout(() => (salinLabel = i18n.t.auth.salin), 2000);
		} catch {
			toast.bahaya('Browser menolak akses papan klip');
		}
	}

	function unduh() {
		unduhTeks(
			`cloister-pemulihan-${new Date().toISOString().slice(0, 10)}.txt`,
			`FRASA PEMULIHAN CLOISTER\n\n${frasa.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\nSimpan file ini di tempat aman dan offline.\nSiapa pun yang punya 24 kata ini bisa membuka seluruh jurnalmu.\n`
		);
	}

	let kodeGambar = $state<KodeGambar | null>(null);
	let captcha = $state<Jawaban | null>(null);
	let situs = $state('');

	async function selesaikan() {
		if (!semuaCocok || !captcha || !pending || sibuk) return;
		sibuk = true;
		layar = 'kunci';
		const tik = setInterval(() => (langkahKunci = Math.min(2, langkahKunci + 1)), 700);
		try {
			const res = await authApi.register({
				captcha,
				situs,
				email,
				authKey: pending.authKey,
				saltUser: pending.saltUser,
				kdf,
				wrappedMk: pending.wrappedMk,
				mkNonce: pending.mkNonce,
				recoveryWrappedMk: pending.recoveryWrappedMk,
				recoveryNonce: pending.recoveryNonce,
				recoverySalt: pending.recoverySalt,
				recoveryAuthKey: pending.recoveryAuthKey,
				deviceName: namaPerangkat(),
				platform: platformPerangkat(),
				locale: i18n.locale
			});
			tokenStore.set(res.accessToken);
			await sesi.simpanBrankas();
			await sesi.bangun();
			// Verifikasi email tidak menghalangi menulis; bisa dilakukan kapan saja
			// dari Pengaturan, dan hanya dibutuhkan untuk menerbitkan ke halaman publik.
			await goto('/app');
		} catch (err) {
			clearInterval(tik);
			layar = 'konfirmasi';
			void kodeGambar?.segarkan();
			toast.bahaya(err instanceof ApiError ? err.message : 'Pendaftaran gagal');
		} finally {
			clearInterval(tik);
			sibuk = false;
		}
	}
</script>

<svelte:head><title>Buat akun · Cloister</title></svelte:head>

<CangkangAuth lebar={layar === 'frasa' ? 'lebar' : 'form'}>
	{#if layar === 'form'}
		<Kertas indeks angkat padding="var(--s-6)">
			<div style="display:flex;flex-direction:column;gap:var(--s-5)">
				<div style="display:flex;flex-direction:column;gap:8px">
					<h1 class="t-judul t-xl" style="color:var(--ink);line-height:1">
						{i18n.t.auth.buatAkun}
					</h1>
					<p class="t-baca" style="color:var(--ink-soft);max-width:52ch">
						{i18n.t.auth.penjelasan}
					</p>
				</div>

				<Medan
					label={i18n.t.auth.email}
					bind:value={email}
					type="email"
					placeholder="kamu@contoh.id"
					autocomplete="email"
					status={email.length > 3 && !emailValid ? 'salah' : 'netral'}
				/>

				<Medan
					label={i18n.t.auth.sandi}
					bind:value={sandi}
					type="password"
					mono
					placeholder={i18n.t.auth.sandiPendek}
					autocomplete="new-password"
				/>
				<KekuatanSandi {sandi} />

				<Medan
					label={i18n.t.auth.ulangiSandi}
					bind:value={ulangi}
					type="password"
					mono
					autocomplete="new-password"
					status={ulangi.length > 0 ? (cocokSandi ? 'benar' : 'salah') : 'netral'}
					pesan={ulangi.length > 0 && !cocokSandi ? i18n.t.auth.sandiTidakSama : ''}
					onenter={buatKunci}
				/>

				<button type="button" class="tbl" disabled={!bisaLanjut} onclick={buatKunci}>
					{sibuk ? i18n.t.umum.memuat : i18n.t.auth.mulaiMenulis}
				</button>

				<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft)">
					{i18n.t.auth.sudahPunya} <a href="/masuk">{i18n.t.auth.masuk}</a>
				</p>
			</div>
		</Kertas>
	{:else if layar === 'frasa'}
		<div
			onscroll={periksaGulir}
			data-testid="gulungan-frasa"
			class="kertas kertas-angkat"
			style="max-height:66vh;overflow:auto;padding:var(--s-7) var(--s-6);display:flex;flex-direction:column;gap:var(--s-5)"
		>
			<h1 class="t-judul t-xl" style="color:var(--ink)">{i18n.t.auth.frasaJudul}</h1>

			<div class="kotak-bahaya">
				<p class="t-baca" style="max-width:62ch">{i18n.t.auth.frasaPeringatan}</p>
			</div>

			<KisiFrasa kata={frasa} />

			<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
				<button type="button" class="tbl-garis" onclick={salin}>{salinLabel}</button>
				<button type="button" class="tbl-garis" onclick={unduh}>{i18n.t.auth.unduhTeks}</button>
			</div>

			<p class="t-baca" style="color:var(--ink-soft);max-width:62ch">{i18n.t.auth.frasaSaran}</p>
			<span class="t-data t-data-ink">{i18n.t.auth.gulirDulu}</span>
		</div>

		<button
			type="button"
			class="tbl"
			disabled={!gulirBawah}
			onclick={() => (layar = 'konfirmasi')}
		>
			{gulirBawah ? i18n.t.app.lanjut : i18n.t.auth.gulirDulu}
		</button>
	{:else if layar === 'konfirmasi'}
		<Kertas angkat padding="var(--s-6)">
			<div style="display:flex;flex-direction:column;gap:var(--s-5)">
				<h1 class="t-judul t-xl" style="color:var(--ink)">{i18n.t.auth.konfirmasiJudul}</h1>
				<p class="t-baca" style="color:var(--ink-soft);max-width:56ch">
					{i18n.t.auth.konfirmasiSub}
				</p>

				<div style="display:flex;flex-direction:column;gap:var(--s-4)">
					{#each UJI_N as n, i (n)}
						<Medan
							label={i18n.t.auth.kataKe(n)}
							bind:value={uji[i]!}
							mono
							status={uji[i] ? (cocokUji[i] ? 'benar' : 'salah') : 'netral'}
							pesan={uji[i] ? (cocokUji[i] ? i18n.t.auth.cocok : i18n.t.auth.belumCocok) : ''}
						/>
					{/each}
				</div>

				<KodeGambar bind:this={kodeGambar} bind:jawaban={captcha} bind:situs />

				<button
					type="button"
					class="tbl"
					disabled={!semuaCocok || !captcha || sibuk}
					onclick={selesaikan}
				>
					{i18n.t.app.selesai}
				</button>
				<button
					type="button"
					class="tbl-garis"
					onclick={() => {
						layar = 'frasa';
						gulirBawah = false;
					}}>Lihat 24 kata lagi</button
				>
			</div>
		</Kertas>
	{:else}
		<AnimasiKunci langkah={langkahKunci} {kdf} />
	{/if}
</CangkangAuth>
