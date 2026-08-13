<script lang="ts">
	import { onMount } from 'svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import KekuatanSandi from '$components/auth/KekuatanSandi.svelte';
	import KisiFrasa from '$components/auth/KisiFrasa.svelte';
	import RotasiKunci from '$components/pengaturan/RotasiKunci.svelte';
	import Passkey from '$components/pengaturan/Passkey.svelte';
	import { crypto } from '$crypto/client.ts';
	import { authApi, accountApi } from '$lib/api/endpoints.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { kunci } from '$lib/state/kunci.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { sandiCukup } from '$lib/utils/sandi.ts';
	import { unduhTeks } from '$lib/utils/unduh.ts';

	let sidik = $state('—');
	let bukaGanti = $state(false);
	let lama = $state('');
	let baru = $state('');
	let ulang = $state('');
	let sibuk = $state(false);

	let ketikDiperkuat = $state('');
	let frasaBaru = $state<string[]>([]);
	let pinKunci = $state('');

	onMount(async () => {
		await kunci.muat();
		try {
			sidik = await crypto.fingerprint();
		} catch {
			sidik = 'kunci terkunci';
		}
	});

	const bisaGanti = $derived(lama.length > 0 && sandiCukup(baru) && baru === ulang && !sibuk);
	const bisaDiperkuat = $derived(ketikDiperkuat.trim() === 'DIPERKUAT' && !sesi.info?.hardenedMode);

	async function gantiSandi() {
		if (!bisaGanti) return;
		const kdf = sesi.kdf();
		if (!kdf) return;
		sibuk = true;
		try {
			const p = await authApi.params(sesi.email);
			const { authKey: authKeyOld } = await crypto.derive(sesi.email ? lama : lama, p.saltUser, kdf);
			const r = await crypto.rewrapPassword(baru, kdf);
			await authApi.changePassword({
				authKeyOld,
				authKeyNew: r.authKey,
				saltUserNew: r.saltUser,
				kdfNew: kdf,
				wrappedMk: r.wrappedMk,
				mkNonce: r.mkNonce
			});
			toast.show('Sandi diganti. Sesi lain dicabut.');
			bukaGanti = false;
			lama = baru = ulang = '';
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	async function aktifkanDiperkuat() {
		if (!bisaDiperkuat) return;
		try {
			await accountApi.enableHardened();
			await sesi.segarkan();
			ketikDiperkuat = '';
			toast.show('Mode Diperkuat aktif. Server tidak lagi menyimpan kunci akunmu.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}

	async function frasaBaruBuat() {
		const kdf = sesi.kdf();
		if (!kdf) return;
		if (!confirm('Frasa lama akan berhenti berlaku. Lanjut?')) return;
		try {
			const r = await crypto.rewrapPhrase(kdf);
			await authApi.rotateRecoveryPhrase({
				recoveryWrappedMk: r.recoveryWrappedMk,
				recoveryNonce: r.recoveryNonce,
				recoverySalt: r.recoverySalt,
				recoveryAuthKey: r.recoveryAuthKey
			});
			frasaBaru = r.phrase;
			toast.show('Frasa baru dibuat dan sudah berlaku. Frasa lama berhenti berlaku.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}

	async function toggleKunci() {
		if (kunci.aktif) {
			await kunci.lepas();
			toast.show('Kunci aplikasi dimatikan.');
			return;
		}
		if (!/^\d{6}$/.test(pinKunci)) {
			toast.bahaya('PIN harus 6 angka');
			return;
		}
		await kunci.pasang(pinKunci);
		pinKunci = '';
		toast.show('Kunci aplikasi aktif. Cloister akan minta PIN setiap dibuka.');
	}
</script>

<svelte:head><title>Keamanan · Cloister</title></svelte:head>

<Kertas padding="var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-5)">
		<h1 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.pengaturan.keamanan}</h1>

		<div style="display:flex;flex-wrap:wrap;gap:var(--s-3)">
			<button type="button" class="tbl-garis" onclick={() => (bukaGanti = !bukaGanti)}>
				{i18n.t.pengaturan.gantiSandi}
			</button>
			<button type="button" class="tbl-garis" onclick={frasaBaruBuat}>Buat 24 kata baru</button>
		</div>

		{#if bukaGanti}
			<div style="display:flex;flex-direction:column;gap:var(--s-4);padding-top:var(--s-3);border-top:1px solid rgb(27 27 23 / 0.14)">
				<Medan label="Sandi lama" bind:value={lama} type="password" mono autocomplete="current-password" />
				<Medan label="Sandi baru" bind:value={baru} type="password" mono autocomplete="new-password" />
				<KekuatanSandi sandi={baru} />
				<Medan
					label={i18n.t.auth.ulangiSandi}
					bind:value={ulang}
					type="password"
					mono
					status={ulang ? (ulang === baru ? 'benar' : 'salah') : 'netral'}
				/>
				<button type="button" class="tbl" style="align-self:flex-start" disabled={!bisaGanti} onclick={gantiSandi}>
					{i18n.t.app.simpan}
				</button>
			</div>
		{/if}

		{#if frasaBaru.length > 0}
			<div style="display:flex;flex-direction:column;gap:var(--s-3)">
				<div class="kotak-bahaya">
					<p class="t-baca">{i18n.t.auth.frasaPeringatan}</p>
				</div>
				<KisiFrasa kata={frasaBaru} />
				<button
					type="button"
					class="tbl-garis"
					style="align-self:flex-start"
					onclick={() =>
						unduhTeks(
							'cloister-pemulihan-baru.txt',
							frasaBaru.map((w, i) => `${i + 1}. ${w}`).join('\n')
						)}>{i18n.t.auth.unduhTeks}</button
				>
			</div>
		{/if}

		<div
			style="display:flex;flex-direction:column;gap:6px;padding-top:var(--s-2);border-top:1px solid rgb(27 27 23 / 0.14)"
		>
			<span class="t-data t-data-ink">{i18n.t.pengaturan.sidikJari}</span>
			<span style="font-family:var(--f-data);font-size:var(--text-base);color:var(--ink);letter-spacing:0.04em"
				>{sidik}</span
			>
		</div>
	</div>
</Kertas>

<Kertas warna="manila" padding="var(--s-6)" kelas="kotak-warn">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
			<h2 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.pengaturan.diperkuat}</h2>
			<span class="t-data" style="color:var(--warn)">
				{sesi.info?.hardenedMode ? i18n.t.pengaturan.diperkuatAktif : i18n.t.pengaturan.diperkuatNonaktif}
			</span>
		</div>
		<p class="t-baca" style="max-width:62ch">{i18n.t.pengaturan.diperkuatPenjelasan}</p>

		{#if !sesi.info?.hardenedMode}
			<label class="label-medan" style="max-width:320px">
				<span class="t-data t-data-ink">{i18n.t.pengaturan.ketikDiperkuat}</span>
				<input
					type="text"
					bind:value={ketikDiperkuat}
					class="isian isian-data {ketikDiperkuat && !bisaDiperkuat ? 'isian-salah' : ''}"
					style="letter-spacing:0.09em"
				/>
			</label>
			<button
				type="button"
				class="tbl"
				style="align-self:flex-start;background:{bisaDiperkuat ? 'var(--danger)' : 'var(--ink-faint)'}"
				disabled={!bisaDiperkuat}
				onclick={aktifkanDiperkuat}>{i18n.t.pengaturan.aktifkanDiperkuat}</button
			>
		{/if}
	</div>
</Kertas>

<Passkey />

<RotasiKunci />

<Kertas warna="buram" padding="var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.pengaturan.kunciAplikasi}</h2>
		<p class="t-baca" style="max-width:62ch;color:var(--ink-soft)">
			{i18n.t.pengaturan.kunciPenjelasan}
		</p>

		{#if !kunci.aktif}
			<Medan label={i18n.t.pengaturan.pinLokal} bind:value={pinKunci} type="password" mono />
		{/if}

		<button type="button" class="tbl-garis" style="align-self:flex-start" onclick={toggleKunci}>
			{kunci.aktif ? i18n.t.pengaturan.matikanKunci : i18n.t.pengaturan.aktifkanKunci}
		</button>
	</div>
</Kertas>
