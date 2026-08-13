<script lang="ts">
	import { goto } from '$app/navigation';
	import CangkangAuth from '$components/auth/CangkangAuth.svelte';
	import AnimasiKunci from '$components/auth/AnimasiKunci.svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import { crypto } from '$crypto/client.ts';
	import { KDF_DEFAULT, type KdfParams } from '$crypto/kdf.ts';
	import { authApi, toKdfParams } from '$lib/api/endpoints.ts';
	import { tokenStore } from '$lib/api/client.ts';
	import { isWord, parsePhrase, suggest } from '$crypto/recovery.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { metaRepo } from '$lib/db/local/repo.ts';
	import { namaPerangkat, platformPerangkat } from '$lib/utils/perangkat.ts';

	let email = $state('');
	let sandi = $state('');
	let kata = $state<string[]>(new Array(24).fill(''));
	let sibuk = $state(false);
	let langkahKunci = $state(0);
	let kdf = $state<KdfParams>(KDF_DEFAULT);
	let fokus = $state(-1);

	const terisi = $derived(kata.filter((w) => w.trim()).length);
	const semuaValid = $derived(kata.every((w) => isWord(w)));
	const bisa = $derived(email.includes('@') && sandi.length > 0 && semuaValid && !sibuk);
	const saran = $derived(fokus >= 0 ? suggest(kata[fokus] ?? '') : []);

	function tempel(i: number, e: ClipboardEvent) {
		const teks = e.clipboardData?.getData('text') ?? '';
		const kataTempel = parsePhrase(teks);
		if (kataTempel.length < 2) return;
		e.preventDefault();
		const next = [...kata];
		for (let k = 0; k < kataTempel.length && i + k < 24; k++) next[i + k] = kataTempel[k] as string;
		kata = next;
	}

	async function pulihkan() {
		if (!bisa) return;
		sibuk = true;
		langkahKunci = 0;
		const bersih = kata.map((w) => w.trim().toLowerCase());
		const tik = setInterval(() => (langkahKunci = Math.min(2, langkahKunci + 1)), 800);
		try {
			const blob = await authApi.recover(email);
			kdf = toKdfParams(blob.kdf);
			await crypto.unlockWithPhrase(
				bersih,
				blob.recoverySalt,
				blob.recoveryWrappedMk,
				blob.recoveryNonce,
				kdf
			);

			const recoveryAuthKey = await crypto.recoveryAuth(bersih, blob.recoverySalt, kdf);
			const baru = await crypto.rewrapPassword(sandi, kdf);

			const res = await authApi.reset({
				email,
				recoveryAuthKey,
				authKeyNew: baru.authKey,
				saltUserNew: baru.saltUser,
				kdfNew: kdf,
				wrappedMk: baru.wrappedMk,
				mkNonce: baru.mkNonce,
				deviceName: namaPerangkat(),
				platform: platformPerangkat()
			});

			tokenStore.set(res.accessToken);
			await metaRepo.set('deviceId', res.deviceId);
			await sesi.simpanBrankas();
			await sesi.bangun();
			toast.show('Kunci terbuka. Sandi baru sudah dipasang.');
			await goto('/app');
		} catch (err) {
			toast.bahaya(
				(err as Error).message.includes('checksum')
					? 'Checksum 24 kata tidak cocok, periksa lagi urutannya'
					: 'Kunci tidak bisa dibuka dengan kata-kata itu'
			);
		} finally {
			clearInterval(tik);
			sibuk = false;
		}
	}
</script>

<svelte:head><title>Pemulihan · Cloister</title></svelte:head>

<CangkangAuth lebar="lebar">
	{#if sibuk}
		<AnimasiKunci langkah={langkahKunci} {kdf} />
	{:else}
		<Kertas angkat padding="var(--s-6)">
			<div style="display:flex;flex-direction:column;gap:var(--s-5)">
				<h1 class="t-judul t-xl" style="color:var(--ink)">{i18n.t.auth.pemulihanJudul}</h1>
				<p class="t-baca" style="color:var(--ink-soft);max-width:56ch">
					{i18n.t.auth.pemulihanSub}
				</p>

				<Medan
					label={i18n.t.auth.email}
					bind:value={email}
					type="email"
					placeholder="kamu@contoh.id"
					autocomplete="email"
				/>

				<div
					style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--s-3) var(--s-4)"
				>
					{#each kata as w, i (i)}
						<label style="display:flex;align-items:baseline;gap:8px">
							<span
								style="font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-soft);min-width:16px"
								>{i + 1}</span
							>
							<input
								type="text"
								value={w}
								aria-label={i18n.t.auth.kataKe(i + 1)}
								autocomplete="off"
								autocapitalize="none"
								spellcheck="false"
								style="width:100%;min-height:44px;border:none;border-bottom:2px solid {w
									? isWord(w)
										? 'var(--ok)'
										: 'var(--danger)'
									: 'rgb(27 27 23 / 0.45)'};background:transparent;font-family:var(--f-data);font-size:var(--text-base);color:var(--ink);outline:none"
								oninput={(e) => {
									const next = [...kata];
									next[i] = (e.currentTarget as HTMLInputElement).value;
									kata = next;
								}}
								onfocus={() => (fokus = i)}
								onblur={() => (fokus = -1)}
								onpaste={(e) => tempel(i, e)}
							/>
						</label>
					{/each}
				</div>

				{#if saran.length > 0}
					<div style="display:flex;gap:6px;flex-wrap:wrap">
						{#each saran as s (s)}
							<button
								type="button"
								class="tag-cip"
								onmousedown={(e) => {
									e.preventDefault();
									const next = [...kata];
									next[fokus] = s;
									kata = next;
								}}>{s}</button
							>
						{/each}
					</div>
				{/if}

				<Medan
					label="Sandi baru"
					bind:value={sandi}
					type="password"
					mono
					placeholder={i18n.t.auth.sandiPendek}
					autocomplete="new-password"
				/>

				<div style="display:flex;align-items:center;gap:var(--s-4);flex-wrap:wrap">
					<button type="button" class="tbl" disabled={!bisa} onclick={pulihkan}>
						{i18n.t.auth.bukaTulisanku}
					</button>
					<span class="t-data t-data-ink">{i18n.t.auth.terisiDari(terisi)}</span>
				</div>

				<p class="t-baca" style="font-size:var(--text-sm);color:var(--ink-soft);max-width:56ch">
					Kata-katanya ikut hilang? <a href="/mulai-baru">Mulai dari nol</a> — kamu bisa masuk lagi
					dengan papan kosong, dan tulisan lama masih kami simpan 30 hari kalau katanya ketemu belakangan.
				</p>
			</div>
		</Kertas>
	{/if}
</CangkangAuth>
