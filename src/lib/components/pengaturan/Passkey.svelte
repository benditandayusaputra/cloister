<script lang="ts">
	import { onMount } from 'svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import {
		didukung,
		daftarPasskey,
		tambahPasskey,
		hapusPasskey,
		type PasskeyDto
	} from '$lib/auth/passkey.ts';
	import { waktuRelatif } from '$lib/utils/tanggal.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { namaPerangkat } from '$lib/utils/perangkat.ts';

	let daftar = $state<PasskeyDto[]>([]);
	let memuat = $state(true);
	let sibuk = $state(false);
	const dukung = didukung();

	onMount(muat);

	async function muat() {
		memuat = true;
		try {
			daftar = (await daftarPasskey()).passkeys;
		} catch {
			daftar = [];
		} finally {
			memuat = false;
		}
	}

	async function tambah() {
		sibuk = true;
		try {
			await tambahPasskey(namaPerangkat());
			await muat();
			toast.show('Passkey terdaftar. Mulai sekarang, masuk butuh sandi dan passkey.');
		} catch (err) {
			const m = (err as Error).message;
			toast.bahaya(m.includes('NotAllowed') ? 'Pendaftaran dibatalkan' : m);
		} finally {
			sibuk = false;
		}
	}

	async function hapus(p: PasskeyDto) {
		const terakhir = daftar.length === 1;
		const pesan = terakhir
			? 'Ini passkey terakhir. Setelah dihapus, masuk cukup dengan sandi lagi. Lanjut?'
			: `Hapus passkey "${p.nickname}"?`;
		if (!confirm(pesan)) return;

		try {
			await hapusPasskey(p.id);
			await muat();
			toast.show('Passkey dihapus.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}
</script>

<Kertas padding="var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.pengaturan.kelolaPasskey}</h2>
		<p class="t-baca" style="max-width:62ch;color:var(--ink-soft)">
			Passkey dipakai sebagai faktor kedua, bukan pengganti sandi. Sandi tetap yang menurunkan kunci
			enkripsi — passkey memastikan orang yang tahu sandimu saja tidak bisa masuk.
		</p>

		{#if !dukung}
			<span class="t-data" style="color:var(--warn)">
				Browser ini tidak mendukung passkey.
			</span>
		{:else}
			{#if memuat}
				<span class="t-data t-data-ink">{i18n.t.umum.memuat}…</span>
			{:else if daftar.length === 0}
				<span class="t-data t-data-ink">Belum ada passkey terdaftar.</span>
			{:else}
				<div style="display:flex;flex-direction:column;gap:var(--s-2)">
					{#each daftar as p (p.id)}
						<div
							style="display:flex;align-items:center;gap:var(--s-4);flex-wrap:wrap;padding:var(--s-3) 0;border-bottom:1px solid rgb(27 27 23 / 0.12)"
						>
							<span
								style="font-family:var(--f-display);font-weight:600;font-size:var(--text-base);color:var(--ink);flex:1;min-width:140px"
								>{p.nickname ?? 'Passkey'}</span
							>
							<span class="t-data t-data-ink">
								dipakai {waktuRelatif(p.lastUsedAt, i18n.locale)}
							</span>
							<button type="button" class="tbl-bahaya" onclick={() => hapus(p)}>
								{i18n.t.app.hapus}
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<button type="button" class="tbl-garis" style="align-self:flex-start" disabled={sibuk} onclick={tambah}>
				{sibuk ? i18n.t.umum.memuat : 'Daftarkan passkey perangkat ini'}
			</button>

			{#if daftar.length > 0}
				<div class="pita-peringatan">
					Simpan 24 kata pemulihan di tempat aman. Kalau semua perangkat dengan passkey hilang,
					frasa itu satu-satunya jalan masuk.
				</div>
			{/if}
		{/if}
	</div>
</Kertas>
