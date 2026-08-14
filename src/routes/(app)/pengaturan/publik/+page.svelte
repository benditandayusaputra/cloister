<script lang="ts">
	import { onMount } from 'svelte';
	import { publishApi, type PublicEntryDto } from '$lib/api/endpoints.ts';
	import { api } from '$lib/api/client.ts';
	import { entriesRepo } from '$lib/db/local/repo.ts';
	import { stempelTanggal } from '$lib/utils/tanggal.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { penyaring } from '$lib/state/penyaring.svelte.ts';

	interface TautanRahasia {
		id: string;
		entryId: string;
		label: string | null;
		viewCount: number;
		expiresAt: string | null;
		createdAt: string;
	}

	let daftar = $state<PublicEntryDto[]>([]);
	let tautan = $state<TautanRahasia[]>([]);
	let memuat = $state(true);

	async function muat() {
		memuat = true;
		try {
			daftar = (await publishApi.list()).entries;
			tautan = (await api<{ links: TautanRahasia[] }>('/api/share')).links;
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			memuat = false;
		}
	}

	onMount(() => {
		penyaring.muat();
		void muat();
	});

	function statusLabel(m: string) {
		if (m === 'pending') return i18n.t.publik.menungguTinjau;
		if (m === 'hidden' || m === 'removed') return i18n.t.publik.disembunyikan;
		return i18n.t.publik.sudahTerbit;
	}

	async function tarik(e: PublicEntryDto) {
		if (!confirm(`Tarik "${e.title}" dari halaman publik? Salinan di server dihapus permanen.`)) return;
		try {
			await publishApi.remove(e.id);
			if (e.sourceEntryId) {
				const lokal = await entriesRepo.get(e.sourceEntryId);
				if (lokal) await entriesRepo.save({ ...lokal, publicId: null }, false);
			}
			await muat();
			toast.show('Ditarik dari halaman publik.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}

	function urlPublik(e: PublicEntryDto) {
		return e.isAnonymous || !e.penName ? `/baca/entri/${e.id}` : `/baca/@${e.penName}/${e.slug}`;
	}

	async function cabutTautan(id: string) {
		if (!confirm('Cabut tautan rahasia ini? Yang sudah punya tautannya tidak bisa membuka lagi.'))
			return;
		try {
			await api<void>(`/api/share/${id}`, { method: 'DELETE' });
			await muat();
			toast.show('Tautan dicabut.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}
</script>

<svelte:head><title>Catatan publik · Cloister</title></svelte:head>

<div style="display:flex;flex-direction:column;gap:var(--s-4)">
	<div style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--s-4);flex-wrap:wrap">
		<h1 class="t-judul t-lg">{i18n.t.pengaturan.publik}</h1>
		<span class="t-data">{daftar.length} tulisan terbit</span>
	</div>

	<div class="kertas" style="padding:var(--s-5);display:flex;flex-direction:column;gap:12px">
		<span class="t-data t-data-ink">Penyaring Identitas</span>
		<p class="t-baca" style="font-size:0.9rem;color:var(--ink-soft);max-width:70ch">
			Sebelum sebuah catatan terbit, Cloister memindainya di perangkat ini dan menandai hal yang bisa
			mengarah ke orang tertentu. Lapis 1 mencari pola terstruktur seperti NIK, nomor HP, dan alamat.
			Lapis 2 mencoba mengenali nama orang, tempat, dan organisasi — lebih berguna, tapi juga lebih
			sering salah tebak. Lapis 1 tidak bisa dimatikan; lapis 2 bisa.
		</p>
		<label style="display:flex;align-items:flex-start;gap:11px;min-height:44px;cursor:pointer">
			<input
				type="checkbox"
				checked={penyaring.entitas}
				style="width:20px;height:20px;margin-top:3px;accent-color:#2B4F8E"
				onchange={(e) => penyaring.setEntitas(e.currentTarget.checked)}
			/>
			<span style="font-family:var(--f-read);font-size:var(--text-md);line-height:1.6;color:var(--ink)">
				Jalankan lapis 2 (pengenal nama orang, tempat, dan organisasi)
			</span>
		</label>
		<span style="font-family:var(--f-read);font-size:0.82rem;color:var(--ink-soft)">
			Keduanya berjalan sepenuhnya di perangkat ini. Tidak ada teks catatan yang dikirim ke mana pun
			saat memindai, dan tidak ada model yang diunduh.
		</span>
	</div>

	{#if memuat}
		<span class="t-data">{i18n.t.umum.memuat}…</span>
	{:else if daftar.length === 0}
		<div class="kertas" style="padding:var(--s-5)">
			<p class="t-baca" style="color:var(--ink-soft)">
				Belum ada catatan publik. Buka satu tulisan lalu pilih "{i18n.t.app.terbitkan}".
			</p>
		</div>
	{:else}
		<div style="display:flex;flex-direction:column;gap:var(--s-3)">
			{#each daftar as e (e.id)}
				<div
					class="kertas"
					style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--s-4);padding:var(--s-4) var(--s-5);opacity:{e.moderationState ===
					'ok'
						? 1
						: 0.65}"
				>
					<span class="t-data t-data-ink" style="min-width:82px"
						>{stempelTanggal(e.entryDate, i18n.locale)}</span
					>
					<a
						href={urlPublik(e)}
						style="font-family:var(--f-display);font-weight:600;font-size:var(--text-base);color:var(--ink);flex:1;min-width:180px;text-decoration:none"
						>{e.title}</a
					>
					<span class="t-data t-data-ink">{i18n.t.publik.dibacaKali(e.viewCount)}</span>
					<span
						class="t-data"
						style="color:{e.moderationState === 'ok' ? 'var(--ok)' : 'var(--warn)'}"
						>{statusLabel(e.moderationState)}</span
					>
					<button type="button" class="tbl-bahaya" onclick={() => tarik(e)}>
						{i18n.t.publik.tarik}
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<div style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--s-4);flex-wrap:wrap;padding-top:var(--s-4)">
		<h2 class="t-judul t-lg">Tautan rahasia</h2>
		<span class="t-data">{tautan.length} aktif</span>
	</div>

	<p class="t-data" style="max-width:62ch;line-height:1.7">
		Tautan rahasia tetap terenkripsi di server. Kuncinya ada di alamat tautan, jadi mencabutnya di
		sini benar-benar menutup akses.
	</p>

	{#if tautan.length === 0}
		<div class="kertas" style="padding:var(--s-5)">
			<p class="t-baca" style="color:var(--ink-soft)">Belum ada tautan rahasia.</p>
		</div>
	{:else}
		<div style="display:flex;flex-direction:column;gap:var(--s-3)">
			{#each tautan as t (t.id)}
				<div
					class="kertas kertas-buram"
					style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--s-4);padding:var(--s-4) var(--s-5)"
				>
					<span class="t-data t-data-ink" style="min-width:82px"
						>{new Date(t.createdAt).toLocaleDateString()}</span
					>
					<span
						style="font-family:var(--f-data);font-size:var(--text-xs);color:var(--ink);flex:1;min-width:180px;word-break:break-all"
						>/s/{t.id}</span
					>
					<span class="t-data t-data-ink">{t.viewCount} kali dibuka</span>
					{#if t.expiresAt}
						<span class="t-data t-data-ink"
							>berlaku sampai {new Date(t.expiresAt).toLocaleDateString()}</span
						>
					{/if}
					<button type="button" class="tbl-bahaya" onclick={() => cabutTautan(t.id)}>Cabut</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
