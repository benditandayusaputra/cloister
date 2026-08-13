<script lang="ts">
	import CentangTerverifikasi from '$components/dasar/CentangTerverifikasi.svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import Pengingat from '$components/pengaturan/Pengingat.svelte';
	import { accountApi } from '$lib/api/endpoints.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n, type Locale } from '$lib/state/i18n.svelte.ts';

	let penName = $state(sesi.penName ?? '');
	let displayName = $state(sesi.info?.profile.displayName ?? '');
	let bio = $state(sesi.info?.profile.bio ?? '');
	let bahasa = $state<Locale>(i18n.locale);
	let paranoid = $state(sesi.info?.profile.paranoidTags ?? false);
	let sibuk = $state(false);

	$effect(() => {
		if (!sesi.info) return;
		penName = sesi.info.profile.penName ?? '';
		displayName = sesi.info.profile.displayName ?? '';
		bio = sesi.info.profile.bio ?? '';
		paranoid = sesi.info.profile.paranoidTags;
	});

	const inisial = $derived((penName || sesi.email || 'A').charAt(0).toUpperCase());

	async function simpan() {
		sibuk = true;
		try {
			await accountApi.updateProfile({
				penName: penName.trim() || null,
				displayName: displayName.trim() || null,
				bio: bio.trim() || null,
				locale: bahasa,
				paranoidTags: paranoid
			});
			i18n.set(bahasa);
			await sesi.segarkan();
			toast.show('Tersimpan.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}
</script>

<svelte:head><title>Akun · Cloister</title></svelte:head>

<Kertas padding="var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-5)">
		<h1 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.pengaturan.akun}</h1>

		<div style="display:flex;align-items:center;gap:var(--s-4)">
			<span
				style="width:62px;height:62px;display:grid;place-items:center;background-image:var(--tex-grain), linear-gradient(var(--paper-manila),var(--paper-manila));background-blend-mode:multiply,normal;box-shadow:var(--sh-contact), var(--sh-pinned);transform:rotate(-2.4deg);font-family:var(--f-hand);font-weight:600;font-size:1.7rem;color:var(--ink)"
				>{inisial}</span
			>
			<div style="display:flex;flex-direction:column;gap:4px">
				<span
					style="display:flex;align-items:center;gap:6px;font-family:var(--f-read);font-size:var(--text-md);color:var(--ink)"
				>
					{sesi.email}
					{#if sesi.info?.emailVerified}<CentangTerverifikasi />{/if}
				</span>
				<span class="t-data t-data-ink">
					{sesi.info?.emailVerified ? 'email terverifikasi' : 'email belum diverifikasi · opsional'}
				</span>
			</div>
		</div>

		{#if !sesi.info?.emailVerified}
			<div class="pita-peringatan">
				Menulis dan menyinkronkan tetap jalan tanpa ini. Verifikasi hanya perlu kalau kamu mau
				menerbitkan ke halaman publik — dan namamu dapat centang biru.
				<a href="/verifikasi">Verifikasi sekarang</a>
			</div>
		{/if}

		<Medan
			label={i18n.t.pengaturan.namaPena}
			bind:value={penName}
			placeholder="rusun_lantai_9"
			pesan="3-24 huruf kecil, angka, atau garis bawah"
		/>
		<Medan label="Nama tampilan" bind:value={displayName} placeholder="opsional" />

		<label class="label-medan">
			<span class="t-data t-data-ink">{i18n.t.pengaturan.bio}</span>
			<textarea
				bind:value={bio}
				maxlength="280"
				rows="3"
				style="border:none;border-bottom:2px solid rgb(27 27 23 / 0.45);background:transparent;font-family:var(--f-read);font-size:var(--text-md);color:var(--ink);resize:vertical;outline:none"
			></textarea>
		</label>

		<label class="label-medan">
			<span class="t-data t-data-ink">{i18n.t.pengaturan.bahasa}</span>
			<select bind:value={bahasa} class="isian">
				<option value="id">Bahasa Indonesia</option>
				<option value="en">English</option>
			</select>
		</label>

		<label style="display:flex;align-items:flex-start;gap:11px;cursor:pointer">
			<input
				type="checkbox"
				bind:checked={paranoid}
				style="width:20px;height:20px;margin-top:3px;accent-color:#2B4F8E"
			/>
			<span style="font-family:var(--f-read);font-size:var(--text-md);color:var(--ink)">
				Mode paranoid tag — jangan kirim blind index tag ke server. Filter tag jadi lokal saja.
			</span>
		</label>

		<button type="button" class="tbl" style="align-self:flex-start" disabled={sibuk} onclick={simpan}>
			{i18n.t.app.simpan}
		</button>
	</div>
</Kertas>

<Pengingat />
