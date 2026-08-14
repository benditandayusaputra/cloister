<script lang="ts">
	import { onMount } from 'svelte';
	import Kertas from '$components/dasar/Kertas.svelte';
	import {
		didukung,
		statusPush,
		berlangganan,
		berhentiBerlangganan,
		kirimUji,
		type StatusPush
	} from '$lib/pwa/push.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let status = $state<StatusPush | null>(null);
	let jam = $state(21);
	let sibuk = $state(false);
	const dukung = didukung();

	onMount(muat);

	async function muat() {
		try {
			status = await statusPush();
			jam = status.jam;
		} catch {
			status = null;
		}
	}

	async function nyalakan() {
		if (!status?.publicKey) return;
		sibuk = true;
		try {
			await berlangganan(status.publicKey, jam);
			await muat();
			toast.show('Pengingat aktif di perangkat ini.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	async function matikan() {
		sibuk = true;
		try {
			await berhentiBerlangganan();
			await muat();
			toast.show('Pengingat dimatikan.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
		}
	}

	async function uji() {
		try {
			const r = await kirimUji();
			toast.show(r.terkirim > 0 ? 'Notifikasi uji dikirim.' : 'Belum ada perangkat terdaftar.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}
</script>

<Kertas warna="biru" padding="var(--s-6)">
	<div style="display:flex;flex-direction:column;gap:var(--s-4)">
		<h2 class="t-judul t-lg" style="color:var(--ink)">Pengingat harian</h2>
		<p class="t-baca" style="max-width:62ch;color:var(--ink-soft)">
			Cloister bisa mengetuk sekali sehari kalau kamu belum menulis. Isi notifikasinya selalu ajakan
			generik — server memang tidak punya isi tulisanmu untuk dikirim.
		</p>

		{#if !dukung}
			<span class="t-data" style="color:var(--warn)">
				Browser ini tidak mendukung notifikasi push.
			</span>
		{:else if !status}
			<span class="t-data t-data-ink">{i18n.t.umum.memuat}…</span>
		{:else if !status.tersedia}
			<span class="t-data" style="color:var(--warn)">
				Kunci VAPID belum dipasang di server ini. Isi VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY.
			</span>
		{:else}
			<label class="label-medan" style="max-width:220px">
				<span class="t-data t-data-ink">Jam pengingat</span>
				<select bind:value={jam} class="isian isian-data" disabled={sibuk}>
					{#each Array.from({ length: 24 }, (_, h) => h) as h (h)}
						<option value={h}>{String(h).padStart(2, '0')}.00</option>
					{/each}
				</select>
			</label>

			<div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
				{#if status.aktif && status.jumlahPerangkat > 0}
					<button type="button" class="tbl-garis" disabled={sibuk} onclick={nyalakan}>
						Perbarui jam
					</button>
					<button type="button" class="tbl-garis" disabled={sibuk} onclick={uji}>
						Kirim notifikasi uji
					</button>
					<button type="button" class="tbl-bahaya" disabled={sibuk} onclick={matikan}>
						Matikan pengingat
					</button>
				{:else}
					<button type="button" class="tbl" disabled={sibuk} onclick={nyalakan}>
						Nyalakan pengingat
					</button>
				{/if}
			</div>

			{#if status.jumlahPerangkat > 0}
				<span class="t-data t-data-ink">
					Aktif di {status.jumlahPerangkat} perangkat.
				</span>
			{/if}
		{/if}
	</div>
</Kertas>
