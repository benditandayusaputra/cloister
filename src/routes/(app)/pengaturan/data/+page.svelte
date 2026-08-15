<script lang="ts">
	import { onMount } from 'svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import Medan from '$components/dasar/Medan.svelte';
	import JendelaSync from '$components/pengaturan/JendelaSync.svelte';
	import PulihkanArsip from '$components/pengaturan/PulihkanArsip.svelte';
	import { eksporSemua } from '$lib/data/ekspor.ts';
	import { imporFile } from '$lib/data/impor.ts';
	import { sisaKuota } from '$lib/pwa/daftar.ts';
	import { crypto } from '$crypto/client.ts';
	import { authApi, accountApi } from '$lib/api/endpoints.ts';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';
	import { sync } from '$lib/sync/mesin.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { ukuranManusia } from '$lib/lampiran/gambar.ts';

	let input = $state<HTMLInputElement | null>(null);
	let sibuk = $state(false);
	let ketikEmail = $state('');
	let sandiHapus = $state('');
	let kuota = $state<{ dipakai: number; kuota: number } | null>(null);

	onMount(async () => {
		kuota = await sisaKuota();
	});

	const bisaHapus = $derived(ketikEmail.trim().toLowerCase() === sesi.email.toLowerCase() && sandiHapus.length > 0);

	async function ekspor() {
		sibuk = true;
		try {
			const h = await eksporSemua();
			toast.show(`${h.entri} tulisan dan ${h.lampiran} lampiran diekspor ke ${h.nama}.`);
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	async function impor(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		sibuk = true;
		try {
			const h = await imporFile(file);
			await entri.segarkan();
			void sync.jalankan();
			toast.show(`${h.masuk} tulisan diimpor dari ${h.sumber}. ${h.dilewati} dilewati.`);
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
			if (input) input.value = '';
		}
	}

	async function hapusAkun() {
		if (!bisaHapus) return;
		if (!confirm('Akun akan dihapus permanen dalam 7 hari. Lanjut?')) return;
		const kdf = sesi.kdf();
		if (!kdf) return;
		try {
			const p = await authApi.params(sesi.email);
			const { authKey } = await crypto.derive(sandiHapus, p.saltUser, kdf);
			const res = await accountApi.remove(authKey);
			toast.show(`Akun dijadwalkan dihapus pada ${new Date(res.scheduledAt).toLocaleDateString()}.`);
			await sesi.keluar('/');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}
</script>

<svelte:head><title>Data · Cloister</title></svelte:head>

<Kertas padding="var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h1 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.pengaturan.data}</h1>
		<p class="t-baca" style="color:var(--ink-soft);max-width:62ch">
			{i18n.t.pengaturan.eksporPenjelasan}
		</p>

		<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
			<button type="button" class="tbl-garis" disabled={sibuk} onclick={ekspor}>
				{i18n.t.pengaturan.eksporSemua}
			</button>
			<input
				bind:this={input}
				type="file"
				accept=".zip,.json,.md,.txt"
				style="display:none"
				onchange={impor}
			/>
			<button type="button" class="tbl-garis" disabled={sibuk} onclick={() => input?.click()}>
				{i18n.t.pengaturan.imporFile}
			</button>
		</div>

		<span class="t-data t-data-ink">
			Impor mengenali: ekspor Cloister (.zip / .json), Day One JSON, Journey JSON, markdown biasa.
		</span>

		{#if kuota}
			<div
				style="display:flex;flex-direction:column;gap:6px;padding-top:var(--s-3);border-top:1px solid rgb(27 27 23 / 0.14)"
			>
				<span class="t-data t-data-ink">Penyimpanan perangkat ini</span>
				<span style="font-family:var(--f-data);font-size:var(--text-sm);color:var(--ink-soft)">
					{ukuranManusia(kuota.dipakai)} dipakai dari {ukuranManusia(kuota.kuota)}
				</span>
				{#if kuota.kuota - kuota.dipakai < 50 * 1024 * 1024}
					<span class="t-data" style="color:var(--warn)">
						Sisa kuota di bawah 50 MB. Ekspor dan bersihkan lampiran lama.
					</span>
				{/if}
			</div>
		{/if}
	</div>
</Kertas>

<PulihkanArsip />

<JendelaSync />

<Kertas warna="mawar" padding="var(--s-6)" kelas="kotak-bahaya">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg" style="color:var(--ink)">{i18n.t.pengaturan.hapusAkun}</h2>
		<p class="t-baca" style="max-width:62ch">{i18n.t.pengaturan.hapusPenjelasan}</p>

		<label class="label-medan" style="max-width:340px">
			<span class="t-data t-data-ink">{i18n.t.pengaturan.ketikEmailUntukHapus(sesi.email)}</span>
			<input
				type="text"
				bind:value={ketikEmail}
				class="isian isian-data {ketikEmail && !bisaHapus ? 'isian-salah' : ''}"
			/>
		</label>

		<div style="max-width:340px">
			<Medan label="Sandi untuk konfirmasi" bind:value={sandiHapus} type="password" mono autocomplete="current-password" />
		</div>

		<button
			type="button"
			class="tbl"
			style="align-self:flex-start;background:{bisaHapus ? 'var(--danger)' : 'var(--ink-faint)'}"
			disabled={!bisaHapus}
			onclick={hapusAkun}>{i18n.t.pengaturan.hapusAkun}</button
		>
	</div>
</Kertas>
