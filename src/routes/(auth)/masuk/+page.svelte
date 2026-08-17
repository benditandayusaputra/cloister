<script lang="ts">
	import { goto } from '$app/navigation';
	import CangkangAuth from '$components/auth/CangkangAuth.svelte';
	import AnimasiKunci from '$components/auth/AnimasiKunci.svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import { crypto } from '$crypto/client.ts';
	import { KDF_DEFAULT, type KdfParams } from '$crypto/kdf.ts';
	import { authApi, toKdfParams } from '$lib/api/endpoints.ts';
	import { tokenStore, ApiError } from '$lib/api/client.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { metaRepo } from '$lib/db/local/repo.ts';
	import { deviceIdUntuk, namaPerangkat, platformPerangkat } from '$lib/utils/perangkat.ts';
	import { verifikasiPasskey } from '$lib/auth/passkey.ts';
	import KodeGambar from '$components/auth/KodeGambar.svelte';
	import type { Jawaban } from '$lib/captcha/klien.ts';

	let email = $state('');
	let sandi = $state('');
	let sibuk = $state(false);
	let langkahKunci = $state(0);
	let kdf = $state<KdfParams>(KDF_DEFAULT);
	let langkah = $state<'kunci' | 'passkey'>('kunci');
	let bukti = $state<KodeGambar | null>(null);
	let captcha = $state<Jawaban | null>(null);
	let situs = $state('');

	const bisa = $derived(email.includes('@') && sandi.length > 0 && !!captcha && !sibuk);

	async function masuk() {
		if (!bisa) return;
		sibuk = true;
		langkahKunci = 0;
		const tik = setInterval(() => (langkahKunci = Math.min(2, langkahKunci + 1)), 700);
		try {
			const p = await authApi.params(email);
			kdf = toKdfParams(p.kdf);
			const { authKey } = await crypto.derive(sandi, p.saltUser, kdf);

			// Kalau akun punya passkey, faktor kedua diminta sebelum sandi dikirim.
			langkah = 'passkey';
			const tiketPasskey = await verifikasiPasskey(email).catch((err) => {
				throw new Error(
					(err as Error).message.includes('NotAllowed')
						? 'Verifikasi passkey dibatalkan'
						: 'Passkey tidak bisa diverifikasi'
				);
			});
			langkah = 'kunci';

			const deviceId =
				deviceIdUntuk(email) ?? (await metaRepo.get<string | null>('deviceId', null));
			const jawaban = captcha;
			const res = await authApi.login({
				email,
				authKey,
				...(deviceId ? { deviceId } : {}),
				...(tiketPasskey ? { tiketPasskey } : {}),
				deviceName: namaPerangkat(),
				platform: platformPerangkat(),
				captcha: jawaban ?? undefined,
				situs
			});

			tokenStore.set(res.accessToken);
			if (res.deviceId) await metaRepo.set('deviceId', res.deviceId);

			if (res.wrappedMk && res.mkNonce) {
				await sesi.bukaBrankas(res.wrappedMk, res.mkNonce);
				await sesi.bangun();
				await goto('/app');
				return;
			}

			// Perangkat belum terdaftar: butuh transfer dari perangkat lama atau 24 kata.
			await sesi.bangun();
			sesi.perluTransfer = true;
			await goto('/sambung');
		} catch (err) {
			toast.bahaya(err instanceof ApiError ? err.message : 'Email atau sandi salah');
			void bukti?.segarkan();
		} finally {
			clearInterval(tik);
			sibuk = false;
		}
	}
</script>

<svelte:head><title>Masuk · Cloister</title></svelte:head>

<CangkangAuth>
	{#if sibuk && langkah === 'passkey'}
		<div style="display:flex;flex-direction:column;gap:var(--s-4);align-items:center;padding:var(--s-8) 0;text-align:center">
			<span class="t-judul t-lg">Sentuh passkey-mu</span>
			<p class="t-baca" style="color:var(--ink-on-board-dim);max-width:42ch">
				Akun ini memakai passkey sebagai faktor kedua. Sandi saja tidak cukup.
			</p>
		</div>
	{:else if sibuk}
		<AnimasiKunci langkah={langkahKunci} {kdf} />
	{:else}
		<Kertas indeks angkat padding="var(--s-6)">
			<div style="display:flex;flex-direction:column;gap:var(--s-5)">
				<h1 class="t-judul t-xl" style="color:var(--ink);line-height:1">{i18n.t.auth.masuk}</h1>

				<Medan
					label={i18n.t.auth.email}
					bind:value={email}
					type="email"
					placeholder="kamu@contoh.id"
					autocomplete="email"
				/>
				<Medan
					label={i18n.t.auth.sandi}
					bind:value={sandi}
					type="password"
					mono
					autocomplete="current-password"
					onenter={masuk}
				/>

				<KodeGambar bind:this={bukti} bind:jawaban={captcha} bind:situs />

				<button type="button" class="tbl" disabled={!bisa} onclick={masuk}>
					{i18n.t.auth.masuk}
				</button>

				<div
					style="display:flex;gap:var(--s-4);flex-wrap:wrap;font-family:var(--f-read);font-size:var(--text-sm)"
				>
					<a href="/pulih">{i18n.t.auth.lupaSandi}</a>
					<a href="/daftar">{i18n.t.auth.buatAkun}</a>
					<a href="/mulai-baru">Terkunci total?</a>
				</div>
			</div>
		</Kertas>
	{/if}
</CangkangAuth>
